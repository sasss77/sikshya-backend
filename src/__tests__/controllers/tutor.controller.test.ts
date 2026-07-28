import request from "supertest";
import app from "../../app";
import { createTestUser } from "../helpers/auth.helper";
import mongoose from "mongoose";
import { TutorProfileModel } from "../../models/tutor-profile.model";

const BASE = "/api/tutors";

// ─── GET /api/tutors ──────────────────────────────────────────────────────────

describe(`GET ${BASE}`, () => {
  it("should return 200 with list of tutors (public)", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should support search query param", async () => {
    const res = await request(app).get(`${BASE}?search=math`);
    expect(res.status).toBe(200);
  });

  it("should support subject filter", async () => {
    const res = await request(app).get(`${BASE}?subject=Mathematics`);
    expect(res.status).toBe(200);
  });

  it("should support level filter", async () => {
    const res = await request(app).get(`${BASE}?level=High+School`);
    expect(res.status).toBe(200);
  });

  it("should support maxPrice filter", async () => {
    const res = await request(app).get(`${BASE}?maxPrice=1000`);
    expect(res.status).toBe(200);
  });

  it("should support sortBy=rating", async () => {
    const res = await request(app).get(`${BASE}?sortBy=rating`);
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/tutors/my-profile ───────────────────────────────────────────────

describe(`GET ${BASE}/my-profile`, () => {
  it("should return tutor profile for logged-in tutor", async () => {
    const { user, token } = await createTestUser({ role: "tutor", email: `tutor_${Date.now()}@test.com` });
    await TutorProfileModel.create({
      userId: user._id,
      bio: "Math tutor",
      subjects: ["Mathematics"],
    });
    const res = await request(app)
      .get(`${BASE}/my-profile`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get(`${BASE}/my-profile`);
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/tutors/profile ──────────────────────────────────────────────────

describe(`PUT ${BASE}/profile`, () => {
  it("should save tutor profile successfully", async () => {
    const { token } = await createTestUser({ role: "tutor", email: `tutorprofile_${Date.now()}@test.com` });
    const res = await request(app)
      .put(`${BASE}/profile`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bio: "Experienced tutor", subjects: ["Math"] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).put(`${BASE}/profile`).send({});
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/tutors/courses ──────────────────────────────────────────────────

describe(`GET ${BASE}/courses`, () => {
  it("should return courses for tutor", async () => {
    const { token } = await createTestUser({ role: "tutor", email: `tutorcourse_${Date.now()}@test.com` });
    const res = await request(app)
      .get(`${BASE}/courses`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get(`${BASE}/courses`);
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/tutors/courses ─────────────────────────────────────────────────

describe(`POST ${BASE}/courses`, () => {
  it("should add a course for tutor", async () => {
    const { user, token } = await createTestUser({ role: "tutor", email: `addcourse_${Date.now()}@test.com` });
    // Create a tutor profile first so addCourseToDB has a document to update
    await TutorProfileModel.create({
      userId: user._id,
      bio: "Test tutor",
      subjects: ["Mathematics"],
    });
    const res = await request(app)
      .post(`${BASE}/courses`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Algebra 101", level: "High School", price: 300 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).post(`${BASE}/courses`).send({});
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/tutors/:id ──────────────────────────────────────────────────────

describe(`GET ${BASE}/:id`, () => {
  it("should return tutor profile by user ID", async () => {
    const { user } = await createTestUser({ role: "tutor", email: `tutorbyid_${Date.now()}@test.com` });
    await TutorProfileModel.create({ userId: user._id, bio: "Test" });
    const res = await request(app).get(`${BASE}/${user._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 404 for non-existent tutor", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`${BASE}/${fakeId}`);
    expect(res.status).toBe(404);
  });
});

// ─── GET /api/tutors/:id/booked-slots ────────────────────────────────────────

describe(`GET ${BASE}/:id/booked-slots`, () => {
  it("should return booked slots (public)", async () => {
    const { user } = await createTestUser({ role: "tutor", email: `slots_${Date.now()}@test.com` });
    const res = await request(app).get(`${BASE}/${user._id}/booked-slots`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─── DELETE /api/tutors/courses/:courseId ────────────────────────────────────

describe(`DELETE ${BASE}/courses/:courseId`, () => {
  it("should return 401 without token", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).delete(`${BASE}/courses/${fakeId}`);
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/tutors/upload-content ────────────────────────────────────────

describe(`POST ${BASE}/upload-content`, () => {
  it("should return 400 when no file uploaded", async () => {
    const { token } = await createTestUser({ role: "tutor", email: `upload_${Date.now()}@test.com` });
    const res = await request(app)
      .post(`${BASE}/upload-content`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/No file uploaded/i);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).post(`${BASE}/upload-content`);
    expect(res.status).toBe(401);
  });
});
