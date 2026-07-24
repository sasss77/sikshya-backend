import { Router } from "express";
import {
  createReview,
  getTutorReviews,
  getCourseReviews,
} from "../controllers/review.controller";
import { authorizedMiddleware as requireAuth } from "../middlewares/authorized.middleware";

const router = Router();

// Create a review (requires auth)
router.post("/", requireAuth, createReview);

// Get reviews (public)
router.get("/tutor/:id", getTutorReviews);
router.get("/course/:id", getCourseReviews);

export default router;
