import mongoose, { Schema, Document } from "mongoose";

export type NotificationType = "booking" | "message" | "system" | "payment" | "course";

export interface INotificationDocument extends Document {
  userId: mongoose.Types.ObjectId;       // recipient (student)
  senderId?: mongoose.Types.ObjectId;    // who sent it (tutor), optional for system notifications
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  courseId?: string;                     // optional: linked course
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      enum: ["booking", "message", "system", "payment", "course"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    courseId: { type: String, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<INotificationDocument>(
  "Notification",
  notificationSchema
);
