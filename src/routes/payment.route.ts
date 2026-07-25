import { Router } from "express";
import {
  createCheckoutSessionController,
  stripeWebhookController,
  getCheckoutSessionController,
} from "../controllers/payment.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { verifiedStudentMiddleware } from "../middlewares/verified-student.middleware";

const router = Router();

/**
 * CREATE STRIPE CHECKOUT SESSION
 * POST /api/payments/create-checkout-session
 * Protected: verified student only
 * Body: { tutorId, subject, day, time, duration?, notes?, courseId? }
 */
router.post(
  "/create-checkout-session",
  authorizedMiddleware,
  verifiedStudentMiddleware,
  createCheckoutSessionController
);

/**
 * STRIPE WEBHOOK
 * POST /api/payments/webhook
 * Public — raw body parser applied in app.ts BEFORE express.json()
 * Stripe sends checkout.session.completed → creates booking in DB
 */
router.post("/webhook", stripeWebhookController);

/**
 * GET CHECKOUT SESSION DETAILS
 * GET /api/payments/session/:sessionId
 * Protected: authenticated user (used by success page)
 */
router.get("/session/:sessionId", authorizedMiddleware, getCheckoutSessionController);

export default router;
