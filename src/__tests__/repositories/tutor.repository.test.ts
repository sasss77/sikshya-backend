import mongoose from "mongoose";
import { UserModel } from "../../models/user.model";
import {
  findTutorProfileByUserId,
  upsertTutorProfile,
  findAllTutorProfiles,
  findTutorCourses,
  addCourseToDB,
  updateCourseInDB,
  deleteCourseFromDB,
  addModuleToCourseInDB,
  deleteModuleFromCourseInDB,
  addContentToModuleInDB,
  deleteContentFromModuleInDB,
} from "../../repositories/tutor.repository";

// ─── Helpers ────────────────────────────────────────────────────────────────

let userId: string;

const baseProfile = {
  bio: "Experienced Math tutor",
  institution: "Tribhuvan University",
  experience: "5 years",
  location: "Kathmandu",
  languages: ["Nepali", "English"],
  subjects: ["Mathematics", "Physics"],
  levels: ["High School", "Undergraduate"],
  sessionTypes: ["online"],
  hourlyRate: 500,
  availDays: ["Mon", "Wed", "Fri"],
  tags: ["math", "physics"],
  achievements: ["Best Tutor 2023"],
};

beforeEach(async () => {
  const user = await UserModel.create({
    fullName: "Tutor User",
    email: `tutor_${Date.now()}_${Math.random()}@test.com`,
    role: "tutor",
    password: "hashed_pw_tutor",
  });
  userId = user._id.toString();
});

// ─── findTutorProfileByUserId ────────────────────────────────────────────────

describe("tutorRepository.findTutorProfileByUserId", () => {
  it("should return null if profile does not exist", async () => {
    const result = await findTutorProfileByUserId(userId);
    expect(result).toBeNull();
  });

  it("should return profile after creation", async () => {
    await upsertTutorProfile(userId, baseProfile);
    const result = await findTutorProfileByUserId(userId);
    expect(result).not.toBeNull();
    expect(result!.bio).toBe(baseProfile.bio);
  });
});

// ─── upsertTutorProfile ──────────────────────────────────────────────────────

describe("tutorRepository.upsertTutorProfile", () => {
  it("should create profile if it does not exist", async () => {
    const result = await upsertTutorProfile(userId, baseProfile);
    expect(result).not.toBeNull();
    expect(result!.location).toBe("Kathmandu");
  });

  it("should update existing profile fields", async () => {
    await upsertTutorProfile(userId, baseProfile);
    const updated = await upsertTutorProfile(userId, { bio: "Updated bio" });
    expect(updated!.bio).toBe("Updated bio");
  });
});

// ─── findAllTutorProfiles ────────────────────────────────────────────────────

