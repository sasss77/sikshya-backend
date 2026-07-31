import {
  getAllUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  deleteUserService,
  getAdminStatsService,
  sendAdminNotificationService,
  getAdminRequestsService,
  verifyAdminService,
  getAllCoursesService,
  getAdminCourseByIdService,
  getBookedSlotsService,
} from "../../services/admin.user.service";
import { HttpException } from "../../exceptions/http-exception";
import * as userRepo from "../../repositories/user.repository";
import { UserModel } from "../../models/user.model";
import { TutorProfileModel } from "../../models/tutor-profile.model";
import { StudentProfileModel } from "../../models/student-profile.model";
import { EnrollmentModel } from "../../models/enrollment.model";
import { BookingModel } from "../../models/booking.model";
import { NotificationModel } from "../../models/notification.model";
import bcrypt from "bcryptjs";

jest.mock("../../repositories/user.repository");
jest.mock("bcryptjs");
jest.mock("../../models/user.model");
jest.mock("../../models/tutor-profile.model");
jest.mock("../../models/student-profile.model");
jest.mock("../../models/enrollment.model");
jest.mock("../../models/booking.model");
jest.mock("../../models/notification.model");

const mockUserId = "user123";

const mockUser = {
  _id: mockUserId,
  id: mockUserId,
  fullName: "Admin User",
  email: "admin@test.com",
  role: "admin",
  password: "hashed",
  phoneNumber: null,
  profileImage: null,
  isVerifiedAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Admin User Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.genSalt as jest.Mock).mockResolvedValue("salt");
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password");
  });

  describe("getAllUsersService", () => {
    it("should return paginated users without tutor profiles", async () => {
      (userRepo.findPaginatedUsers as jest.Mock).mockResolvedValue({
        data: [{ id: "u1", role: "student", fullName: "Alice" }],
        total: 1, page: 1, totalPages: 1,
      });
      const result = await getAllUsersService(1, 10, "", undefined);
      expect(result.data).toHaveLength(1);
    });

    it("should attach tutor profiles when tutors exist", async () => {
      (userRepo.findPaginatedUsers as jest.Mock).mockResolvedValue({
        data: [{ id: "tutor1", role: "tutor", fullName: "Bob" }],
        total: 1, page: 1, totalPages: 1,
      });
      (TutorProfileModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ userId: { toString: () => "tutor1" }, bio: "bio" }]),
      });
      const result = await getAllUsersService(1, 10, "", "tutor");
      expect(result.data[0].role).toBe("tutor");
    });
  });

  describe("getUserByIdService", () => {
    it("should return student details", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ ...mockUser, role: "student" });
      (StudentProfileModel.findOne as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      (EnrollmentModel.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
      const result = await getUserByIdService(mockUserId);
      expect(result.role).toBe("student");
    });

    it("should return tutor details", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ ...mockUser, role: "tutor" });
      (TutorProfileModel.findOne as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue({ courses: [] }) });
      (EnrollmentModel.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
      const result = await getUserByIdService(mockUserId);
      expect(result.role).toBe("tutor");
    });

    it("should throw 404 if user not found", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue(null);
      await expect(getUserByIdService(mockUserId)).rejects.toThrow(HttpException);
    });
  });

  describe("createUserService", () => {
    const newUserData = { fullName: "New", email: "new@test.com", role: "student", password: "Password1!" };

    it("should create and return new user", async () => {
      (userRepo.findUserByEmail as jest.Mock).mockResolvedValue(null);
      (userRepo.createUser as jest.Mock).mockResolvedValue({ ...mockUser, ...newUserData });
      const result = await createUserService(newUserData);
      expect(result.email).toBe("new@test.com");
    });

    it("should throw 400 if email already exists", async () => {
      (userRepo.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      await expect(createUserService(newUserData)).rejects.toThrow(HttpException);
    });
  });

  describe("updateUserService", () => {
    const updateData = { fullName: "Updated Name" };

    it("should update and return user", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue(mockUser);
      (userRepo.updateUserById as jest.Mock).mockResolvedValue({ ...mockUser, fullName: "Updated Name" });
      const result = await updateUserService(mockUserId, updateData);
      expect(result.fullName).toBe("Updated Name");
    });

    it("should throw 404 if user not found", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue(null);
      await expect(updateUserService(mockUserId, updateData)).rejects.toThrow(HttpException);
    });

    it("should throw 400 if email already in use", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue(mockUser);
      (userRepo.findUserByEmail as jest.Mock).mockResolvedValue({ _id: "other_user", email: "taken@test.com" });
      await expect(updateUserService(mockUserId, { email: "taken@test.com" })).rejects.toThrow(HttpException);
    });

    it("should hash password if provided", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue(mockUser);
      (userRepo.updateUserById as jest.Mock).mockResolvedValue(mockUser);
      await updateUserService(mockUserId, { password: "NewPass1!" });
      expect(bcrypt.hash).toHaveBeenCalled();
    });
  });

  describe("deleteUserService", () => {
    it("should delete user", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue(mockUser);
      (userRepo.deleteUserById as jest.Mock).mockResolvedValue(undefined);
      const result = await deleteUserService(mockUserId);
      expect(result).toBeNull();
    });

    it("should throw 404 if user not found", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue(null);
      await expect(deleteUserService(mockUserId)).rejects.toThrow(HttpException);
    });
  });

  describe("getAdminStatsService", () => {
    it("should return stats", async () => {
      (UserModel.countDocuments as jest.Mock).mockResolvedValue(10);
      (UserModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([{ _id: "u1", fullName: "User", email: "u@t.com", role: "student", createdAt: new Date() }]),
      });
      const result = await getAdminStatsService();
      expect(result.totalUsers).toBe(10);
    });
  });

  describe("sendAdminNotificationService", () => {
    it("should send to all users", async () => {
      (UserModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: "u1" }, { _id: "u2" }]),
      });
      (NotificationModel.insertMany as jest.Mock).mockResolvedValue(undefined);
      await sendAdminNotificationService("all", "Title", "Msg");
      expect(NotificationModel.insertMany).toHaveBeenCalled();
    });

    it("should send to students only", async () => {
      (UserModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: "s1" }]),
      });
      (NotificationModel.insertMany as jest.Mock).mockResolvedValue(undefined);
      await sendAdminNotificationService("students", "Title", "Msg");
      expect(NotificationModel.insertMany).toHaveBeenCalled();
    });

    it("should send to tutors only", async () => {
      (UserModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: "t1" }]),
      });
      (NotificationModel.insertMany as jest.Mock).mockResolvedValue(undefined);
      await sendAdminNotificationService("tutors", "Title", "Msg");
      expect(NotificationModel.insertMany).toHaveBeenCalled();
    });

    it("should throw 404 if no users found", async () => {
      (UserModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });
      await expect(sendAdminNotificationService("all", "Title", "Msg")).rejects.toThrow(HttpException);
    });
  });

  describe("getAdminRequestsService", () => {
    it("should return unverified admin users", async () => {
      (UserModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([{ _id: "a1", fullName: "Admin", email: "a@t.com", createdAt: new Date() }]),
      });
      const result = await getAdminRequestsService();
      expect(result).toHaveLength(1);
    });
  });

  describe("verifyAdminService", () => {
    it("should verify admin", async () => {
      const mockAdminUser = { ...mockUser, role: "admin", isVerifiedAdmin: false, save: jest.fn() };
      (UserModel.findById as jest.Mock).mockResolvedValue(mockAdminUser);
      await verifyAdminService(mockUserId);
      expect(mockAdminUser.isVerifiedAdmin).toBe(true);
      expect(mockAdminUser.save).toHaveBeenCalled();
    });

    it("should throw 404 if user not found", async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(null);
      await expect(verifyAdminService(mockUserId)).rejects.toThrow(HttpException);
    });

    it("should throw 400 if user is not admin", async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue({ ...mockUser, role: "student" });
      await expect(verifyAdminService(mockUserId)).rejects.toThrow(HttpException);
    });
  });

  describe("getAllCoursesService", () => {
    it("should return all courses from tutor profiles", async () => {
      (TutorProfileModel.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            userId: { _id: "t1", fullName: "Tutor", email: "t@t.com", profileImage: null },
            courses: [{ _id: "c1", title: "Math", level: "High", price: 100, modules: [] }],
          },
        ]),
      });
      const result = await getAllCoursesService();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Math");
    });
  });

  describe("getAdminCourseByIdService", () => {
    it("should return a course by ID", async () => {
      (TutorProfileModel.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          userId: { _id: "t1", fullName: "Tutor", email: "t@t.com", profileImage: null },
          courses: [{ _id: "c1", title: "Math", level: "High", price: 100, modules: [] }],
        }),
      });
      const result = await getAdminCourseByIdService("c1");
      expect(result.title).toBe("Math");
    });

    it("should throw 404 if course not found", async () => {
      (TutorProfileModel.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });
      await expect(getAdminCourseByIdService("bad-id")).rejects.toThrow(HttpException);
    });
  });

  describe("getBookedSlotsService", () => {
    it("should return booked slots", async () => {
      (BookingModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ day: "Monday", time: "10:00" }]),
      });
      const result = await getBookedSlotsService("tutor1");
      expect(result).toHaveLength(1);
      expect(result[0].day).toBe("Monday");
    });
  });
});
