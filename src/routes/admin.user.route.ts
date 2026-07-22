import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAdminStats,
  sendAdminNotification,
  getAdminRequests,
  verifyAdmin,
  getAllCourses,
  getAdminCourseById,
} from "../controllers/admin.user.controller";
import { authorizedMiddleware, adminMiddleware } from "../middlewares/authorized.middleware";

const router = Router();

router.use(authorizedMiddleware, adminMiddleware);

router.get("/requests", getAdminRequests);
router.patch("/:id/verify-admin", verifyAdmin);
router.post("/notifications/send", sendAdminNotification);
router.get("/courses", getAllCourses);
router.get("/courses/:id", getAdminCourseById);
router.get("/stats", getAdminStats);
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.patch("/:id", updateUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;

