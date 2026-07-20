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
  cancelReason?: string
) => {
  const update: Record<string, any> = { status };
  if (cancelReason) update.cancelReason = cancelReason;

  return await BookingModel.findByIdAndUpdate(id, { $set: update }, { new: true });
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

