import { Router } from "express";
import {
  getNotificationsController,
  markReadController,
  markAllReadController,
  clearAllController,
} from "../controllers/notification.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const router = Router();

// All notification routes are protected
router.use(authorizedMiddleware);

/**
 * GET MY NOTIFICATIONS
 * GET /api/notifications
 */
router.get("/", getNotificationsController);

/**
 * MARK ALL AS READ
 * PATCH /api/notifications/read-all
 * IMPORTANT: MUST be registered before /:id
 */
router.patch("/read-all", markAllReadController);

/**
 * CLEAR ALL NOTIFICATIONS
 * DELETE /api/notifications/clear-all
 * IMPORTANT: MUST be registered before /:id
 */
router.delete("/clear-all", clearAllController);

/**
 * MARK AS READ
 * PATCH /api/notifications/:id/read
 */
router.patch("/:id/read", markReadController);

export default router;
