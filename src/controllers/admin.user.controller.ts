import { Request, Response, NextFunction } from "express";
import {
  getAllUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  deleteUserService,
  getAdminStatsService,
  sendAdminNotificationService,
  getAdminRequestsService,
  verifyAdminService,
  getAllCoursesService,
  getAdminCourseByIdService,
} from "../services/admin.user.service";

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || "";
    const role = req.query.role as string | undefined;

    const result = await getAllUsersService(page, limit, search, role);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await getUserByIdService(String(id));

    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await createUserService(req.body);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await updateUserService(String(id), req.body);

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await deleteUserService(String(id));

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getAdminStatsService();
    res.status(200).json({
      success: true,
      message: "Admin stats fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const sendAdminNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { audience, title, message } = req.body;
    await sendAdminNotificationService(audience, title, message);
    res.status(200).json({
      success: true,
      message: "Notifications sent successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getAdminRequestsService();
    res.status(200).json({
      success: true,
      message: "Admin requests fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await verifyAdminService(id);
    res.status(200).json({
      success: true,
      message: "Admin verified successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getAllCoursesService();
    res.status(200).json({
      success: true,
      message: "Courses fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminCourseById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await getAdminCourseByIdService(id);
    res.status(200).json({
      success: true,
      message: "Course fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
