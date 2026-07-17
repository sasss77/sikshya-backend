import { Router } from "express";
import {
  createBookingController,
  getBookingsController,
  updateBookingStatusController,
  getMyLearningsController,
  toggleTopicController,
} from "../controllers/booking.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { verifiedStudentMiddleware } from "../middlewares/verified-student.middleware";

const router = Router();

/**
 * CREATE BOOKING
 * POST /api/bookings
 * Protected: verified student only
 * Body: { tutorId, subject, day, time, duration?, notes? }
 */
router.post(
  "/",
  authorizedMiddleware,
  verifiedStudentMiddleware,
  createBookingController
);

/**
 * GET MY BOOKINGS
 * GET /api/bookings
 * Protected: any authenticated user (student sees their bookings; tutor sees their sessions)
 */
router.get("/", authorizedMiddleware, getBookingsController);

/**
 * GET MY LEARNINGS
 * GET /api/bookings/learnings
 * Protected: student only
 * IMPORTANT: register before /:id to avoid conflict
 */
router.get("/learnings", authorizedMiddleware, getMyLearningsController);

/**
 * TOGGLE TOPIC DONE
 * PATCH /api/bookings/learnings/:enrollmentId/topic
 * Protected: student only
 * Body: { topicIndex: number, done: boolean }
 */
router.patch(
  "/learnings/:enrollmentId/topic",
  authorizedMiddleware,
  toggleTopicController
);

/**
 * UPDATE BOOKING STATUS
 * PATCH /api/bookings/:id/status
 * Protected: tutor (accept/decline/complete) or student (cancel)
 * Body: { status, cancelReason? }
 */
router.patch("/:id/status", authorizedMiddleware, updateBookingStatusController);

export default router;
