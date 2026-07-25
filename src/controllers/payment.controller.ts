import { Request, Response, NextFunction } from "express";
import {
  createCheckoutSession,
  handleStripeWebhook,
  getCheckoutSessionDetails,
} from "../services/payment.service";

/**
 * CREATE STRIPE CHECKOUT SESSION
 * POST /api/payments/create-checkout-session
 * Protected: verified student only
 * Body: { tutorId, subject, day, time, duration?, notes?, courseId? }
 */
export const createCheckoutSessionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const studentId = req.user!._id.toString();
    const result = await createCheckoutSession(studentId, req.body);

    res.status(200).json({
      success: true,
      message: "Checkout session created",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * STRIPE WEBHOOK
 * POST /api/payments/webhook
 * Public (verified by Stripe signature) — raw body required
 */
export const stripeWebhookController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers["stripe-signature"] as string;
    if (!signature) {
      res.status(400).json({ success: false, message: "Missing stripe-signature header" });
      return;
    }

    // req.body is a raw Buffer here (set by rawBody middleware in app.ts)
    const result = await handleStripeWebhook(req.body as Buffer, signature);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET CHECKOUT SESSION DETAILS
 * GET /api/payments/session/:sessionId
 * Protected: authenticated user
 */
export const getCheckoutSessionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sessionId = req.params.sessionId as string;
    const result = await getCheckoutSessionDetails(sessionId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
