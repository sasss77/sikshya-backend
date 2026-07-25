import { Request, Response, NextFunction } from "express";
import * as reviewService from "../services/review.service";

export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const studentId = req.user!._id.toString(); // from auth middleware
    const { tutorId, targetType, rating, reviewText, courseId } = req.body;

    const review = await reviewService.createReview(
      studentId,
      tutorId,
      targetType,
      rating,
      reviewText,
      courseId
    );

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const getTutorReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const limit = parseInt(req.query.limit as string) || 10;
    const reviews = await reviewService.getReviewsByTutor(id, limit);

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

export const getCourseReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const limit = parseInt(req.query.limit as string) || 10;
    const reviews = await reviewService.getReviewsByCourse(id, limit);

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};
