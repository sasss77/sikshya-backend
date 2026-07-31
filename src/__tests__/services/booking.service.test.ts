import { bookSession, changeBookingStatus, getMyBookings, handleStaleBookings } from "../../services/booking.service";
import { findUserById } from "../../repositories/user.repository";
import { findTutorProfileByUserId } from "../../repositories/tutor.repository";
import { createBooking, findBookingById, findBookingsByStudentId, updateBookingStatus, calculateSessionEndTime, calculateSessionDate } from "../../repositories/booking.repository";
import { notifyUser } from "../../services/notification.service";
import { HttpException } from "../../exceptions/http-exception";
import { BookingModel } from "../../models/booking.model";

jest.mock("../../repositories/user.repository");
jest.mock("../../repositories/tutor.repository");
jest.mock("../../repositories/booking.repository");
jest.mock("../../services/notification.service");
jest.mock("../../services/google-calendar.service", () => ({
  createMeetSession: jest.fn().mockResolvedValue({ meetLink: "http://meet.com/123", calendarEventId: "eventId" }),
  deleteMeetSession: jest.fn(),
}));
jest.mock("../../services/enrollment.service", () => ({
  createEnrollmentFromBooking: jest.fn(),
}));
jest.mock("../../services/payment.service", () => ({
  refundPayment: jest.fn(),
}));
jest.mock("../../models/booking.model", () => ({
  BookingModel: {
    find: jest.fn().mockResolvedValue([]),
    updateOne: jest.fn(),
  }
}));

describe("Booking Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("bookSession", () => {
    it("should book a session", async () => {
      (findUserById as jest.Mock).mockResolvedValue({ role: "tutor", fullName: "Tutor Name" });
      (findTutorProfileByUserId as jest.Mock).mockResolvedValue({ availDays: ["Mon"], hourlyRate: 100 });
      (createBooking as jest.Mock).mockResolvedValue({ _id: "bookingId", createdAt: new Date() });
      (calculateSessionDate as jest.Mock).mockReturnValue(new Date());

      const data = {
        tutorId: "tutorId", subject: "Math", day: "Mon", time: "10:00 AM", duration: "60 min"
      };
      const result = await bookSession("studentId", data);
      expect(result.id).toBe("bookingId");
      expect(createBooking).toHaveBeenCalled();
      expect(notifyUser).toHaveBeenCalled();
    });

    it("should throw if tutor not available on day", async () => {
      (findUserById as jest.Mock).mockResolvedValue({ role: "tutor", fullName: "Tutor Name" });
      (findTutorProfileByUserId as jest.Mock).mockResolvedValue({ availDays: ["Tue"], hourlyRate: 100 });
      const data = {
        tutorId: "tutorId", subject: "Math", day: "Mon", time: "10:00 AM", duration: "60 min"
      };
      await expect(bookSession("studentId", data)).rejects.toThrow(HttpException);
    });
  });

  describe("getMyBookings", () => {
    it("should return bookings", async () => {
      (findBookingsByStudentId as jest.Mock).mockResolvedValue([{ _id: "bookingId", createdAt: new Date() }]);
      (calculateSessionDate as jest.Mock).mockReturnValue(new Date());
      const result = await getMyBookings("studentId", "student");
      expect(result.length).toBe(1);
    });
  });

  describe("changeBookingStatus", () => {
    it("should update status to upcoming", async () => {
      (findBookingById as jest.Mock).mockResolvedValue({
        _id: "bookingId", tutorId: "tutorId", studentId: "studentId", status: "pending", createdAt: new Date()
      });
      (updateBookingStatus as jest.Mock).mockResolvedValue({ _id: "bookingId", status: "upcoming", createdAt: new Date() });
      (calculateSessionDate as jest.Mock).mockReturnValue(new Date());
      (findUserById as jest.Mock).mockResolvedValue({ fullName: "Name" });

      const result = await changeBookingStatus("bookingId", "tutorId", "tutor", { status: "upcoming" });
      expect(result.status).toBe("upcoming");
      expect(notifyUser).toHaveBeenCalledTimes(2);
    });

    it("should allow student to cancel", async () => {
      (findBookingById as jest.Mock).mockResolvedValue({
        _id: "bookingId", tutorId: "tutorId", studentId: "studentId", status: "pending", createdAt: new Date()
      });
      (updateBookingStatus as jest.Mock).mockResolvedValue({ _id: "bookingId", status: "cancelled", createdAt: new Date() });
      (calculateSessionDate as jest.Mock).mockReturnValue(new Date());
      
      const result = await changeBookingStatus("bookingId", "studentId", "student", { status: "cancelled" });
      expect(result.status).toBe("cancelled");
      expect(notifyUser).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleStaleBookings", () => {
    it("should expire stale pending bookings", async () => {
      const pastDate = new Date(Date.now() - 1000000);
      BookingModel.find = jest.fn().mockResolvedValue([
        { _id: "booking1", status: "pending", createdAt: pastDate, day: "Mon", time: "10:00 AM", duration: "60 min" }
      ]);
      (calculateSessionEndTime as jest.Mock).mockReturnValue(pastDate);

      await handleStaleBookings();
      expect(BookingModel.updateOne).toHaveBeenCalledWith({ _id: "booking1" }, { $set: { status: "expired", paymentStatus: undefined } });
    });
  });
});
