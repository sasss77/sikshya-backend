import mongoose from "mongoose";
import { UserModel } from "../../models/user.model";
import { BookingModel } from "../../models/booking.model";
import {
  createEnrollment,
  findEnrollmentsByStudentId,
  findEnrollmentById,
  findEnrollmentByCourse,
  findEnrollmentByBookingId,
  toggleModuleCompleted,
  updateEnrollmentTopic,
  updateEnrollmentProgress,
} from "../../repositories/enrollment.repository";

// ─── Helpers ────────────────────────────────────────────────────────────────

let studentId: string;
let tutorId: string;

const makeEnrollmentData = (overrides = {}) => ({
  studentId,
  tutorId,
  subject: "Mathematics",
  totalSessions: 10,
  nextSession: "Mon 10:00 AM",
  topics: [
    { label: "Topic 1", done: false },
    { label: "Topic 2", done: false },
  ],
  ...overrides,
});

beforeEach(async () => {
  const student = await UserModel.create({
    fullName: "Student",
    email: `s_${Date.now()}_${Math.random()}@test.com`,
    role: "student",
    password: "hashed_pw_01",
  });
  const tutor = await UserModel.create({
    fullName: "Tutor",
    email: `t_${Date.now()}_${Math.random()}@test.com`,
    role: "tutor",
    password: "hashed_pw_02",
  });
  studentId = student._id.toString();
  tutorId = tutor._id.toString();
});

// ─── createEnrollment ────────────────────────────────────────────────────────

describe("enrollmentRepository.createEnrollment", () => {
  it("should create an enrollment", async () => {
    const enrollment = await createEnrollment(makeEnrollmentData());
    expect(enrollment._id).toBeDefined();
    expect(enrollment.subject).toBe("Mathematics");
    expect(enrollment.status).toBe("not_started");
  });

  it("should create enrollment with optional bookingId and courseId", async () => {
    const booking = await BookingModel.create({
      studentId: new mongoose.Types.ObjectId(studentId),
      tutorId: new mongoose.Types.ObjectId(tutorId),
      subject: "Math",
      day: "Mon",
      time: "10:00 AM",
      price: 500,
      priceUSD: 5,
    });
    const courseId = new mongoose.Types.ObjectId().toString();
    const enrollment = await createEnrollment(
      makeEnrollmentData({ bookingId: booking._id.toString(), courseId })
    );
    expect(enrollment.bookingId?.toString()).toBe(booking._id.toString());
    expect(enrollment.courseId?.toString()).toBe(courseId);
  });
});

// ─── findEnrollmentsByStudentId ──────────────────────────────────────────────

describe("enrollmentRepository.findEnrollmentsByStudentId", () => {
  it("should return all enrollments for a student", async () => {
    await createEnrollment(makeEnrollmentData());
    await createEnrollment(makeEnrollmentData({ subject: "Physics" }));
    const results = await findEnrollmentsByStudentId(studentId);
    expect(results.length).toBe(2);
  });

  it("should return empty array for student with no enrollments", async () => {
    const results = await findEnrollmentsByStudentId(new mongoose.Types.ObjectId().toString());
    expect(results).toHaveLength(0);
  });
});

// ─── findEnrollmentById ──────────────────────────────────────────────────────

describe("enrollmentRepository.findEnrollmentById", () => {
  it("should return enrollment by ID", async () => {
    const enrollment = await createEnrollment(makeEnrollmentData());
    const found = await findEnrollmentById(enrollment._id.toString());
    expect(found).not.toBeNull();
    expect(found!._id.toString()).toBe(enrollment._id.toString());
  });

  it("should return null for non-existent ID", async () => {
    const result = await findEnrollmentById(new mongoose.Types.ObjectId().toString());
    expect(result).toBeNull();
  });
});

// ─── findEnrollmentByCourse ──────────────────────────────────────────────────

describe("enrollmentRepository.findEnrollmentByCourse", () => {
  it("should find enrollment by student and courseId", async () => {
    const courseId = new mongoose.Types.ObjectId().toString();
    await createEnrollment(makeEnrollmentData({ courseId }));
    const result = await findEnrollmentByCourse(studentId, courseId);
    expect(result).not.toBeNull();
    expect(result!.courseId?.toString()).toBe(courseId);
  });

  it("should return null if not found", async () => {
    const result = await findEnrollmentByCourse(studentId, new mongoose.Types.ObjectId().toString());
    expect(result).toBeNull();
  });
});

