import { EnrollmentModel } from "../models/enrollment.model";
import mongoose from "mongoose";

/**
 * DATABASE LAYER ONLY
 */

export const createEnrollment = async (data: {
  studentId: string;
  tutorId: string;
  bookingId: string;
  subject: string;
  totalSessions: number;
  nextSession: string | null;
  topics: { label: string; done: boolean }[];
}) => {
  return await EnrollmentModel.create({
    ...data,
    studentId: new mongoose.Types.ObjectId(data.studentId),
    tutorId: new mongoose.Types.ObjectId(data.tutorId),
    bookingId: new mongoose.Types.ObjectId(data.bookingId),
  });
};

export const findEnrollmentsByStudentId = async (studentId: string) => {
  return await EnrollmentModel.find({
    studentId: new mongoose.Types.ObjectId(studentId),
  })
    .populate("tutorId", "fullName email profileImage")
    .sort({ createdAt: -1 });
};

export const findEnrollmentByBookingId = async (bookingId: string) => {
  return await EnrollmentModel.findOne({
    bookingId: new mongoose.Types.ObjectId(bookingId),
  });
};

export const updateEnrollmentTopic = async (
  enrollmentId: string,
  topicIndex: number,
  done: boolean
) => {
  const enrollment = await EnrollmentModel.findById(enrollmentId);
  if (!enrollment) return null;

  enrollment.topics[topicIndex].done = done;

  // Recalculate progress
  const doneTopics = enrollment.topics.filter((t) => t.done).length;
  enrollment.progress =
    enrollment.topics.length > 0
      ? Math.round((doneTopics / enrollment.topics.length) * 100)
      : 0;

  // Update status
  if (enrollment.progress === 100) enrollment.status = "completed";
  else if (enrollment.progress > 0) enrollment.status = "in_progress";
  else enrollment.status = "not_started";

  return await enrollment.save();
};

export const updateEnrollmentProgress = async (
  enrollmentId: string,
  completedSessions: number,
  nextSession: string | null
) => {
  return await EnrollmentModel.findByIdAndUpdate(
    enrollmentId,
    { $set: { completedSessions, nextSession } },
    { new: true }
  );
};
