import { Router } from "express";
import {
  register,
  login,
  whoami,
  updateProfile,
} from "../controllers/user.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { uploadProfileImage } from "../middlewares/upload.middleware";

const router = Router();

/**
  REGISTER USER
  POST /api/users/register
 */
router.post("/register", register);

/**
  LOGIN USER
  POST /api/users/login
 */
router.post("/login", login);

/**
  WHO AM I — View logged-in user details
  GET /api/users/whoami
  Protected: Bearer token required
 */
router.get("/whoami", authorizedMiddleware, whoami);

/**
  UPDATE PROFILE — Update fullName, password, phoneNumber, or profileImage
  PATCH /api/users/update-profile
  Protected: Bearer token required
  Body (multipart/form-data): fullName?, phoneNumber?, password?, confirmPassword?
  File field: profileImage (optional, max 2 MB, images only)
 */
router.patch(
  "/update-profile",
  authorizedMiddleware,
  uploadProfileImage,
  updateProfile,
);

/**
 
  PATCH /api/users/profile-update
 */
router.patch(
  "/profile-update",
  authorizedMiddleware,
  uploadProfileImage,
  updateProfile,
);

export default router;
