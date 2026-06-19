import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { HttpException } from "../exceptions/http-exception";

/**
 * Ensure upload directory exists
 */
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "profiles");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Disk storage config — saves to uploads/profiles/<timestamp>-<originalname>
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, uniqueName);
  },
});

/**
 * Only allow image MIME types
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new HttpException(400, "Only image files are allowed (jpeg, png, gif, webp)") as any, false);
  }
};

/**
 * Multer instance — 2 MB limit, single field "profileImage"
 */
export const uploadProfileImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
}).single("profileImage");
