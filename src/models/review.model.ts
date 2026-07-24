import mongoose, { Schema, Document } from "mongoose";

export interface IReviewDocument extends Document {
  studentId: mongoose.Types.ObjectId;
  tutorId: mongoose.Types.ObjectId;
  targetType: "tutor" | "course";
  courseId?: mongoose.Types.ObjectId; // Only if targetType is 'course'
  rating: number; // 1-5
  reviewText: string;
}

const reviewSchema = new Schema<IReviewDocument>(
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
    targetType: {
      type: String,
      enum: ["tutor", "course"],
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      // No strict ref because courses are embedded inside tutor profiles currently,
      // but we can store the subdocument ID here.
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    reviewText: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// A student can only leave one review per target (tutor or specific course)
// If courseId is null (for tutor reviews), we still want it to be unique.
// Mongoose allows compound unique indexes.
reviewSchema.index({ studentId: 1, tutorId: 1, targetType: 1, courseId: 1 }, { unique: true });

export const ReviewModel = mongoose.model<IReviewDocument>(
  "Review",
  reviewSchema
);
