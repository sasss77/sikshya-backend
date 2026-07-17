import { Request, Response, NextFunction } from "express";
import {
  getMyNotifications,
  readNotification,
  readAllNotifications,
  clearNotifications,
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
