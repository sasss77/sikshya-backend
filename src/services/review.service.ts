import { ReviewModel } from "../models/review.model";
import { TutorProfileModel } from "../models/tutor-profile.model";
import { HttpException } from "../exceptions/http-exception";
import mongoose from "mongoose";

export const createReview = async (
  studentId: string,
  tutorId: string,
  targetType: "tutor" | "course",
  rating: number,
  reviewText: string,
  courseId?: string
) => {
  if (rating < 1 || rating > 5) {
    throw new HttpException(400, "Rating must be between 1 and 5");
  }

  // Check if a review already exists
  const existingReview = await ReviewModel.findOne({
    studentId,
    tutorId,
    targetType,
    ...(targetType === "course" && courseId ? { courseId } : {}),
  });

  if (existingReview) {
    throw new HttpException(400, "You have already reviewed this.");
  }

  const review = await ReviewModel.create({
    studentId,
    tutorId,
    targetType,
    courseId: targetType === "course" ? courseId : undefined,
    rating,
    reviewText,
  });

  // Update average rating
  await updateAverageRating(tutorId, targetType, courseId);

  return review;
};

export const getReviewsByTutor = async (tutorId: string, limit = 10) => {
  return ReviewModel.find({ tutorId, targetType: "tutor" })
    .populate("studentId", "fullName profileImage")
    .sort({ createdAt: -1 })
    .limit(limit);
};

export const getReviewsByCourse = async (courseId: string, limit = 10) => {
  return ReviewModel.find({ courseId, targetType: "course" })
    .populate("studentId", "fullName profileImage")
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Helper function to recalculate and update the average rating
const updateAverageRating = async (tutorId: string, targetType: "tutor" | "course", courseId?: string) => {
  if (targetType === "tutor") {
    const stats = await ReviewModel.aggregate([
      { $match: { tutorId: new mongoose.Types.ObjectId(tutorId), targetType: "tutor" } },
      { $group: { _id: "$tutorId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } }
    ]);

    if (stats.length > 0) {
      await TutorProfileModel.findOneAndUpdate(
        { userId: tutorId },
        { 
          averageRating: Math.round(stats[0].avgRating * 10) / 10,
          reviewCount: stats[0].count 
        }
      );
    }
  } else if (targetType === "course" && courseId) {
    // Currently, course doesn't have an averageRating field in the schema, 
    // but we can add it or just rely on the tutor's overall rating if needed.
    // If you plan to update a specific course inside the tutor's profile:
    /*
    const stats = await ReviewModel.aggregate([
      { $match: { courseId: new mongoose.Types.ObjectId(courseId), targetType: "course" } },
      { $group: { _id: "$courseId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } }
    ]);
    if (stats.length > 0) {
      // Update specific course in array (requires more complex mongo query)
    }
    */
  }
};
