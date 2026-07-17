import { HttpException } from "../exceptions/http-exception";
import {
  createEnrollment,
  findEnrollmentsByStudentId,
  updateEnrollmentTopic,
} from "../repositories/enrollment.repository";
import { findTutorProfileByUserId } from "../repositories/tutor.repository";

/**
 * AUTO-CREATE ENROLLMENT FROM A BOOKING
 * Called internally by booking.service when a tutor accepts a booking.
 * Topics are seeded from the tutor's course matching the booked subject.
 */
export const createEnrollmentFromBooking = async (booking: any) => {
  const tutorId = (booking.tutorId as any)?._id?.toString() ?? booking.tutorId.toString();

  // Fetch tutor profile to get course topics
  const tutorProfile = await findTutorProfileByUserId(tutorId);

  // Try to find a matching course for the booked subject
  let topics: { label: string; done: boolean }[] = [];
  if (tutorProfile && tutorProfile.courses.length > 0) {
    const matchedCourse = tutorProfile.courses.find(
      (c) =>
        c.title.toLowerCase().includes(booking.subject.toLowerCase()) ||
        booking.subject.toLowerCase().includes(c.level.toLowerCase())
    ) ?? tutorProfile.courses[0];

    topics = (matchedCourse?.modules ?? []).map((m: any) => ({
      label: typeof m === "string" ? m : m.title,
      done: false,
    }));
  }

  // Default topic if none found
  if (topics.length === 0) {
    topics = [{ label: `${booking.subject} Session 1`, done: false }];
  }

  const studentId = (booking.studentId as any)?._id?.toString() ?? booking.studentId.toString();

  await createEnrollment({
    studentId,
    tutorId,
    bookingId: booking._id.toString(),
    subject: booking.subject,
    totalSessions: 1,
    nextSession: `${booking.day} at ${booking.time}`,
    topics,
  });
};

/**
 * GET MY LEARNINGS
 * Returns all enrollments (learning records) for the logged-in student.
 */
export const getMyLearnings = async (userId: string) => {
  const enrollments = await findEnrollmentsByStudentId(userId);

  return enrollments.map((e: any) => {
    const tutor = e.tutorId;
    return {
      id: e._id,
      subject: e.subject,
      tutorName: tutor?.fullName || "Unknown Tutor",
      tutorImage: tutor?.profileImage || null,
      totalSessions: e.totalSessions,
      completedSessions: e.completedSessions,
      progress: e.progress,
      nextSession: e.nextSession,
      status: e.status,
      topics: e.topics,
    };
  });
};

/**
 * TOGGLE TOPIC DONE
 * Student can mark a topic as done/undone.
 */
export const toggleTopic = async (
  enrollmentId: string,
  topicIndex: number,
  done: boolean,
  studentId: string
) => {
  const enrollments = await findEnrollmentsByStudentId(studentId);
  const enrollment = enrollments.find((e: any) => e._id.toString() === enrollmentId);

  if (!enrollment) {
    throw new HttpException(404, "Enrollment not found");
  }

  const updated = await updateEnrollmentTopic(enrollmentId, topicIndex, done);
  if (!updated) throw new HttpException(500, "Failed to update topic");

  return {
    id: updated._id,
    subject: updated.subject,
    progress: updated.progress,
    status: updated.status,
    topics: updated.topics,
  };
};
