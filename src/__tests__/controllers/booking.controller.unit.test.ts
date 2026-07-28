import { Request, Response, NextFunction } from "express";
import {
  createBookingController,
  getBookingsController,
  updateBookingStatusController,
  getMyLearningsController,
  toggleTopicController,
  addCourseController,
  getEnrollmentDetailController,
  markModuleController,
} from "../../controllers/booking.controller";
import * as bookingService from "../../services/booking.service";
import * as enrollmentService from "../../services/enrollment.service";

jest.mock("../../services/booking.service");
jest.mock("../../services/enrollment.service");

describe("Booking Controller Unit Tests", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { _id: "user123", role: "student" } as any,
      body: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe("createBookingController", () => {
    it("should create booking successfully", async () => {
      req.body = { tutorId: "tutor1" };
      (bookingService.bookSession as jest.Mock).mockResolvedValue({ id: "booking1" });

      await createBookingController(req as Request, res as Response, next);

      expect(bookingService.bookSession).toHaveBeenCalledWith("user123", req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("should pass error to next", async () => {
      const err = new Error("Failed");
      (bookingService.bookSession as jest.Mock).mockRejectedValue(err);
      await createBookingController(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("getBookingsController", () => {
    it("should get bookings", async () => {
      (bookingService.getMyBookings as jest.Mock).mockResolvedValue([{ id: "b1" }]);
      await getBookingsController(req as Request, res as Response, next);
      expect(bookingService.getMyBookings).toHaveBeenCalledWith("user123", "student");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("should pass error to next", async () => {
      const err = new Error("Failed");
      (bookingService.getMyBookings as jest.Mock).mockRejectedValue(err);
      await getBookingsController(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("updateBookingStatusController", () => {
    it("should update booking status", async () => {
      req.params = { id: "b1" };
      req.body = { status: "cancelled" };
      (bookingService.changeBookingStatus as jest.Mock).mockResolvedValue({ status: "cancelled" });

      await updateBookingStatusController(req as Request, res as Response, next);

      expect(bookingService.changeBookingStatus).toHaveBeenCalledWith("b1", "user123", "student", req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("should pass error to next", async () => {
      req.params = { id: "b1" };
      const err = new Error("Failed");
      (bookingService.changeBookingStatus as jest.Mock).mockRejectedValue(err);
      await updateBookingStatusController(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("getMyLearningsController", () => {
    it("should get learnings", async () => {
      (enrollmentService.getMyLearnings as jest.Mock).mockResolvedValue([{ id: "e1" }]);
      await getMyLearningsController(req as Request, res as Response, next);
      expect(enrollmentService.getMyLearnings).toHaveBeenCalledWith("user123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("should handle error", async () => {
      const err = new Error("Failed");
      (enrollmentService.getMyLearnings as jest.Mock).mockRejectedValue(err);
      await getMyLearningsController(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("toggleTopicController", () => {
    it("should return 400 if topicIndex or done is missing/invalid", async () => {
      req.body = { topicIndex: "not a number", done: "not a boolean" };
      await toggleTopicController(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it("should toggle topic", async () => {
      req.params = { enrollmentId: "e1" };
      req.body = { topicIndex: 1, done: true };
      (enrollmentService.toggleTopic as jest.Mock).mockResolvedValue({ updated: true });

      await toggleTopicController(req as Request, res as Response, next);

      expect(enrollmentService.toggleTopic).toHaveBeenCalledWith("e1", 1, true, "user123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("should handle error", async () => {
      req.params = { enrollmentId: "e1" };
      req.body = { topicIndex: 1, done: true };
      const err = new Error("Failed");
      (enrollmentService.toggleTopic as jest.Mock).mockRejectedValue(err);
      await toggleTopicController(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("addCourseController", () => {
    it("should return 400 if missing fields", async () => {
      req.body = {};
      await addCourseController(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should add course", async () => {
      req.body = { tutorId: "t1", courseId: "c1" };
      (enrollmentService.addCourseToLearnings as jest.Mock).mockResolvedValue({ id: "e1" });
      await addCourseController(req as Request, res as Response, next);
      expect(enrollmentService.addCourseToLearnings).toHaveBeenCalledWith("user123", "t1", "c1");
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should handle error", async () => {
      req.body = { tutorId: "t1", courseId: "c1" };
      const err = new Error("Failed");
      (enrollmentService.addCourseToLearnings as jest.Mock).mockRejectedValue(err);
      await addCourseController(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("getEnrollmentDetailController", () => {
    it("should get enrollment detail", async () => {
      req.params = { enrollmentId: "e1" };
      (enrollmentService.getEnrollmentDetail as jest.Mock).mockResolvedValue({ id: "e1" });
      await getEnrollmentDetailController(req as Request, res as Response, next);
      expect(enrollmentService.getEnrollmentDetail).toHaveBeenCalledWith("e1", "user123");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle error", async () => {
      req.params = { enrollmentId: "e1" };
      const err = new Error("Failed");
      (enrollmentService.getEnrollmentDetail as jest.Mock).mockRejectedValue(err);
      await getEnrollmentDetailController(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("markModuleController", () => {
    it("should return 400 if fields missing", async () => {
      req.body = {};
      await markModuleController(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should mark module", async () => {
      req.params = { enrollmentId: "e1" };
      req.body = { moduleTitle: "Intro", totalModules: 5 };
      (enrollmentService.markModuleRead as jest.Mock).mockResolvedValue({ id: "e1" });
      await markModuleController(req as Request, res as Response, next);
      expect(enrollmentService.markModuleRead).toHaveBeenCalledWith("e1", "Intro", "user123", 5);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle error", async () => {
      req.params = { enrollmentId: "e1" };
      req.body = { moduleTitle: "Intro", totalModules: 5 };
      const err = new Error("Failed");
      (enrollmentService.markModuleRead as jest.Mock).mockRejectedValue(err);
      await markModuleController(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
