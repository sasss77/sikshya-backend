import mongoose, { Schema, Document } from "mongoose";
import { UserRole } from "../types/user.type";

/**
  User Document Interface
 */
export interface IUserDocument extends Document {
  fullName: string;
  email: string;
  role: UserRole;
  password: string;
  phoneNumber?: string;
  profileImage?: string;
  isVerifiedStudent: boolean;
  isVerifiedAdmin: boolean;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

//  schema

const userSchema = new Schema<IUserDocument>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["student", "tutor", "admin", "unassigned"],
      required: true,
    },

    password: {
      type: String,
      minlength: 8,
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: null,
    },

    profileImage: {
      type: String,
      default: null,
    },

    isVerifiedStudent: {
      type: Boolean,
      default: false,
    },

    isVerifiedAdmin: {
      type: Boolean,
      default: false,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  },
);

/**
  Export model
 */
export const UserModel = mongoose.model<IUserDocument>("User", userSchema);
