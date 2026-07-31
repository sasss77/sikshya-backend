import mongoose from "mongoose";
import {
  createStudentProfile,
  findStudentProfileByUserId,
} from "../../repositories/student.repository";

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeUserId = () => new mongoose.Types.ObjectId().toString();

const makeProfileData = (userId: string, overrides = {}) => ({
  userId,
  institution: "Tribhuvan University",
  gradeLevel: "Undergraduate" as const,
  subjects: ["Mathematics", "Physics"],
  bio: "I love learning!",
  ...overrides,
});

// ─── createStudentProfile ────────────────────────────────────────────────────

describe("studentRepository.createStudentProfile", () => {
  it("should create a student profile", async () => {
    const userId = makeUserId();
    const profile = await createStudentProfile(makeProfileData(userId));
    expect(profile._id).toBeDefined();
    expect(profile.institution).toBe("Tribhuvan University");
    expect(profile.gradeLevel).toBe("Undergraduate");
    expect(profile.subjects).toContain("Mathematics");
  });

  it("should create profile with High School grade level", async () => {
    const userId = makeUserId();
    const profile = await createStudentProfile(
      makeProfileData(userId, { gradeLevel: "High School" })
    );
    expect(profile.gradeLevel).toBe("High School");
  });

  it("should create profile with Postgraduate grade level", async () => {
    const userId = makeUserId();
    const profile = await createStudentProfile(
      makeProfileData(userId, { gradeLevel: "Postgraduate" })
    );
    expect(profile.gradeLevel).toBe("Postgraduate");
  });
});

// ─── findStudentProfileByUserId ──────────────────────────────────────────────

describe("studentRepository.findStudentProfileByUserId", () => {
  it("should return the profile for a user", async () => {
    const userId = makeUserId();
    await createStudentProfile(makeProfileData(userId));
    const found = await findStudentProfileByUserId(userId);
    expect(found).not.toBeNull();
    expect(found!.userId.toString()).toBe(userId);
  });

  it("should return null if no profile exists", async () => {
    const result = await findStudentProfileByUserId(makeUserId());
    expect(result).toBeNull();
  });

  it("should not return profile for a different userId", async () => {
    const userId1 = makeUserId();
    const userId2 = makeUserId();
    await createStudentProfile(makeProfileData(userId1));
    const result = await findStudentProfileByUserId(userId2);
    expect(result).toBeNull();
  });
});
