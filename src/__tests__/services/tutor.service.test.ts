import {
  listTutors,
  getTutorProfile,
  getMyTutorProfile,
  saveTutorProfile,
  getMyCourses,
  addCourse,
  updateCourse,
  deleteCourse,
  addModule,
  deleteModule,
  addModuleContent,
  deleteModuleContent,
} from "../../services/tutor.service";
import { HttpException } from "../../exceptions/http-exception";
import * as tutorRepo from "../../repositories/tutor.repository";
import * as userRepo from "../../repositories/user.repository";

jest.mock("../../repositories/tutor.repository");
jest.mock("../../repositories/user.repository");

const mockUserId = "user123";
const mockCourseId = "course456";

const mockProfile = (overrides = {}) => ({
  bio: "bio",
  institution: "inst",
  experience: "5yr",
  location: "KTM",
  languages: ["Nepali"],
  subjects: ["Math"],
  levels: ["High School"],
  sessionTypes: ["online"],
  hourlyRate: 100,
  availDays: ["Monday"],
  tags: [],
  achievements: [],
  courses: [{ _id: { toString: () => mockCourseId }, title: "Test", modules: [] }],
  averageRating: 4.5,
  reviewCount: 10,
  userId: { _id: "user123", fullName: "Alice", email: "alice@test.com", profileImage: null },
  populate: jest.fn().mockImplementation(function () { return this; }),
  ...overrides,
});

