import { BookingModel } from "../models/booking.model";
import mongoose from "mongoose";

/**
 * DATABASE LAYER ONLY
 */

export const createBooking = async (data: {
  studentId: string;
  tutorId: string;
  subject: string;
  day: string;
  time: string;
  duration: string;
  price: number;
  notes?: string;
  courseId?: string;
}) => {
  const doc: any = {
    ...data,
    studentId: new mongoose.Types.ObjectId(data.studentId),
    tutorId: new mongoose.Types.ObjectId(data.tutorId),
  };
  if (data.courseId) doc.courseId = new mongoose.Types.ObjectId(data.courseId);
  return await BookingModel.create(doc);
};

export const findBookingById = async (id: string) => {
  return await BookingModel.findById(id)
    .populate("studentId", "fullName email profileImage")
    .populate("tutorId", "fullName email profileImage");
};

export const findBookingsByStudentId = async (studentId: string) => {
  return await BookingModel.find({
    studentId: new mongoose.Types.ObjectId(studentId),
  })
    .populate("tutorId", "fullName email profileImage")
    .sort({ createdAt: -1 });
};

export const findBookingsByTutorId = async (tutorId: string) => {
  return await BookingModel.find({
    tutorId: new mongoose.Types.ObjectId(tutorId),
  })
    .populate("studentId", "fullName email profileImage")
    .sort({ createdAt: -1 });
};

export const updateBookingStatus = async (
  id: string,
  status: string,
  cancelReason?: string,
  meetLink?: string,
  googleCalendarEventId?: string,
  paymentStatus?: string
) => {
  const update: Record<string, any> = { status };
  if (cancelReason) update.cancelReason = cancelReason;
  if (meetLink) update.meetLink = meetLink;
  if (googleCalendarEventId) update.googleCalendarEventId = googleCalendarEventId;
  if (paymentStatus) update.paymentStatus = paymentStatus;

  return await BookingModel.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after" });
};

const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function calculateSessionDate(createdAt: Date, dayStr: string, timeStr: string): Date {
  const DAY_MAP: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const targetDay = DAY_MAP[dayStr] ?? 1;
  const createdDay = createdAt.getDay();
  let daysDiff = targetDay - createdDay;
  if (daysDiff < 0) daysDiff += 7;

  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let hours = 9, minutes = 0;
  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
  }

  // If the target day is today, check if the time has already passed
  if (daysDiff === 0) {
    const createdTotalMinutes = createdAt.getHours() * 60 + createdAt.getMinutes();
    const targetTotalMinutes = hours * 60 + minutes;
    if (targetTotalMinutes < createdTotalMinutes) {
      // Time has passed, assume they meant next week
      daysDiff = 7;
    }
  }

  const sessionDate = new Date(createdAt);
  sessionDate.setDate(sessionDate.getDate() + daysDiff);
  sessionDate.setHours(hours, minutes, 0, 0);

  return sessionDate;
}

export function calculateSessionEndTime(createdAt: Date, dayStr: string, timeStr: string, durationStr: string = "60 min"): Date {
  const sessionDate = calculateSessionDate(createdAt, dayStr, timeStr);

  // expire exactly 2 hours AFTER the session start time (date day and time)
  sessionDate.setMinutes(sessionDate.getMinutes() + 120);

  return sessionDate;
}



/**
 * Find all unique students that have an accepted (upcoming/completed) booking with a tutor.
 * Used by tutors to know which students they can send notifications to.
 */
export const findStudentsByTutorId = async (tutorId: string) => {
  return await BookingModel.find({
    tutorId: new mongoose.Types.ObjectId(tutorId),
    status: { $in: ["upcoming", "completed"] },
  })
    .populate("studentId", "fullName email profileImage")
    .sort({ createdAt: -1 });
};

export const processStaleBookings = async () => {
  // Update pending bookings older than 24h to expired or cancelled
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await BookingModel.updateMany(
    { status: "pending", createdAt: { $lt: oneDayAgo } },
    { $set: { status: "cancelled", cancelReason: "Expired due to no payment" } }
  );
};

