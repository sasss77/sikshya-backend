import { NotificationModel, NotificationType } from "../models/notification.model";
import mongoose from "mongoose";

export const createNotification = async (data: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}) => {
  return await NotificationModel.create({
    ...data,
    userId: new mongoose.Types.ObjectId(data.userId),
  });
};

export const findNotificationsByUserId = async (userId: string) => {
  return await NotificationModel.find({
    userId: new mongoose.Types.ObjectId(userId),
  }).sort({ createdAt: -1 });
};

export const markNotificationAsRead = async (notificationId: string) => {
  return await NotificationModel.findByIdAndUpdate(
    notificationId,
    { $set: { read: true } },
    { new: true }
  );
};

export const markAllNotificationsAsRead = async (userId: string) => {
  return await NotificationModel.updateMany(
    { userId: new mongoose.Types.ObjectId(userId), read: false },
    { $set: { read: true } }
  );
};

export const clearAllNotifications = async (userId: string) => {
  return await NotificationModel.deleteMany({
    userId: new mongoose.Types.ObjectId(userId),
  });
};

/**
 * Create a notification from a tutor to a specific student.
 */
export const createTutorNotification = async (data: {
  senderId: string;
  userId: string;   // recipient (student)
  title: string;
  message: string;
  courseId?: string;
}) => {
  return await NotificationModel.create({
    userId: new mongoose.Types.ObjectId(data.userId),
    senderId: new mongoose.Types.ObjectId(data.senderId),
    type: "course" as const,
    title: data.title,
    message: data.message,
    courseId: data.courseId || null,
    read: false,
  });
};

