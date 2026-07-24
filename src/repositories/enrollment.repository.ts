import { EnrollmentModel } from "../models/enrollment.model";
import { updateBookingStatus } from "./booking.repository";
import mongoose from "mongoose";

/**
 * DATABASE LAYER ONLY
 */

export const createEnrollment = async (data: {
  studentId: string;
  tutorId: string;
  bookingId?: string;
  courseId?: string;
  subject: string;
  totalSessions: number;
  nextSession: string | null;
  topics: { label: string; done: boolean }[];
}) => {
  const doc: any = {
    studentId: new mongoose.Types.ObjectId(data.studentId),
    tutorId: new mongoose.Types.ObjectId(data.tutorId),
    subject: data.subject,
    totalSessions: data.totalSessions,
    nextSession: data.nextSession,
    topics: data.topics,
  };
  if (data.bookingId) doc.bookingId = new mongoose.Types.ObjectId(data.bookingId);
  if (data.courseId) doc.courseId = new mongoose.Types.ObjectId(data.courseId);
  return await EnrollmentModel.create(doc);
};

export const findEnrollmentsByStudentId = async (studentId: string) => {
  return await EnrollmentModel.find({
    studentId: new mongoose.Types.ObjectId(studentId),
  })
    .populate("tutorId", "fullName email profileImage")
    .sort({ createdAt: -1 });
};

export const findEnrollmentById = async (enrollmentId: string) => {
  return await EnrollmentModel.findById(enrollmentId)
    .populate("tutorId", "fullName email profileImage");
};

export const findEnrollmentByCourse = async (studentId: string, courseId: string) => {
  return await EnrollmentModel.findOne({
    studentId: new mongoose.Types.ObjectId(studentId),
    courseId: new mongoose.Types.ObjectId(courseId),
  });
};

export const findEnrollmentByBookingId = async (bookingId: string) => {
  return await EnrollmentModel.findOne({
    bookingId: new mongoose.Types.ObjectId(bookingId),
  });
};

export const toggleModuleCompleted = async (
  enrollmentId: string,
  moduleTitle: string,
  totalModules: number
) => {
  const enrollment = await EnrollmentModel.findById(enrollmentId);
  if (!enrollment) return null;

  const idx = enrollment.completedModules.indexOf(moduleTitle);
  if (idx === -1) {
    enrollment.completedModules.push(moduleTitle);
  } else {
    enrollment.completedModules.splice(idx, 1);
  }

  // Recalculate progress based on completedModules
  const done = enrollment.completedModules.length;
  enrollment.progress = totalModules > 0 ? Math.round((done / totalModules) * 100) : 0;

  if (enrollment.progress === 100) {
    enrollment.status = "completed";
    if (enrollment.bookingId) {
      await updateBookingStatus(enrollment.bookingId.toString(), "completed");
    }
  } else if (enrollment.progress > 0) {
    enrollment.status = "in_progress";
  } else {
    enrollment.status = "not_started";
  }

  return await enrollment.save();
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
