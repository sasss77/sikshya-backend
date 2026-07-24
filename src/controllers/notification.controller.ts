import { Request, Response, NextFunction } from "express";
import {
  getMyNotifications,
  readNotification,
  readAllNotifications,
  clearNotifications,
  getMyStudents,
  sendTutorNotificationToStudent,
} from "../services/notification.service";

export const getNotificationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!._id.toString();
    const result = await getMyNotifications(userId);

    res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const markReadController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    await readNotification(String(id));

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    next(error);
  }
};

export const markAllReadController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!._id.toString();
    await readAllNotifications(userId);

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
};

export const clearAllController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!._id.toString();
    await clearNotifications(userId);

    res.status(200).json({
      success: true,
      message: "All notifications cleared",
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/notifications/my-students — tutor fetches their students */
export const getMyStudentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tutorId = req.user!._id.toString();
    const students = await getMyStudents(tutorId);
    res.status(200).json({ success: true, message: "Students fetched", data: students });
  } catch (error) {
    next(error);
  }
};

/** POST /api/notifications/send — tutor sends a notification to a student */
export const sendNotificationController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tutorId = req.user!._id.toString();
    const result = await sendTutorNotificationToStudent(tutorId, req.body);
    res.status(201).json({ success: true, message: "Notification sent", data: result });
  } catch (error) {
    next(error);
  }
};