// ─── findEnrollmentByBookingId ───────────────────────────────────────────────

describe("enrollmentRepository.findEnrollmentByBookingId", () => {
  it("should find enrollment by bookingId", async () => {
    const booking = await BookingModel.create({
      studentId: new mongoose.Types.ObjectId(studentId),
      tutorId: new mongoose.Types.ObjectId(tutorId),
      subject: "Math",
      day: "Mon",
      time: "10:00 AM",
      price: 500,
      priceUSD: 5,
    });
    await createEnrollment(makeEnrollmentData({ bookingId: booking._id.toString() }));
    const result = await findEnrollmentByBookingId(booking._id.toString());
    expect(result).not.toBeNull();
  });

  it("should return null if not found", async () => {
    const result = await findEnrollmentByBookingId(new mongoose.Types.ObjectId().toString());
    expect(result).toBeNull();
  });
});

// ─── toggleModuleCompleted ───────────────────────────────────────────────────

describe("enrollmentRepository.toggleModuleCompleted", () => {
  it("should add a module to completedModules", async () => {
    const enrollment = await createEnrollment(makeEnrollmentData());
    const result = await toggleModuleCompleted(enrollment._id.toString(), "Module 1", 2);
    expect(result!.completedModules).toContain("Module 1");
    expect(result!.status).toBe("in_progress");
  });

  it("should remove a module if already completed (toggle)", async () => {
    const enrollment = await createEnrollment(makeEnrollmentData());
    await toggleModuleCompleted(enrollment._id.toString(), "Module 1", 2);
    const result = await toggleModuleCompleted(enrollment._id.toString(), "Module 1", 2);
    expect(result!.completedModules).not.toContain("Module 1");
  });

  it("should set status to completed when all modules done", async () => {
    const enrollment = await createEnrollment(makeEnrollmentData());
    await toggleModuleCompleted(enrollment._id.toString(), "Module 1", 2);
    const result = await toggleModuleCompleted(enrollment._id.toString(), "Module 2", 2);
    // After toggling Module 2 in, we have 2 done, and totalModules=2 so progress = 100% => status completed
    expect(result!.status).toBe("completed");
  });

  it("should return null for non-existent enrollment", async () => {
    const result = await toggleModuleCompleted(new mongoose.Types.ObjectId().toString(), "M1", 2);
    expect(result).toBeNull();
  });
});

// ─── updateEnrollmentTopic ───────────────────────────────────────────────────

describe("enrollmentRepository.updateEnrollmentTopic", () => {
  it("should mark a topic as done", async () => {
    const enrollment = await createEnrollment(makeEnrollmentData());
    const result = await updateEnrollmentTopic(enrollment._id.toString(), 0, true);
    expect(result!.topics[0].done).toBe(true);
    expect(result!.progress).toBe(50);
    expect(result!.status).toBe("in_progress");
  });

  it("should mark all topics done and set status to completed", async () => {
    const enrollment = await createEnrollment(makeEnrollmentData());
    await updateEnrollmentTopic(enrollment._id.toString(), 0, true);
    const result = await updateEnrollmentTopic(enrollment._id.toString(), 1, true);
    expect(result!.progress).toBe(100);
    expect(result!.status).toBe("completed");
  });

  it("should return null for non-existent enrollment", async () => {
    const result = await updateEnrollmentTopic(new mongoose.Types.ObjectId().toString(), 0, true);
    expect(result).toBeNull();
  });
});

// ─── updateEnrollmentProgress ────────────────────────────────────────────────

describe("enrollmentRepository.updateEnrollmentProgress", () => {
  it("should update completedSessions and nextSession", async () => {
    const enrollment = await createEnrollment(makeEnrollmentData());
    const result = await updateEnrollmentProgress(enrollment._id.toString(), 3, "Wed 2:00 PM");
    expect(result!.completedSessions).toBe(3);
    expect(result!.nextSession).toBe("Wed 2:00 PM");
  });
});
