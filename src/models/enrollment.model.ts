import mongoose, { Schema, Document } from "mongoose";

export type EnrollmentStatus = "not_started" | "in_progress" | "completed";

/**
 * A single topic within an enrollment's curriculum
 */
export interface IEnrollmentTopic {
  label: string;
  done: boolean;
}

/**
 * Enrollment Document Interface
 * Auto-created when a tutor accepts a booking.
 * Tracks a student's learning progress for a specific subject/tutor pair.
 */
export interface IEnrollmentDocument extends Document {
  studentId: mongoose.Types.ObjectId;
  tutorId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  subject: string;
  totalSessions: number;
  completedSessions: number;
  progress: number; // 0–100
  nextSession: string | null; // human-readable e.g. "Jul 18, 10:00 AM"
  status: EnrollmentStatus;
  topics: IEnrollmentTopic[];
  courseId?: mongoose.Types.ObjectId;
  completedModules: string[];
}

const enrollmentTopicSchema = new Schema<IEnrollmentTopic>(
  {
    label: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const enrollmentSchema = new Schema<IEnrollmentDocument>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tutorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      // Optional, since a user can add a course without booking
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "TutorProfile.courses",
    },
    subject: { type: String, required: true, trim: true },
    totalSessions: { type: Number, default: 1, min: 0 },
    completedSessions: { type: Number, default: 0, min: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    nextSession: { type: String, default: null },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    topics: { type: [enrollmentTopicSchema], default: [] },
    completedModules: { type: [String], default: [] },
  },
  { timestamps: true }
);

enrollmentSchema.index({ studentId: 1 });
enrollmentSchema.index({ tutorId: 1 });

export const EnrollmentModel = mongoose.model<IEnrollmentDocument>(
  "Enrollment",
  enrollmentSchema
);
