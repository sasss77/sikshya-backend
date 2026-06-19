import { Request, Response, NextFunction } from "express";
import { registerUser, loginUser, getMyProfile, updateMyProfile } from "../services/user.service";

/**
  REGISTER CONTROLLER
  POST /api/users/register
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await registerUser(req.body);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
  LOGIN CONTROLLER
  POST /api/users/login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await loginUser(req.body);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
  WHOAMI CONTROLLER — View logged-in user details
  GET /api/users/whoami
 */
export const whoami = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!._id.toString();
    const result = await getMyProfile(userId);

    res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
  UPDATE PROFILE CONTROLLER
  PATCH /api/users/update-profile
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!._id.toString();

    // Build relative URL path for stored image (if uploaded via multer)
    const profileImagePath = req.file
      ? `/uploads/profiles/${req.file.filename}`
      : undefined;

    const result = await updateMyProfile(userId, req.body, profileImagePath);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};