import { CreateBookingSchema, UpdateBookingStatusSchema } from "../dtos/booking.dto";
import { HttpException } from "../exceptions/http-exception";
import {
  createBooking,
  findBookingById,
  findBookingsByStudentId,
  findBookingsByTutorId,
  updateBookingStatus,
  expireStaleBookings,
  completeStaleUpcomingSessions,
} from "../repositories/booking.repository";
import { findTutorProfileByUserId } from "../repositories/tutor.repository";
import { findUserById } from "../repositories/user.repository";
import { createEnrollmentFromBooking } from "./enrollment.service";
import { notifyUser } from "./notification.service";

/**
 * Helper to format a booking document into a clean response
 */
const formatBooking = (booking: any) => {
  const tutor = booking.tutorId;
  const student = booking.studentId;
  return {
    id: booking._id,
    studentId: student?._id || booking.studentId,
    tutorId: tutor?._id || booking.tutorId,
    studentName: student?.fullName || "Unknown",
    tutorName: tutor?.fullName || "Unknown",
    studentImage: student?.profileImage || null,
    tutorImage: tutor?.profileImage || null,
    subject: booking.subject,
    day: booking.day,
    time: booking.time,
    duration: booking.duration,
    price: booking.price,
    status: booking.status,
    notes: booking.notes,
    cancelReason: booking.cancelReason,
    createdAt: booking.createdAt,
    meetLink: booking.meetLink,
  };
};

/**
 * CREATE BOOKING
 * Student books a session with a tutor.
 * Guards: verified student only.
 */
export const bookSession = async (studentId: string, data: unknown) => {
  const validated = CreateBookingSchema.parse(data);

  // Ensure tutor exists and has a profile
  const tutor = await findUserById(validated.tutorId);
  if (!tutor || tutor.role !== "tutor") {
    throw new HttpException(404, "Tutor not found");
  }

  const tutorProfile = await findTutorProfileByUserId(validated.tutorId);
  if (!tutorProfile) {
    throw new HttpException(400, "This tutor has not set up their profile yet");
  }

  // Check tutor is available on the requested day
  if (!tutorProfile.availDays.includes(validated.day)) {
    throw new HttpException(
      400,
      `This tutor is not available on ${validated.day}. Available days: ${tutorProfile.availDays.join(", ")}`
    );
  }

  // Prevent student from booking their own profile (edge case)
  if (studentId === validated.tutorId) {
    throw new HttpException(400, "You cannot book yourself");
  }

  const booking = await createBooking({
    studentId,
    tutorId: validated.tutorId,
    subject: validated.subject,
    day: validated.day,
    time: validated.time,
    duration: validated.duration,
    price: tutorProfile.hourlyRate,
    notes: validated.notes,
    courseId: validated.courseId,
  });

  // Notify tutor
  const student = await findUserById(studentId);
  await notifyUser(
    validated.tutorId,
    "booking",
    "New Booking Request",
    `${student?.fullName || "A student"} has requested a ${validated.duration} session for ${validated.subject} on ${validated.day} at ${validated.time}.`
  );

  return formatBooking(booking);
};

/**
 * GET MY BOOKINGS
 * Returns bookings for the logged-in user (student or tutor).
 */
export const getMyBookings = async (userId: string, role: string) => {
  // Lazily expire stale pending bookings and auto-complete past upcoming sessions
  await expireStaleBookings();
  await completeStaleUpcomingSessions();

  const bookings =
    role === "tutor"
      ? await findBookingsByTutorId(userId)
      : await findBookingsByStudentId(userId);

  return bookings.map(formatBooking);
};

/**
 * UPDATE BOOKING STATUS
 * - Tutor can: accept (→ upcoming) or decline (→ cancelled)
 * - Student can: cancel (→ cancelled) while pending or upcoming
 * - Tutor can: mark completed (→ completed) while upcoming
 */
export const changeBookingStatus = async (
  bookingId: string,
  userId: string,
  role: string,
  data: unknown
) => {
  const { status, cancelReason } = UpdateBookingStatusSchema.parse(data);

  const booking = await findBookingById(bookingId);
  if (!booking) throw new HttpException(404, "Booking not found");

  const tutorId = (booking.tutorId as any)?._id?.toString() ?? booking.tutorId.toString();
  const studentId = (booking.studentId as any)?._id?.toString() ?? booking.studentId.toString();

  // Permission checks
  if (role === "tutor" && tutorId !== userId) {
    throw new HttpException(403, "You can only manage your own bookings");
  }
  if (role === "student" && studentId !== userId) {
    throw new HttpException(403, "You can only manage your own bookings");
  }

  // State machine guards
  if (booking.status === "completed" || booking.status === "cancelled") {
    throw new HttpException(400, `Cannot change status of a ${booking.status} booking`);
  }

  if (role === "student" && status !== "cancelled") {
    throw new HttpException(403, "Students can only cancel bookings");
  }

  if (role === "tutor" && status === "cancelled" && booking.status !== "pending") {
    throw new HttpException(400, "Tutors can only decline pending requests");
  }

  // Tutors can only set: upcoming (accept) or cancelled (decline) or completed
  if (role === "tutor" && status === "upcoming" && booking.status !== "pending") {
    throw new HttpException(400, "Can only accept pending bookings");
  }

  if (role === "tutor" && status === "completed" && booking.status !== "upcoming") {
    throw new HttpException(400, "Can only complete upcoming bookings");
  }

  let meetLink: string | undefined = undefined;
  if (status === "upcoming") {
    // Generate a simulated Google Meet link: e.g. abc-defg-hij
    const randomSegment = (len: number) => Math.random().toString(36).substring(2, 2 + len);
    meetLink = `https://meet.google.com/${randomSegment(3)}-${randomSegment(4)}-${randomSegment(3)}`;
  }

  const updated = await updateBookingStatus(bookingId, status, cancelReason, meetLink);

  // Auto-create enrollment when tutor accepts
  if (status === "upcoming") {
    await createEnrollmentFromBooking(booking);
    
    // Notify student that it was accepted
    await notifyUser(
      studentId,
      "booking",
      "Booking Accepted",
      `Your booking for ${booking.subject} on ${booking.day} at ${booking.time} has been accepted!`
    );
  } else if (status === "cancelled") {
    // Notify the other party about the cancellation
    const notifyId = role === "tutor" ? studentId : tutorId;
    const actor = role === "tutor" ? "tutor" : "student";
    await notifyUser(
      notifyId,
      "system",
      "Booking Cancelled",
      `Your booking for ${booking.subject} on ${booking.day} was cancelled by the ${actor}.`
    );
  } else if (status === "completed") {
    // Notify student that it was marked complete
    await notifyUser(
      studentId,
      "system",
      "Session Completed",
      `Your session for ${booking.subject} has been marked as completed.`
    );
  }

  return formatBooking(updated);
};
