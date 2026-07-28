import { ReportModel } from "../models/report.model";

export const createReport = async (
  reporterId: string,
  reportedUserId: string,
  reason: string,
  details?: string
) => {
  const report = new ReportModel({
    reporterId,
    reportedUserId,
    reason,
    details,
  });
  return await report.save();
};

export const getReports = async (page: number = 1, limit: number = 20) => {
  const skip = (page - 1) * limit;
  const reports = await ReportModel.find()
    .populate("reporterId", "fullName email role")
    .populate("reportedUserId", "fullName email role")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await ReportModel.countDocuments();

  return { reports, total, page, totalPages: Math.ceil(total / limit) };
};

export const updateReportStatus = async (
  reportId: string,
  status: "pending" | "reviewed" | "resolved"
) => {
  return await ReportModel.findByIdAndUpdate(
    reportId,
    { status },
    { returnDocument: "after" }
  ).populate("reporterId", "fullName email").populate("reportedUserId", "fullName email");
};
