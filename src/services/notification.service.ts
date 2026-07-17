import { HttpException } from "../exceptions/http-exception";
import {
  clearAllNotifications,
  createNotification,
  findNotificationsByUserId,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../repositories/notification.repository";
import { NotificationType } from "../models/notification.model";

export const getMyNotifications = async (userId: string) => {
  const notifications = await findNotificationsByUserId(userId);
  return notifications.map((n: any) => ({
    id: n._id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt,
  }));
};

export const notifyUser = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string
) => {
  return await createNotification({ userId, type, title, message });
};

export const readNotification = async (notificationId: string) => {
  const result = await markNotificationAsRead(notificationId);
  if (!result) throw new HttpException(404, "Notification not found");
  return result;
};

export const readAllNotifications = async (userId: string) => {
  await markAllNotificationsAsRead(userId);
  return { success: true };
};

export const clearNotifications = async (userId: string) => {
  await clearAllNotifications(userId);
  return { success: true };
};
