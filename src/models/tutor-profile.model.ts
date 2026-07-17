import mongoose, { Schema, Document } from "mongoose";

/**
 * Content item inside a course module
 */
export interface IModuleContent {
  type: "pdf" | "video" | "text" | "file";
  title: string;
  urlOrText: string;
}

/**
 * Course module within a tutor's course
 */
export interface ICourseModule {
  title: string;
  contents?: IModuleContent[];
}

/**
 * A single course offered by the tutor
 */
export interface ITutorCourse {
  _id?: mongoose.Types.ObjectId;
  title: string;
  level: string;
  price: number;
  modules: ICourseModule[];
}

/**
 * TutorProfile Document Interface
 * Stores everything a tutor sets up in their profile dashboard.
 */
export interface ITutorProfileDocument extends Document {
  userId: mongoose.Types.ObjectId;
  bio: string;
  institution: string;
  experience: string;
  location: string;
  languages: string[];
  subjects: string[];
  levels: string[];
  sessionTypes: string[];
  hourlyRate: number;
  availDays: string[];
  tags: string[];
  achievements: string[];
  courses: ITutorCourse[];
  averageRating: number;
  reviewCount: number;
}

const moduleContentSchema = new Schema<IModuleContent>({
  type: { type: String, enum: ["pdf", "video", "text", "file"], required: true },
  title: { type: String, required: true, trim: true },
  urlOrText: { type: String, required: true },
});

const courseModuleSchema = new Schema<ICourseModule>(
  { 
    title: { type: String, required: true, trim: true },
    contents: { type: [moduleContentSchema], default: [] }
  },
  { _id: false }
);

const tutorCourseSchema = new Schema<ITutorCourse>({
  title: { type: String, required: true, trim: true },
  level: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  modules: { type: [courseModuleSchema], default: [] },
});

const tutorProfileSchema = new Schema<ITutorProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    bio: { type: String, default: "", trim: true },
    institution: { type: String, default: "", trim: true },
    experience: { type: String, default: "" },
    location: { type: String, default: "", trim: true },
    languages: { type: [String], default: ["Nepali"] },
    subjects: { type: [String], default: [] },
    levels: { type: [String], default: [] },
    sessionTypes: { type: [String], default: [] },
    hourlyRate: { type: Number, default: 0, min: 0 },
    availDays: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    courses: { type: [tutorCourseSchema], default: [] },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const TutorProfileModel = mongoose.model<ITutorProfileDocument>(
  "TutorProfile",
  tutorProfileSchema
);
