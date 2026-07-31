import {
  getMyNotifications,
  notifyUser,
  readNotification,
  readAllNotifications,
  clearNotifications,
  getMyStudents,
  sendTutorNotificationToStudent,
} from "../../services/notification.service";
import { HttpException } from "../../exceptions/http-exception";
import * as notifRepo from "../../repositories/notification.repository";
import * as bookingRepo from "../../repositories/booking.repository";

jest.mock("../../repositories/notification.repository");
jest.mock("../../repositories/booking.repository");

const mockUserId = "user123";
const mockTutorId = "tutor456";

describe("Notification Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getMyNotifications", () => {
    it("should return formatted notifications", async () => {
      const raw = [
        { _id: "n1", type: "booking", title: "Test", message: "Msg", read: false, senderId: "s1", courseId: "c1", createdAt: new Date() },
      ];
      (notifRepo.findNotificationsByUserId as jest.Mock).mockResolvedValue(raw);
      const result = await getMyNotifications(mockUserId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("n1");
      expect(result[0].type).toBe("booking");
    });
  });

  describe("notifyUser", () => {
    it("should call createNotification with correct args", async () => {
      (notifRepo.createNotification as jest.Mock).mockResolvedValue({ _id: "n2" });
      await notifyUser(mockUserId, "booking", "Title", "Message");
      expect(notifRepo.createNotification).toHaveBeenCalledWith({
        userId: mockUserId,
        type: "booking",
        title: "Title",
        message: "Message",
      });
    });
  });

  describe("readNotification", () => {
    it("should return result on success", async () => {
      (notifRepo.markNotificationAsRead as jest.Mock).mockResolvedValue({ _id: "n3", read: true });
      const result = await readNotification("n3");
      expect(result.read).toBe(true);
    });

    it("should throw 404 if notification not found", async () => {
      (notifRepo.markNotificationAsRead as jest.Mock).mockResolvedValue(null);
      await expect(readNotification("bad-id")).rejects.toThrow(HttpException);
    });
  });

  describe("readAllNotifications", () => {
    it("should mark all as read and return success", async () => {
      (notifRepo.markAllNotificationsAsRead as jest.Mock).mockResolvedValue(undefined);
      const result = await readAllNotifications(mockUserId);
      expect(result).toEqual({ success: true });
    });
  });

  describe("clearNotifications", () => {
    it("should clear all notifications and return success", async () => {
      (notifRepo.clearAllNotifications as jest.Mock).mockResolvedValue(undefined);
      const result = await clearNotifications(mockUserId);
      expect(result).toEqual({ success: true });
    });
  });

  describe("getMyStudents", () => {
    it("should return de-duplicated students", async () => {
      const studentId = "student1";
      (bookingRepo.findStudentsByTutorId as jest.Mock).mockResolvedValue([
        { studentId: { _id: { toString: () => studentId }, fullName: "Alice", email: "alice@test.com", profileImage: "img.jpg" } },
        { studentId: { _id: { toString: () => studentId }, fullName: "Alice", email: "alice@test.com", profileImage: null } },
      ]);
      const result = await getMyStudents(mockTutorId);
      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe("Alice");
    });

    it("should skip bookings with no student", async () => {
      (bookingRepo.findStudentsByTutorId as jest.Mock).mockResolvedValue([
        { studentId: null },
        { studentId: { _id: null } },
      ]);
      const result = await getMyStudents(mockTutorId);
      expect(result).toHaveLength(0);
    });
  });

  describe("sendTutorNotificationToStudent", () => {
    const data = { studentId: "student1", title: "Hello", message: "World" };

    it("should send to a specific student with valid booking", async () => {
      (bookingRepo.findStudentsByTutorId as jest.Mock).mockResolvedValue([
        { studentId: { _id: { toString: () => "student1" } } },
      ]);
      (notifRepo.createTutorNotification as jest.Mock).mockResolvedValue({ _id: "n4" });
      const result = await sendTutorNotificationToStudent(mockTutorId, data);
      expect(notifRepo.createTutorNotification).toHaveBeenCalled();
    });

    it("should throw 403 if student is not the tutor's student", async () => {
      (bookingRepo.findStudentsByTutorId as jest.Mock).mockResolvedValue([
        { studentId: { _id: { toString: () => "other_student" } } },
      ]);
      await expect(sendTutorNotificationToStudent(mockTutorId, data)).rejects.toThrow(HttpException);
    });

    it("should send to all students when studentId is 'all'", async () => {
      (bookingRepo.findStudentsByTutorId as jest.Mock).mockResolvedValue([
        { studentId: { _id: { toString: () => "student1" } } },
        { studentId: { _id: { toString: () => "student2" } } },
      ]);
      (notifRepo.createTutorNotification as jest.Mock).mockResolvedValue({ _id: "n5" });
      const result = await sendTutorNotificationToStudent(mockTutorId, { studentId: "all", title: "Hi", message: "All" });
      expect(notifRepo.createTutorNotification).toHaveBeenCalledTimes(2);
      expect((result as any).count).toBe(2);
    });

    it("should throw 400 if 'all' but no students found", async () => {
      (bookingRepo.findStudentsByTutorId as jest.Mock).mockResolvedValue([]);
      await expect(
        sendTutorNotificationToStudent(mockTutorId, { studentId: "all", title: "Hi", message: "All" })
      ).rejects.toThrow(HttpException);
    });
  });
});
