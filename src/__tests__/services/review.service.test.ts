import mongoose from "mongoose";
import { ReviewModel } from "../../models/review.model";
import { createReview, getReviewsByTutor, getReviewsByCourse } from "../../services/review.service";

jest.mock("../../models/review.model");

describe("Review Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error if rating is invalid", async () => {
    await expect(
      createReview("studentId", "tutorId", "tutor", 6, "Good")
    ).rejects.toThrow("Rating must be between 1 and 5");
  });

  it("should throw error if review already exists", async () => {
    (ReviewModel.findOne as jest.Mock).mockResolvedValue({ _id: "existing" });
    await expect(
      createReview("studentId", "tutorId", "tutor", 5, "Good")
    ).rejects.toThrow("You have already reviewed this.");
  });

  it("should cover course targetType logic", async () => {
    (ReviewModel.findOne as jest.Mock).mockResolvedValue(null);
    (ReviewModel.create as jest.Mock).mockResolvedValue({ _id: "new" });

    // This covers the targetType === 'course' and courseId logic branch
    await createReview("studentId", "tutorId", "course", 5, "Great", "courseId123");
    
    expect(ReviewModel.create).toHaveBeenCalledWith(expect.objectContaining({
      targetType: "course",
      courseId: "courseId123"
    }));
  });
});
