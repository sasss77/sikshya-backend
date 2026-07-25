import mongoose, { Schema, Document } from "mongoose";

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  reportedUserId: mongoose.Types.ObjectId;
  reason: string;
  details?: string;
  status: "pending" | "reviewed" | "resolved";
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reportedUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
    details: { type: String },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const ReportModel = mongoose.model<IReport>("Report", reportSchema);
