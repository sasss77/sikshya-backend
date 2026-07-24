import { Request, Response, NextFunction } from "express";
import { bookSession, getMyBookings, changeBookingStatus } from "../services/booking.service";
import { getMyLearnings, toggleTopic, addCourseToLearnings, getEnrollmentDetail, markModuleRead } from "../services/enrollment.service";

/**
 * CREATE BOOKING
 * POST /api/bookings
 * Protected: verified student only
 */
export const createBookingController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const studentId = req.user!._id.toString();
    const result = await bookSession(studentId, req.body);

    res.status(201).json({
      success: true,
      message: "Booking request sent successfully. Waiting for tutor confirmation.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET MY BOOKINGS
 * GET /api/bookings
 * Protected: any authenticated user (student or tutor)
 */
export const getBookingsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!._id.toString();
    const role = req.user!.role;
    const result = await getMyBookings(userId, role);

    res.status(200).json({
      success: true,
      message: "Bookings fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE BOOKING STATUS
 * PATCH /api/bookings/:id/status
 * Protected: tutor (accept/decline/complete) or student (cancel)
 */
export const updateBookingStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!._id.toString();
    const role = req.user!.role;
    const result = await changeBookingStatus(String(req.params.id), userId, role, req.body);

    res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET MY LEARNINGS
 * GET /api/bookings/learnings
 * Protected: student only
 */
export const getMyLearningsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!._id.toString();
    const result = await getMyLearnings(String(userId));

    res.status(200).json({
      success: true,
      message: "Learnings fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * TOGGLE TOPIC DONE
 * PATCH /api/bookings/learnings/:enrollmentId/topic
 * Body: { topicIndex: number, done: boolean }
 * Protected: student only
 */
export const toggleTopicController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const studentId = req.user!._id.toString();
    const { enrollmentId } = req.params;
    const { topicIndex, done } = req.body;

    if (typeof topicIndex !== "number" || typeof done !== "boolean") {
      res.status(400).json({ success: false, message: "topicIndex (number) and done (boolean) are required" });
      return;
    }

    const result = await toggleTopic(String(enrollmentId), topicIndex, done, studentId);

    res.status(200).json({
      success: true,
      message: "Topic updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
/**
 * ADD COURSE TO LEARNINGS
 * POST /api/bookings/enroll
 * Protected: student only
 * Body: { tutorId, courseId }
 */
export const addCourseController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const studentId = req.user!._id.toString();
    const { tutorId, courseId } = req.body;
    if (!tutorId || !courseId) {
      res.status(400).json({ success: false, message: "tutorId and courseId are required" });
      return;
    }
    const result = await addCourseToLearnings(studentId, tutorId, courseId);
    res.status(201).json({ success: true, message: "Course added to your learnings!", data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET ENROLLMENT DETAIL
 * GET /api/bookings/learnings/:enrollmentId
 * Protected: student only
 */
export const getEnrollmentDetailController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const studentId = req.user!._id.toString();
    const result = await getEnrollmentDetail(String(req.params.enrollmentId), studentId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * MARK MODULE AS READ
 * PATCH /api/bookings/learnings/:enrollmentId/module
 * Protected: student only
 * Body: { moduleTitle: string, totalModules: number }
 */
export const markModuleController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const studentId = req.user!._id.toString();
    const { enrollmentId } = req.params;
    const { moduleTitle, totalModules } = req.body;
    if (!moduleTitle || typeof totalModules !== "number") {
      res.status(400).json({ success: false, message: "moduleTitle and totalModules are required" });
      return;
    }
    const result = await markModuleRead(String(enrollmentId), moduleTitle, studentId, totalModules);
    res.status(200).json({ success: true, message: "Module updated", data: result });
  } catch (error) {
    next(error);
  }
};
