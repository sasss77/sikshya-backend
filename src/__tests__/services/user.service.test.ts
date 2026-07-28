import {
  registerUser,
  loginUser,
  getMyProfile,
  updateMyProfile,
  googleLoginUser,
  setUserRole,
} from "../../services/user.service";
import { HttpException } from "../../exceptions/http-exception";
import * as userRepo from "../../repositories/user.repository";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

jest.mock("../../repositories/user.repository");
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

const mockUserId = "user123";

const mockUser = {
  _id: mockUserId,
  fullName: "Test User",
  email: "test@test.com",
  role: "student",
  password: "hashed_password",
  phoneNumber: null,
  profileImage: null,
  isVerifiedStudent: false,
  isVerifiedAdmin: false,
  googleId: null,
};

describe("User Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.genSalt as jest.Mock).mockResolvedValue("salt");
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password");
    (jwt.sign as jest.Mock).mockReturnValue("mock_token");
    process.env.JWT_SECRET = "test_secret";
    process.env.JWT_EXPIRES_IN = "7d";
  });

  describe("registerUser", () => {
    const validData = { fullName: "Alice", email: "alice@test.com", role: "student", password: "Password1!", confirmPassword: "Password1!" };

    it("should register a new user", async () => {
      (userRepo.findUserByEmail as jest.Mock).mockResolvedValue(null);
      (userRepo.createUser as jest.Mock).mockResolvedValue({ ...mockUser, ...validData });
      const result = await registerUser(validData);
      expect(result.email).toBe("alice@test.com");
    });

    it("should throw 400 if email already exists", async () => {
      (userRepo.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      await expect(registerUser(validData)).rejects.toThrow(HttpException);
    });
  });

  describe("loginUser", () => {
    const loginData = { email: "test@test.com", password: "password123" };

    it("should return token on successful login", async () => {
      (userRepo.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await loginUser(loginData);
      expect(result.token).toBe("mock_token");
      expect(result.user.email).toBe("test@test.com");
    });

    it("should throw 404 if user not found", async () => {
      (userRepo.findUserByEmail as jest.Mock).mockResolvedValue(null);
      await expect(loginUser(loginData)).rejects.toThrow(HttpException);
    });

    it("should throw 401 if password is incorrect", async () => {
      (userRepo.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(loginUser(loginData)).rejects.toThrow(HttpException);
    });
  });

  describe("getMyProfile", () => {
    it("should return user profile", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue(mockUser);
      const result = await getMyProfile(mockUserId);
      expect(result.email).toBe("test@test.com");
    });

    it("should throw 404 if user not found", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue(null);
      await expect(getMyProfile(mockUserId)).rejects.toThrow(HttpException);
    });
  });

  describe("updateMyProfile", () => {
    it("should update fullName successfully", async () => {
      (userRepo.updateUserById as jest.Mock).mockResolvedValue({ ...mockUser, fullName: "Updated" });
      const result = await updateMyProfile(mockUserId, { fullName: "Updated" });
      expect(result.fullName).toBe("Updated");
    });

    it("should throw 400 if no valid fields provided", async () => {
      await expect(updateMyProfile(mockUserId, {})).rejects.toThrow(HttpException);
    });

    it("should update password if old and new password are provided", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (userRepo.updateUserById as jest.Mock).mockResolvedValue({ ...mockUser, fullName: "Test User" });
      const result = await updateMyProfile(mockUserId, {
        fullName: "Test User",
        password: "NewPass1!",
        confirmPassword: "NewPass1!",
        oldPassword: "Password1!",
      });
      expect(userRepo.updateUserById).toHaveBeenCalled();
    });

    it("should throw 400 if old password is incorrect", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        updateMyProfile(mockUserId, { fullName: "Test", password: "NewPass1!", confirmPassword: "NewPass1!", oldPassword: "wrongpass" })
      ).rejects.toThrow(HttpException);
    });

    it("should attach profileImage if provided", async () => {
      (userRepo.updateUserById as jest.Mock).mockResolvedValue({ ...mockUser, profileImage: "img.png" });
      const result = await updateMyProfile(mockUserId, { fullName: "Test" }, "img.png");
      expect(result.profileImage).toBe("img.png");
    });
  });

  describe("googleLoginUser", () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it("should login existing user with google", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ email: "test@test.com", name: "Test", sub: "g123", picture: null }),
      });
      (userRepo.findUserByEmail as jest.Mock).mockResolvedValue({ ...mockUser, googleId: "g123" });
      const result = await googleLoginUser("google_access_token");
      expect(result.token).toBe("mock_token");
    });

    it("should link googleId to existing user if not linked", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ email: "test@test.com", name: "Test", sub: "g123", picture: "pic.jpg" }),
      });
      (userRepo.findUserByEmail as jest.Mock).mockResolvedValue({ ...mockUser, googleId: null, profileImage: null });
      (userRepo.updateUserById as jest.Mock).mockResolvedValue(undefined);
      const result = await googleLoginUser("google_access_token");
      expect(userRepo.updateUserById).toHaveBeenCalled();
    });

    it("should create new user if email does not exist", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ email: "new@test.com", name: "New User", sub: "g999", picture: null }),
      });
      (userRepo.findUserByEmail as jest.Mock).mockResolvedValue(null);
      (userRepo.createUser as jest.Mock).mockResolvedValue({ ...mockUser, email: "new@test.com" });
      const result = await googleLoginUser("google_access_token");
      expect(userRepo.createUser).toHaveBeenCalled();
    });

    it("should throw 400 if google API fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
      await expect(googleLoginUser("bad_token")).rejects.toThrow(HttpException);
    });

    it("should throw 400 if google user has no email", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ name: "No Email User" }),
      });
      await expect(googleLoginUser("token")).rejects.toThrow(HttpException);
    });
  });

  describe("setUserRole", () => {
    it("should set role for unassigned user", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ ...mockUser, role: "unassigned" });
      (userRepo.updateUserById as jest.Mock).mockResolvedValue({ ...mockUser, role: "student" });
      const result = await setUserRole(mockUserId, "student");
      expect(result.token).toBe("mock_token");
    });

    it("should throw 400 for invalid role", async () => {
      await expect(setUserRole(mockUserId, "superuser")).rejects.toThrow(HttpException);
    });

    it("should throw 404 if user not found", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue(null);
      await expect(setUserRole(mockUserId, "student")).rejects.toThrow(HttpException);
    });

    it("should throw 400 if user already has a role", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ ...mockUser, role: "student" });
      await expect(setUserRole(mockUserId, "tutor")).rejects.toThrow(HttpException);
    });
  });
});
