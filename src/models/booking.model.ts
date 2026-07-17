import mongoose, { Schema, Document } from "mongoose";

export type BookingStatus = "pending" | "upcoming" | "completed" | "cancelled";

/**
 * Booking Document Interface
 * Created when a student books a session with a tutor.
 * Status flow: pending → upcoming → completed
 *                     ↘ cancelled
 */
export interface IBookingDocument extends Document {
  studentId: mongoose.Types.ObjectId;
  tutorId: mongoose.Types.ObjectId;
  subject: string;
  day: string;       // e.g. "Mon", "Fri"
  time: string;      // e.g. "10:00 AM"
  duration: string;  // e.g. "60 min"
  price: number;     // in NPR
  status: BookingStatus;
  notes?: string;
  cancelReason?: string;
}

const bookingSchema = new Schema<IBookingDocument>(
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
    subject: { type: String, required: true, trim: true },
    day: { type: String, required: true },
    time: { type: String, required: true },
    duration: { type: String, default: "60 min" },
    price: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "upcoming", "completed", "cancelled"],
      default: "pending",
    },
    notes: { type: String, trim: true },
    cancelReason: { type: String, trim: true },
  },
  { timestamps: true }
);

// Index for fast user-specific queries
bookingSchema.index({ studentId: 1, status: 1 });
bookingSchema.index({ tutorId: 1, status: 1 });

export const BookingModel = mongoose.model<IBookingDocument>(
  "Booking",
  bookingSchema
);
