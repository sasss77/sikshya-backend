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
  meetLink?: string
) => {
  const update: Record<string, any> = { status };
  if (cancelReason) update.cancelReason = cancelReason;
  if (meetLink) update.meetLink = meetLink;

  return await BookingModel.findByIdAndUpdate(id, { $set: update }, { new: true });
};

const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function calculateSessionEndTime(createdAt: Date, dayStr: string, timeStr: string, durationStr: string = "60 min"): Date {
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

  if (daysDiff === 0) {
    const createdTotalMinutes = createdAt.getHours() * 60 + createdAt.getMinutes();
    const targetTotalMinutes = hours * 60 + minutes;
    if (targetTotalMinutes < createdTotalMinutes) {
      daysDiff = 7;
    }
  }

  const sessionDate = new Date(createdAt);
  sessionDate.setDate(sessionDate.getDate() + daysDiff);
  sessionDate.setHours(hours, minutes, 0, 0);

  const durationMatch = durationStr.match(/\d+/);
  const durationMins = durationMatch ? parseInt(durationMatch[0], 10) : 60;
  
  // expire 1 hour AFTER the session ends
  sessionDate.setMinutes(sessionDate.getMinutes() + durationMins + 60);

  return sessionDate;
}

export const processStaleBookings = async () => {
  const activeBookings = await BookingModel.find({ status: { $in: ["pending", "upcoming"] } });
  const now = new Date();
  
  for (const booking of activeBookings) {
    const endTime = calculateSessionEndTime(booking.createdAt, booking.day, booking.time, booking.duration);
    console.log(`[Stale Check] Booking ${booking._id}: Created at ${booking.createdAt}, Target Day ${booking.day}, Target Time ${booking.time}`);
    console.log(`[Stale Check] Computed End Time: ${endTime.toISOString()}, Now: ${now.toISOString()}`);
    if (now > endTime) {
      console.log(`[Stale Check] Expiring booking ${booking._id} because it's past end time.`);
      // Both pending and upcoming that passed get marked as expired
      await BookingModel.updateOne({ _id: booking._id }, { $set: { status: "expired" } });
    }
  }
};

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

