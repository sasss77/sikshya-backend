import { Router } from "express";
import {
  createBookingController,
  getBookingsController,
  updateBookingStatusController,
  getMyLearningsController,
  toggleTopicController,
  addCourseController,
  getEnrollmentDetailController,
  markModuleController,
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
 * ADD COURSE TO LEARNINGS (Manual)
 * POST /api/bookings/enroll
 * Protected: verified student
 * Body: { tutorId, courseId }
 */
router.post("/enroll", authorizedMiddleware, verifiedStudentMiddleware, addCourseController);

/**
 * GET ENROLLMENT DETAIL (with full course content)
 * GET /api/bookings/learnings/:enrollmentId
 * Protected: student only
 */
router.get("/learnings/:enrollmentId", authorizedMiddleware, getEnrollmentDetailController);

/**
 * MARK MODULE AS READ/UNREAD
 * PATCH /api/bookings/learnings/:enrollmentId/module
 * Protected: student only
 * Body: { moduleTitle: string, totalModules: number }
 */
router.patch(
  "/learnings/:enrollmentId/module",
  authorizedMiddleware,
  markModuleController
);

/**
 * UPDATE BOOKING STATUS
 * PATCH /api/bookings/:id/status
 * Protected: tutor (accept/decline/complete) or student (cancel)
 * Body: { status, cancelReason? }
 */
router.patch("/:id/status", authorizedMiddleware, updateBookingStatusController);

export default router;
