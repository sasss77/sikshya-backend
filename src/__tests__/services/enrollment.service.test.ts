import { createEnrollmentFromBooking, getMyLearnings, getEnrollmentDetail, addCourseToLearnings } from "../../services/enrollment.service";
import { findTutorProfileByUserId } from "../../repositories/tutor.repository";
import { createEnrollment, findEnrollmentByCourse, findEnrollmentsByStudentId, findEnrollmentById } from "../../repositories/enrollment.repository";
import { findUserById } from "../../repositories/user.repository";
import { HttpException } from "../../exceptions/http-exception";

jest.mock("../../repositories/tutor.repository");
jest.mock("../../repositories/enrollment.repository");
jest.mock("../../repositories/user.repository");

describe("Enrollment Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createEnrollmentFromBooking", () => {
    it("should create an enrollment successfully", async () => {
      const mockBooking = {
        _id: "bookingId",
        tutorId: { _id: "tutorId", toString: () => "tutorId" },
        studentId: { _id: "studentId", toString: () => "studentId" },
        subject: "Math",
        day: "Monday",
        time: "10:00",
      };

      (findTutorProfileByUserId as jest.Mock).mockResolvedValue({
        courses: [{ _id: "courseId", title: "Math", modules: ["Intro"] }],
      });
      (findEnrollmentByCourse as jest.Mock).mockResolvedValue(null);
      (createEnrollment as jest.Mock).mockResolvedValue({});

      await createEnrollmentFromBooking(mockBooking);

      expect(createEnrollment).toHaveBeenCalledWith(expect.objectContaining({
        studentId: "studentId",
        tutorId: "tutorId",
        subject: "Math",
        courseId: "courseId",
      }));
    });
  });

  describe("addCourseToLearnings", () => {
    it("should add course to learnings", async () => {
      (findUserById as jest.Mock).mockResolvedValue({ role: "tutor", fullName: "John" });
      (findTutorProfileByUserId as jest.Mock).mockResolvedValue({
        courses: [{ _id: "courseId", title: "Math", modules: ["Intro"] }],
      });
      (findEnrollmentByCourse as jest.Mock).mockResolvedValue(null);
      (createEnrollment as jest.Mock).mockResolvedValue({ _id: "enrollmentId" });

      const result = await addCourseToLearnings("studentId", "tutorId", "courseId");

      expect(result.id).toBe("enrollmentId");
    });
  });

  describe("getMyLearnings", () => {
    it("should return enrollments", async () => {
      (findEnrollmentsByStudentId as jest.Mock).mockResolvedValue([{
        _id: "enrollmentId",
        courseId: "courseId",
        tutorId: { _id: "tutorId", fullName: "John" },
        topics: [{ label: "Intro", done: false }]
      }]);

      const result = await getMyLearnings("studentId");
      expect(result.length).toBe(1);
      expect(result[0].tutorName).toBe("John");
    });
  });

  describe("getEnrollmentDetail", () => {
    it("should throw if enrollment not found", async () => {
      (findEnrollmentById as jest.Mock).mockResolvedValue(null);
      await expect(getEnrollmentDetail("enrollmentId", "studentId")).rejects.toThrow(HttpException);
    });

    it("should throw if unauthorized", async () => {
      (findEnrollmentById as jest.Mock).mockResolvedValue({ studentId: "other" });
      await expect(getEnrollmentDetail("enrollmentId", "studentId")).rejects.toThrow(HttpException);
    });

    it("should return enrollment details", async () => {
      (findEnrollmentById as jest.Mock).mockResolvedValue({
        _id: "enrollmentId",
        studentId: { toString: () => "studentId" },
        tutorId: { _id: "tutorId", fullName: "John", toString: () => "tutorId" },
        courseId: "courseId",
        subject: "Math",
      });
      (findTutorProfileByUserId as jest.Mock).mockResolvedValue({
        courses: [{ _id: { toString: () => "courseId" }, title: "Math" }]
      });

      const result = await getEnrollmentDetail("enrollmentId", "studentId");
      expect(result.id).toBe("enrollmentId");
      expect(result.courseTitle).toBe("Math");
    });
  });

  describe("addCourseToLearnings", () => {
    it("should throw if tutor not found", async () => {
      (findUserById as jest.Mock).mockResolvedValue(null);
      await expect(addCourseToLearnings("studentId", "tutorId", "courseId")).rejects.toThrow(HttpException);
    });

    it("should throw if tutor has no profile", async () => {
      (findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (findTutorProfileByUserId as jest.Mock).mockResolvedValue(null);
      await expect(addCourseToLearnings("studentId", "tutorId", "courseId")).rejects.toThrow(HttpException);
    });

    it("should throw if course not found", async () => {
      (findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (findTutorProfileByUserId as jest.Mock).mockResolvedValue({ courses: [] });
      await expect(addCourseToLearnings("studentId", "tutorId", "courseId")).rejects.toThrow(HttpException);
    });
    
    it("should throw if already enrolled", async () => {
      (findUserById as jest.Mock).mockResolvedValue({ role: "tutor" });
      (findTutorProfileByUserId as jest.Mock).mockResolvedValue({ courses: [{ _id: { toString: () => "courseId" } }] });
      (findEnrollmentByCourse as jest.Mock).mockResolvedValue({});
      await expect(addCourseToLearnings("studentId", "tutorId", "courseId")).rejects.toThrow(HttpException);
    });
  });
});
