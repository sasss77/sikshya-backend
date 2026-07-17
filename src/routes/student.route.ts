import { Router } from "express";
import {
  verifyStudentController,
  getStudentProfileController,
  getStudentDashboardController,
} from "../controllers/student.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const router = Router();

/**
 * VERIFY STUDENT
 * POST /api/students/verify
 * Body: { institution, gradeLevel, subjects (comma-sep string), bio }
 * Protected: Bearer token required
 */
router.post("/verify", authorizedMiddleware, verifyStudentController);

/**
 * GET STUDENT PROFILE
 * GET /api/students/profile
 * Protected: Bearer token required
 */
router.get("/profile", authorizedMiddleware, getStudentProfileController);

/**
 * GET STUDENT DASHBOARD
 * GET /api/students/dashboard
 * Protected: Bearer token required
 */
router.get("/dashboard", authorizedMiddleware, getStudentDashboardController);

export default router;