describe("tutorRepository.findAllTutorProfiles", () => {
  beforeEach(async () => {
    await upsertTutorProfile(userId, {
      ...baseProfile,
      subjects: ["Mathematics"],
      levels: ["High School"],
      location: "Kathmandu",
      hourlyRate: 500,
    });
  });

  it("should return all profiles with no filters", async () => {
    const results = await findAllTutorProfiles({});
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("should filter by subject", async () => {
    const results = await findAllTutorProfiles({ subject: "Mathematics" });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("should filter by level", async () => {
    const results = await findAllTutorProfiles({ level: "High School" });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("should filter by maxPrice", async () => {
    const results = await findAllTutorProfiles({ maxPrice: 1000 });
    expect(results.every((p: any) => p.hourlyRate <= 1000)).toBe(true);
  });

  it("should filter by location", async () => {
    const results = await findAllTutorProfiles({ location: "Kathmandu" });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("should return empty array when no match", async () => {
    const results = await findAllTutorProfiles({ subject: "NonExistentSubject" });
    expect(results).toHaveLength(0);
  });

  it("should sort by price_asc", async () => {
    const results = await findAllTutorProfiles({ sortBy: "price_asc" });
    expect(Array.isArray(results)).toBe(true);
  });

  it("should sort by price_desc", async () => {
    const results = await findAllTutorProfiles({ sortBy: "price_desc" });
    expect(Array.isArray(results)).toBe(true);
  });

  it("should sort by reviews", async () => {
    const results = await findAllTutorProfiles({ sortBy: "reviews" });
    expect(Array.isArray(results)).toBe(true);
  });
});

// ─── findTutorCourses ────────────────────────────────────────────────────────

describe("tutorRepository.findTutorCourses", () => {
  it("should return empty array if no courses", async () => {
    await upsertTutorProfile(userId, baseProfile);
    const courses = await findTutorCourses(userId);
    expect(courses).toHaveLength(0);
  });

  it("should return courses after adding one", async () => {
    await addCourseToDB(userId, { title: "Algebra 101", level: "High School", price: 200, modules: [] });
    const courses = await findTutorCourses(userId);
    expect(courses.length).toBe(1);
    expect(courses[0].title).toBe("Algebra 101");
  });
});

// ─── addCourseToDB ───────────────────────────────────────────────────────────

describe("tutorRepository.addCourseToDB", () => {
  it("should add a course to the tutor profile", async () => {
    const result = await addCourseToDB(userId, {
      title: "Calculus",
      level: "Undergraduate",
      price: 300,
      modules: [],
    });
    expect(result).not.toBeNull();
    const courses = (result as any).courses;
    expect(courses.some((c: any) => c.title === "Calculus")).toBe(true);
  });
});

// ─── updateCourseInDB / deleteCourseFromDB ───────────────────────────────────

describe("tutorRepository.updateCourseInDB and deleteCourseFromDB", () => {
  let courseId: string;

  beforeEach(async () => {
    const result = await addCourseToDB(userId, {
      title: "Old Title",
      level: "High School",
      price: 100,
      modules: [],
    });
    courseId = (result as any).courses[0]._id.toString();
  });

  it("should update course title", async () => {
    const updated = await updateCourseInDB(userId, courseId, { title: "New Title" });
    const course = (updated as any).courses.find((c: any) => c._id.toString() === courseId);
    expect(course.title).toBe("New Title");
  });

  it("should delete a course", async () => {
    const result = await deleteCourseFromDB(userId, courseId);
    const courses = (result as any).courses;
    expect(courses.some((c: any) => c._id.toString() === courseId)).toBe(false);
  });
});

// ─── addModuleToCourseInDB / deleteModuleFromCourseInDB ─────────────────────

describe("tutorRepository.module operations", () => {
  let courseId: string;

  beforeEach(async () => {
    const result = await addCourseToDB(userId, {
      title: "Course",
      level: "High School",
      price: 100,
      modules: [],
    });
    courseId = (result as any).courses[0]._id.toString();
  });

  it("should add a module to a course", async () => {
    const result = await addModuleToCourseInDB(userId, courseId, { title: "Module 1" });
    const course = (result as any).courses.find((c: any) => c._id.toString() === courseId);
    expect(course.modules.some((m: any) => m.title === "Module 1")).toBe(true);
  });

  it("should delete a module from a course by index", async () => {
    await addModuleToCourseInDB(userId, courseId, { title: "Module A" });
    const result = await deleteModuleFromCourseInDB(userId, courseId, 0);
    const course = (result as any).courses.find((c: any) => c._id.toString() === courseId);
    expect(course.modules).toHaveLength(0);
  });

  it("should return null if profile not found for deleteModule", async () => {
    const fakeUserId = new mongoose.Types.ObjectId().toString();
    const result = await deleteModuleFromCourseInDB(fakeUserId, courseId, 0);
    expect(result).toBeNull();
  });

  it("should return null if courseId invalid for deleteModule", async () => {
    const fakeCourseId = new mongoose.Types.ObjectId().toString();
    const result = await deleteModuleFromCourseInDB(userId, fakeCourseId, 0);
    expect(result).toBeNull();
  });
});

// ─── addContentToModuleInDB / deleteContentFromModuleInDB ───────────────────

describe("tutorRepository.content operations", () => {
  let courseId: string;

  beforeEach(async () => {
    const result = await addCourseToDB(userId, {
      title: "Course",
      level: "High School",
      price: 100,
      modules: [],
    });
    courseId = (result as any).courses[0]._id.toString();
    await addModuleToCourseInDB(userId, courseId, { title: "Module 1" });
  });

  it("should add content to a module", async () => {
    const result = await addContentToModuleInDB(userId, courseId, 0, {
      type: "text",
      title: "Intro",
      urlOrText: "Hello world",
    });
    expect(result).not.toBeNull();
  });

  it("should delete content from a module by index", async () => {
    await addContentToModuleInDB(userId, courseId, 0, {
      type: "pdf",
      title: "Lecture 1",
      urlOrText: "/files/lec1.pdf",
    });
    const result = await deleteContentFromModuleInDB(userId, courseId, 0, 0);
    expect(result).not.toBeNull();
  });

  it("should return null when profile not found for addContent", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await addContentToModuleInDB(fakeId, courseId, 0, {
      type: "text",
      title: "T",
      urlOrText: "x",
    });
    expect(result).toBeNull();
  });

  it("should return null when course invalid for addContent", async () => {
    const fakeCourseId = new mongoose.Types.ObjectId().toString();
    const result = await addContentToModuleInDB(userId, fakeCourseId, 0, {
      type: "text",
      title: "T",
      urlOrText: "x",
    });
    expect(result).toBeNull();
  });
});
