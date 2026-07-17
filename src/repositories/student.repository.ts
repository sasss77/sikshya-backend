import { StudentProfileModel } from "../models/student-profile.model";
import mongoose from "mongoose";

/**
 * DATABASE LAYER ONLY — no business logic here
 */

export const createStudentProfile = async (data: {
  userId: string;
  institution: string;
  gradeLevel: "High School" | "Undergraduate" | "Postgraduate" | "Other";
  subjects: string[];
  bio: string;
}) => {
  return await StudentProfileModel.create({
    ...data,
    userId: new mongoose.Types.ObjectId(data.userId),
  });
};

export const findStudentProfileByUserId = async (userId: string) => {
  return await StudentProfileModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
  });
};
