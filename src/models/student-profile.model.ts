import mongoose, { Schema, Document } from "mongoose";

/**
 * StudentProfile Document Interface
 * Stores the academic verification details submitted by a student.
 */
export interface IStudentProfileDocument extends Document {
  userId: mongoose.Types.ObjectId;
  institution: string;
  gradeLevel: "High School" | "Undergraduate" | "Postgraduate" | "Other";
  subjects: string[];
  bio: string;
  verifiedAt: Date;
}

const studentProfileSchema = new Schema<IStudentProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one profile per student
    },

    institution: {
      type: String,
      required: true,
      trim: true,
    },

    gradeLevel: {
      type: String,
      enum: ["High School", "Undergraduate", "Postgraduate", "Other"],
      required: true,
    },

    subjects: {
      type: [String],
      required: true,
    },

    bio: {
      type: String,
      required: true,
      trim: true,
    },

    verifiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Export model
 */
export const StudentProfileModel = mongoose.model<IStudentProfileDocument>(
  "StudentProfile",
  studentProfileSchema
);
