import { Router } from "express";
import {
  createCheckoutSessionController,
  stripeWebhookController,
  getCheckoutSessionController,
  createPaymentIntentController,
  confirmBookingController,
} from "../controllers/payment.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { verifiedStudentMiddleware } from "../middlewares/verified-student.middleware";

const router = Router();

router.post(
  "/create-checkout-session",
  authorizedMiddleware,
  verifiedStudentMiddleware,
  createCheckoutSessionController
);

router.post("/webhook", stripeWebhookController);

router.get("/session/:sessionId", authorizedMiddleware, getCheckoutSessionController);

// flutter_stripe PaymentSheet endpoints
router.post(
  "/create-payment-intent",
  authorizedMiddleware,
  verifiedStudentMiddleware,
  createPaymentIntentController
);

router.post(
  "/confirm-booking",
  authorizedMiddleware,
  confirmBookingController
);

export default router;

