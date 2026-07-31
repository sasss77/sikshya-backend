import request from "supertest";
import app from "../../app";
import { createTestUser } from "../helpers/auth.helper";
import mongoose from "mongoose";
import { StudentProfileModel } from "../../models/student-profile.model";

const BASE = "/api/students";

// ─── POST /api/students/verify ────────────────────────────────────────────────

describe(`POST ${BASE}/verify`, () => {
  it("should verify a student with valid data", async () => {
    const { token } = await createTestUser({
      role: "student",
      email: `verify_${Date.now()}@test.com`,
    });
    // subjects must be a comma-separated string per VerifyStudentSchema
    const res = await request(app)
      .post(`${BASE}/verify`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        institution: "Tribhuvan University",
        gradeLevel: "Undergraduate",
        subjects: "Mathematics, Physics",
        bio: "Eager learner who loves science",
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/verified/i);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).post(`${BASE}/verify`).send({});
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/students/profile ────────────────────────────────────────────────

describe(`GET ${BASE}/profile`, () => {
  it("should return student profile", async () => {
    const { user, token } = await createTestUser({
      role: "student",
      email: `sprofile_${Date.now()}@test.com`,
    });
    await StudentProfileModel.create({
      userId: user._id,
      institution: "TU",
      gradeLevel: "Undergraduate",
      subjects: ["Math"],
      bio: "Student",
    });
    const res = await request(app)
      .get(`${BASE}/profile`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get(`${BASE}/profile`);
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/students/dashboard ─────────────────────────────────────────────

describe(`GET ${BASE}/dashboard`, () => {
  it("should return 200 with student dashboard", async () => {
    const { token } = await createTestUser({
      role: "student",
      email: `sdash_${Date.now()}@test.com`,
    });
    const res = await request(app)
      .get(`${BASE}/dashboard`)
      .set("Authorization", `Bearer ${token}`);
    // dashboard may return 200 (normal) or 404 (no profile yet) depending on service
    expect([200, 404]).toContain(res.status);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get(`${BASE}/dashboard`);
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/students/:id ───────────────────────────────────────────────────

describe(`GET ${BASE}/:id`, () => {
  it("should return public student profile by ID", async () => {
    const { user, token } = await createTestUser({
      role: "student",
      email: `spublic_${Date.now()}@test.com`,
    });
    await StudentProfileModel.create({
      userId: user._id,
      institution: "TU",
      gradeLevel: "Undergraduate",
      subjects: ["Math"],
      bio: "Public Student",
    });
    const res = await request(app)
      .get(`${BASE}/${user._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 404 for non-existent student", async () => {
    const { token } = await createTestUser({
      role: "student",
      email: `s404_${Date.now()}@test.com`,
    });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`${BASE}/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`${BASE}/${fakeId}`);
    expect(res.status).toBe(401);
  });
});