describe("Tutor Service", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("listTutors", () => {
    it("should return list of formatted profiles", async () => {
      (tutorRepo.findAllTutorProfiles as jest.Mock).mockResolvedValue([mockProfile()]);
      const result = await listTutors({});
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });
  });

  describe("getTutorProfile", () => {
    it("should return profile if found", async () => {
      const profile = mockProfile();
      (tutorRepo.findTutorProfileByUserId as jest.Mock).mockResolvedValue(profile);
      const result = await getTutorProfile(mockUserId);
      expect(result.name).toBe("Alice");
    });

    it("should throw 404 if not found", async () => {
      (tutorRepo.findTutorProfileByUserId as jest.Mock).mockResolvedValue(null);
      await expect(getTutorProfile(mockUserId)).rejects.toThrow(HttpException);
    });
  });

  describe("getMyTutorProfile", () => {
    it("should return empty profile if tutor has no profile yet", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.findTutorProfileByUserId as jest.Mock).mockResolvedValue(null);
      const result = await getMyTutorProfile(mockUserId);
      expect(result.hourlyRate).toBe(0);
    });

    it("should return populated profile if it exists", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      const profile = mockProfile();
      (tutorRepo.findTutorProfileByUserId as jest.Mock).mockResolvedValue(profile);
      const result = await getMyTutorProfile(mockUserId);
      expect(result.name).toBe("Alice");
    });

    it("should throw 403 if user is not a tutor", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "student" });
      await expect(getMyTutorProfile(mockUserId)).rejects.toThrow(HttpException);
    });
  });

  describe("saveTutorProfile", () => {
    const validData = {
      bio: "bio", institution: "inst", experience: "5yr", location: "KTM",
      languages: ["Nepali"], subjects: ["Math"], levels: ["High School"],
      sessionTypes: ["online"], hourlyRate: 100, availDays: ["Monday"],
      tags: [], achievements: [],
    };

    it("should save and return profile", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      const profile = mockProfile();
      (tutorRepo.upsertTutorProfile as jest.Mock).mockResolvedValue(profile);
      const result = await saveTutorProfile(mockUserId, validData);
      expect(result.name).toBe("Alice");
    });

    it("should throw 403 if user is not a tutor", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "student" });
      await expect(saveTutorProfile(mockUserId, validData)).rejects.toThrow(HttpException);
    });

    it("should throw 500 if upsert returns null", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.upsertTutorProfile as jest.Mock).mockResolvedValue(null);
      await expect(saveTutorProfile(mockUserId, validData)).rejects.toThrow(HttpException);
    });
  });

  describe("getMyCourses", () => {
    it("should return courses for tutor", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.findTutorCourses as jest.Mock).mockResolvedValue([{ title: "Course 1" }]);
      const result = await getMyCourses(mockUserId);
      expect(result).toHaveLength(1);
    });

    it("should throw 403 for non-tutor", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "student" });
      await expect(getMyCourses(mockUserId)).rejects.toThrow(HttpException);
    });
  });

  describe("addCourse", () => {
    const courseData = { title: "New Course", level: "High School", price: 100, modules: [] };

    it("should add and return new course", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.addCourseToDB as jest.Mock).mockResolvedValue({
        courses: [{ _id: "c1", title: "New Course" }],
      });
      const result = await addCourse(mockUserId, courseData);
      expect(result.title).toBe("New Course");
    });

    it("should throw 500 if addCourseToDB returns null", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.addCourseToDB as jest.Mock).mockResolvedValue(null);
      await expect(addCourse(mockUserId, courseData)).rejects.toThrow(HttpException);
    });
  });

  describe("updateCourse", () => {
    it("should update and return the course", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.updateCourseInDB as jest.Mock).mockResolvedValue({
        courses: [{ _id: { toString: () => mockCourseId }, title: "Updated" }],
      });
      const result = await updateCourse(mockUserId, mockCourseId, { title: "Updated" });
      expect(result.title).toBe("Updated");
    });

    it("should throw 404 if course not found", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.updateCourseInDB as jest.Mock).mockResolvedValue(null);
      await expect(updateCourse(mockUserId, mockCourseId, {})).rejects.toThrow(HttpException);
    });
  });

  describe("deleteCourse", () => {
    it("should return { deleted: true } on success", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.deleteCourseFromDB as jest.Mock).mockResolvedValue({ courses: [] });
      const result = await deleteCourse(mockUserId, mockCourseId);
      expect(result).toEqual({ deleted: true });
    });

    it("should throw 404 if course not found", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.deleteCourseFromDB as jest.Mock).mockResolvedValue(null);
      await expect(deleteCourse(mockUserId, mockCourseId)).rejects.toThrow(HttpException);
    });
  });

  describe("addModule", () => {
    it("should add module and return modules array", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.addModuleToCourseInDB as jest.Mock).mockResolvedValue({
        courses: [{ _id: { toString: () => mockCourseId }, modules: [{ title: "Mod 1" }] }],
      });
      const result = await addModule(mockUserId, mockCourseId, { title: "Mod 1" });
      expect(result).toHaveLength(1);
    });

    it("should throw 404 if course not found", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.addModuleToCourseInDB as jest.Mock).mockResolvedValue(null);
      await expect(addModule(mockUserId, mockCourseId, { title: "Mod" })).rejects.toThrow(HttpException);
    });
  });

  describe("deleteModule", () => {
    it("should delete module and return modules", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.deleteModuleFromCourseInDB as jest.Mock).mockResolvedValue({
        courses: [{ _id: { toString: () => mockCourseId }, modules: [] }],
      });
      const result = await deleteModule(mockUserId, mockCourseId, 0);
      expect(result).toEqual([]);
    });

    it("should throw 400 for invalid module index", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      await expect(deleteModule(mockUserId, mockCourseId, -1)).rejects.toThrow(HttpException);
    });

    it("should throw 404 if course not found", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.deleteModuleFromCourseInDB as jest.Mock).mockResolvedValue(null);
      await expect(deleteModule(mockUserId, mockCourseId, 0)).rejects.toThrow(HttpException);
    });
  });

  describe("addModuleContent", () => {
    const contentData = { type: "text", title: "Lecture 1", urlOrText: "content here" };

    it("should add content and return modules", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.addContentToModuleInDB as jest.Mock).mockResolvedValue({
        courses: [{ _id: { toString: () => mockCourseId }, modules: [{ title: "Mod", content: [contentData] }] }],
      });
      const result = await addModuleContent(mockUserId, mockCourseId, 0, contentData);
      expect(result).toHaveLength(1);
    });

    it("should throw 400 for invalid module index", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      await expect(addModuleContent(mockUserId, mockCourseId, -1, contentData)).rejects.toThrow(HttpException);
    });

    it("should throw 404 if course/module not found", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.addContentToModuleInDB as jest.Mock).mockResolvedValue(null);
      await expect(addModuleContent(mockUserId, mockCourseId, 0, contentData)).rejects.toThrow(HttpException);
    });
  });

  describe("deleteModuleContent", () => {
    it("should delete content and return modules", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.deleteContentFromModuleInDB as jest.Mock).mockResolvedValue({
        courses: [{ _id: { toString: () => mockCourseId }, modules: [] }],
      });
      const result = await deleteModuleContent(mockUserId, mockCourseId, 0, 0);
      expect(result).toEqual([]);
    });

    it("should throw 400 for invalid indices", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      await expect(deleteModuleContent(mockUserId, mockCourseId, -1, 0)).rejects.toThrow(HttpException);
    });

    it("should throw 404 if not found", async () => {
      (userRepo.findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (tutorRepo.deleteContentFromModuleInDB as jest.Mock).mockResolvedValue(null);
      await expect(deleteModuleContent(mockUserId, mockCourseId, 0, 0)).rejects.toThrow(HttpException);
    });
  });
});
