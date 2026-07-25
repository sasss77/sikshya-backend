import { Request, Response, NextFunction } from "express";
import * as reportService from "../services/report.service";

export const createReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const reporterId = req.user!._id.toString();
    const { reportedUserId, reason, details } = req.body;

    if (!reportedUserId || !reason) {
       return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const report = await reportService.createReport(
      reporterId,
      reportedUserId,
      reason,
      details
    );

    res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const getReports = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await reportService.getReports(page, limit);

    res.status(200).json({
      success: true,
      data: result.reports,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateReportStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "reviewed", "resolved"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const report = await reportService.updateReportStatus(id, status);

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    res.status(200).json({
      success: true,
      message: "Report status updated",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};
