import mongoose, { Schema, Document } from "mongoose";

export type BookingStatus = "pending" | "upcoming" | "completed" | "cancelled" | "expired";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

/**
 * Booking Document Interface
 * Created when a student books a session with a tutor.
 * Status flow: pending → upcoming → completed
 *                     ↘ cancelled / expired
 * Payment flow: unpaid → paid (on Stripe checkout.session.completed)
 *                     → refunded (if tutor declines and refund is issued)
 */
export interface IBookingDocument extends Document {
  studentId: mongoose.Types.ObjectId;
  tutorId: mongoose.Types.ObjectId;
  subject: string;
  day: string;       // e.g. "Mon", "Fri"
  time: string;      // e.g. "10:00 AM"
  duration: string;  // e.g. "60 min"
  price: number;     // in NPR
  priceUSD: number;  // converted USD amount charged via Stripe
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  notes?: string;
  cancelReason?: string;
  courseId?: mongoose.Types.ObjectId;
  meetLink?: string;
  googleCalendarEventId?: string;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
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
    priceUSD: { type: Number, required: true, min: 0, default: 0 },
    status: {
      type: String,
      enum: ["pending", "upcoming", "completed", "cancelled", "expired"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    stripePaymentIntentId: { type: String, trim: true },
    stripeCheckoutSessionId: { type: String, trim: true },
    notes: { type: String, trim: true },
    cancelReason: { type: String, trim: true },
    googleCalendarEventId: { type: String, trim: true },
    rating: { type: Number, min: 1, max: 5 },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "TutorProfile.courses",
    },
    meetLink: { type: String, trim: true },
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
