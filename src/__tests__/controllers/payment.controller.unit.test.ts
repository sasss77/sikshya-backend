import { Request, Response, NextFunction } from "express";
import {
  createCheckoutSessionController,
  stripeWebhookController,
  getCheckoutSessionController,
  createPaymentIntentController,
  confirmBookingController,
} from "../../controllers/payment.controller";
import * as paymentService from "../../services/payment.service";

jest.mock("../../services/payment.service");

describe("Payment Controller Unit Tests", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { _id: "student123", role: "student" } as any,
      body: {},
      params: {},
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe("createCheckoutSessionController", () => {
    it("should return checkout session data successfully", async () => {
      req.body = { tutorId: "tutor123", subject: "Math", day: "Mon", time: "10:00 AM" };
      (paymentService.createCheckoutSession as jest.Mock).mockResolvedValue({ url: "https://stripe.com/checkout" });

      await createCheckoutSessionController(req as Request, res as Response, next);

      expect(paymentService.createCheckoutSession).toHaveBeenCalledWith("student123", req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { url: "https://stripe.com/checkout" } })
      );
    });

    it("should handle error", async () => {
      const err = new Error("Test error");
      (paymentService.createCheckoutSession as jest.Mock).mockRejectedValue(err);
      await createCheckoutSessionController(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("stripeWebhookController", () => {
    it("should return 400 if signature is missing", async () => {
      req.headers = {};
      await stripeWebhookController(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it("should handle webhook and return result", async () => {
      req.headers = { "stripe-signature": "sig123" };
      req.body = Buffer.from("test");
      (paymentService.handleStripeWebhook as jest.Mock).mockResolvedValue({ received: true });

      await stripeWebhookController(req as Request, res as Response, next);

      expect(paymentService.handleStripeWebhook).toHaveBeenCalledWith(req.body, "sig123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it("should pass error to next", async () => {
      req.headers = { "stripe-signature": "sig123" };
      req.body = Buffer.from("test");
      const err = new Error("Webhook Error");
      (paymentService.handleStripeWebhook as jest.Mock).mockRejectedValue(err);

      await stripeWebhookController(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("getCheckoutSessionController", () => {
    it("should get session details", async () => {
      req.params = { sessionId: "sess123" };
      (paymentService.getCheckoutSessionDetails as jest.Mock).mockResolvedValue({ status: "complete" });

      await getCheckoutSessionController(req as Request, res as Response, next);

      expect(paymentService.getCheckoutSessionDetails).toHaveBeenCalledWith("sess123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { status: "complete" } }));
    });

    it("should handle error", async () => {
      const err = new Error("Not found");
      (paymentService.getCheckoutSessionDetails as jest.Mock).mockRejectedValue(err);
      await getCheckoutSessionController(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("createPaymentIntentController", () => {
    it("should create payment intent", async () => {
      req.body = { amount: 1000 };
      (paymentService.createPaymentIntent as jest.Mock).mockResolvedValue({ clientSecret: "secret" });

      await createPaymentIntentController(req as Request, res as Response, next);

      expect(paymentService.createPaymentIntent).toHaveBeenCalledWith("student123", req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { clientSecret: "secret" } }));
    });

    it("should pass error to next", async () => {
      const err = new Error("Failed");
      (paymentService.createPaymentIntent as jest.Mock).mockRejectedValue(err);
      await createPaymentIntentController(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("confirmBookingController", () => {
    it("should return 400 if paymentIntentId is missing", async () => {
      req.body = {};
      await confirmBookingController(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it("should confirm booking and return success", async () => {
      req.body = { paymentIntentId: "pi_123" };
      (paymentService.confirmBookingAfterPayment as jest.Mock).mockResolvedValue({ bookingId: "b1" });

      await confirmBookingController(req as Request, res as Response, next);

      expect(paymentService.confirmBookingAfterPayment).toHaveBeenCalledWith("student123", "pi_123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { bookingId: "b1" } }));
    });

    it("should pass error to next", async () => {
      req.body = { paymentIntentId: "pi_123" };
      const err = new Error("Not paid");
      (paymentService.confirmBookingAfterPayment as jest.Mock).mockRejectedValue(err);
      await confirmBookingController(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
