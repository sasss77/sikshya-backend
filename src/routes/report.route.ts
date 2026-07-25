import { Router } from "express";
import {
  createReport,
  getReports,
  updateReportStatus,
} from "../controllers/report.controller";
import { authorizedMiddleware as requireAuth } from "../middlewares/authorized.middleware";

const router = Router();

// Create a report (requires auth)
router.post("/", requireAuth, createReport);

// Get all reports (admin only)
router.get("/admin", requireAuth, getReports);

// Update report status (admin only)
router.patch("/admin/:id", requireAuth, updateReportStatus);

export default router;
