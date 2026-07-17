import { Request, Response, NextFunction } from "express";
import { verifyStudent, getStudentProfile, getStudentDashboard } from "../services/student.service";

/**
 * VERIFY STUDENT CONTROLLER
 * POST /api/students/verify
 * Protected: Bearer token required (student role only)
 */
export const verifyStudentController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!._id.toString();
    const result = await verifyStudent(userId, req.body);

    res.status(200).json({
      success: true,
      message: "Student verified successfully. You can now book tutors!",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET STUDENT PROFILE CONTROLLER
 * GET /api/students/profile
 * Protected: Bearer token required
 */
export const getStudentProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!._id.toString();
    const result = await getStudentProfile(userId);

    res.status(200).json({
      success: true,
      message: "Student profile fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET STUDENT DASHBOARD CONTROLLER
 * GET /api/students/dashboard
 * Protected: Bearer token required
 */
export const getStudentDashboardController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!._id.toString();
    const result = await getStudentDashboard(userId);

    res.status(200).json({
      success: true,
      message: "Student dashboard fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
