import {
  createCheckoutSession,
  createPaymentIntent,
  confirmBookingAfterPayment,
  getCheckoutSessionDetails,
  handleStripeWebhook,
  convertNPRtoUSD,
} from "../../services/payment.service";
import Stripe from "stripe";
import { BookingModel } from "../../models/booking.model";
import { findUserById } from "../../repositories/user.repository";
import { findTutorProfileByUserId } from "../../repositories/tutor.repository";
import { createEnrollmentFromBooking } from "../../services/enrollment.service";
import { notifyUser } from "../../services/notification.service";
import { HttpException } from "../../exceptions/http-exception";
import mongoose from "mongoose";

// Mock dependencies

jest.mock("stripe", () => {
  const mStripe = {
    ephemeralKeys: {
      create: jest.fn().mockResolvedValue({ secret: "ek_123" }),
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ client_secret: "secret_123", id: "pi_123" }),
      retrieve: jest.fn().mockResolvedValue({ status: "succeeded", metadata: {} }),
    },
    customers: {
      list: jest.fn().mockResolvedValue({ data: [] }),
      create: jest.fn().mockResolvedValue({ id: "cus_123" }),
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ url: "http://stripe.com/checkout/123", id: "sess_123" }),
        retrieve: jest.fn().mockResolvedValue({ id: "sess_123", payment_status: "paid", metadata: {} }),
      },
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({ type: "checkout.session.completed", data: { object: { metadata: {} } } }),
    },
  };
  return jest.fn().mockImplementation(() => mStripe);
});

let mockStripeInstance: any;


jest.mock("../../models/booking.model");
jest.mock("../../repositories/user.repository");
jest.mock("../../repositories/tutor.repository");
jest.mock("../../services/enrollment.service");
jest.mock("../../services/notification.service");

describe("Payment Service", () => {
  const mockStudentId = new mongoose.Types.ObjectId().toString();
  const mockTutorId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    const Stripe = require("stripe");
    mockStripeInstance = new Stripe();
  });

  describe("convertNPRtoUSD", () => {
    it("should convert correctly", () => {
      expect(convertNPRtoUSD(134)).toBe(1);
    });
  });

  describe("createCheckoutSession", () => {
    it("should throw if tutor not found", async () => {
      (findUserById as jest.Mock).mockResolvedValue(null);
      await expect(
        createCheckoutSession(mockStudentId, { tutorId: mockTutorId, subject: "Math", day: "Monday", time: "10:00" })
      ).rejects.toThrow(HttpException);
    });

    it("should throw if booking oneself", async () => {
      (findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (findTutorProfileByUserId as jest.Mock).mockResolvedValue({ availDays: ["Monday"] });
      
      await expect(
        createCheckoutSession(mockStudentId, { tutorId: mockStudentId, subject: "Math", day: "Monday", time: "10:00" })
      ).rejects.toThrow(HttpException);
    });

    it("should return a checkout url on success", async () => {
      (findUserById as jest.Mock).mockResolvedValue({ _id: mockTutorId, role: "tutor", name: "John" });
      (findTutorProfileByUserId as jest.Mock).mockResolvedValue({ availDays: ["Monday"], hourlyRate: 1000 });
      (BookingModel.create as jest.Mock).mockResolvedValue({ _id: "booking_123" });

      const res = await createCheckoutSession(mockStudentId, {
        tutorId: mockTutorId,
        subject: "Math",
        day: "Monday",
        time: "10:00",
      });

      expect(res).toEqual({ url: "http://stripe.com/checkout/123", sessionId: "sess_123" });
    });
  });

  describe("createPaymentIntent", () => {
    it("should throw if tutor not found", async () => {
      (findUserById as jest.Mock).mockResolvedValue(null);
      await expect(
        createPaymentIntent(mockStudentId, { tutorId: mockTutorId, subject: "Math", day: "Monday", time: "10:00" })
      ).rejects.toThrow(HttpException);
    });

    it("should return a client secret on success", async () => {
      (findUserById as jest.Mock).mockResolvedValue({ _id: mockTutorId, role: "tutor" });
      (findTutorProfileByUserId as jest.Mock).mockResolvedValue({ availDays: ["Monday"], hourlyRate: 1000 });
      (BookingModel.create as jest.Mock).mockResolvedValue({ _id: "booking_123" });

      const res = await createPaymentIntent(mockStudentId, {
        tutorId: mockTutorId,
        subject: "Math",
        day: "Monday",
        time: "10:00",
      });
      expect(res.clientSecret).toBe("secret_123");
      expect(res.paymentIntentId).toBe("pi_123");
    });
  });

  describe("confirmBookingAfterPayment", () => {
    it("should throw if payment not succeeded", async () => {
      const Stripe = require("stripe");
      const stripeInstance = new Stripe();
      stripeInstance.paymentIntents.retrieve.mockResolvedValueOnce({ status: "requires_payment_method" });
      await expect(confirmBookingAfterPayment(mockStudentId, "fakeId")).rejects.toThrow(HttpException);
    });

    it("should update booking status and notify if successful", async () => {
      const Stripe = require("stripe");
      const stripeInstance = new Stripe();
      stripeInstance.paymentIntents.retrieve.mockResolvedValueOnce({ 
        status: "succeeded", 
        metadata: { studentId: mockStudentId, tutorId: mockTutorId, priceUSD: "10" } 
      });
      (BookingModel.findOne as jest.Mock).mockResolvedValue(null);
      (BookingModel.create as jest.Mock).mockResolvedValue({
        _id: "fakeId",
      });

      const result = await confirmBookingAfterPayment(mockStudentId, "fakeId");

      expect(BookingModel.create).toHaveBeenCalled();
      expect(notifyUser).toHaveBeenCalled();
      expect(result.bookingId).toBe("fakeId");
    });
  });

  describe("getCheckoutSessionDetails", () => {
    it("should return session details", async () => {
      (BookingModel.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({ _id: "fakeId", tutorId: { fullName: "Test Tutor" }, studentId: { fullName: "Test Student" } })
        })
      });
      const session = await getCheckoutSessionDetails("sess_123");
      expect(session.paymentStatus).toBe("paid");
    });
  });

  describe("handleStripeWebhook", () => {
    let rawBody: Buffer;
    let signature: string;
    
    beforeEach(() => {
      rawBody = Buffer.from("test");
      signature = "sig_123";
    });

    it("should throw 400 on signature verification failure", async () => {
      mockStripeInstance.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error("Invalid signature");
      });
      await expect(handleStripeWebhook(rawBody, signature)).rejects.toThrow(HttpException);
    });

    it("should handle checkout.session.completed", async () => {
      mockStripeInstance.webhooks.constructEvent.mockReturnValueOnce({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "sess_123_webhook",
            metadata: { 
              studentId: "studentId",
              tutorId: "tutorId",
              subject: "Math",
              day: "Monday",
              time: "10:00",
              duration: "60 mins",
              priceNPR: "1340",
              priceUSD: "10"
            },
          },
        },
      });

      (BookingModel.findOne as jest.Mock).mockResolvedValue(null);
      (BookingModel.create as jest.Mock).mockResolvedValue({ _id: "new_booking_123" });

      const result = await handleStripeWebhook(rawBody, signature);
      expect(BookingModel.create).toHaveBeenCalled();
      expect(notifyUser).toHaveBeenCalled();
      expect(result).toEqual({ received: true });
    });
  });
});
