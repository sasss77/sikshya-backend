import request from "supertest";
import app from "../../app";
import { createTestUser } from "../helpers/auth.helper";
import mongoose from "mongoose";
import { BookingModel } from "../../models/booking.model";
import { EnrollmentModel } from "../../models/enrollment.model";
import { TutorProfileModel } from "../../models/tutor-profile.model";

const BASE = "/api/bookings";

// ─── POST /api/bookings ───────────────────────────────────────────────────────

describe(`POST ${BASE}`, () => {
  it("should return 401 without auth token", async () => {
    const res = await request(app).post(BASE).send({});
    expect(res.status).toBe(401);
  });

  it("should return 403 for non-verified student", async () => {
    const { token } = await createTestUser({ role: "student", isVerifiedStudent: false });
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ tutorId: new mongoose.Types.ObjectId(), subject: "Math", day: "Mon", time: "10:00 AM", price: 500 });
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/bookings ───────────────────────────────────────────────────────

describe(`GET ${BASE}`, () => {
  it("should return 200 with bookings list for student", async () => {
    const { user, token } = await createTestUser({ role: "student" });
    const tutor = await createTestUser({ role: "tutor" });
    await BookingModel.create({
      studentId: user._id,
      tutorId: tutor.user._id,
      subject: "Math",
      day: "Mon",
      time: "10:00 AM",
      price: 500,
      priceUSD: 5,
    });
    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 200 with bookings list for tutor", async () => {
    const { token } = await createTestUser({ role: "tutor" });
    const res = await request(app).get(BASE).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/bookings/:id/status ─────────────────────────────────────────

describe(`PATCH ${BASE}/:id/status`, () => {
  it("should return 401 without token", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`${BASE}/${fakeId}/status`)
      .send({ status: "upcoming" });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/bookings/learnings ─────────────────────────────────────────────

describe(`GET ${BASE}/learnings`, () => {
  it("should return learnings for a student", async () => {
    const { user, token } = await createTestUser({ role: "student" });
    const tutor = await createTestUser({ role: "tutor" });
    await EnrollmentModel.create({
      studentId: user._id,
      tutorId: tutor.user._id,
      subject: "Math",
      totalSessions: 5,
      nextSession: "Mon",
      topics: [],
    });
    const res = await request(app)
      .get(`${BASE}/learnings`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get(`${BASE}/learnings`);
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/bookings/learnings/:enrollmentId/topic ───────────────────────

describe(`PATCH ${BASE}/learnings/:enrollmentId/topic`, () => {
  it("should return 400 if topicIndex or done is missing", async () => {
    const { token } = await createTestUser({ role: "student" });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`${BASE}/learnings/${fakeId}/topic`)
      .set("Authorization", `Bearer ${token}`)
      .send({ topicIndex: "abc", done: "yes" }); // wrong types
    expect(res.status).toBe(400);
  });

  it("should return 401 without token", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`${BASE}/learnings/${fakeId}/topic`)
      .send({ topicIndex: 0, done: true });
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/bookings/enroll ───────────────────────────────────────────────

describe(`POST ${BASE}/enroll`, () => {
  it("should return 401 without token", async () => {
    const res = await request(app).post(`${BASE}/enroll`).send({});
    expect(res.status).toBe(401);
  });

  it("should return 400 if tutorId or courseId missing", async () => {
    const { token } = await createTestUser({ role: "student", isVerifiedStudent: true });
    const res = await request(app)
      .post(`${BASE}/enroll`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/tutorId and courseId/i);
  });
});

// ─── GET /api/bookings/learnings/:enrollmentId ───────────────────────────────

describe(`GET ${BASE}/learnings/:enrollmentId`, () => {
  it("should return 401 without token", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`${BASE}/learnings/${fakeId}`);
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/bookings/learnings/:enrollmentId/module ──────────────────────

describe(`PATCH ${BASE}/learnings/:enrollmentId/module`, () => {
  it("should return 400 if moduleTitle or totalModules missing", async () => {
    const { token } = await createTestUser({ role: "student" });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`${BASE}/learnings/${fakeId}/module`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("should return 401 without token", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`${BASE}/learnings/${fakeId}/module`)
      .send({ moduleTitle: "Intro", totalModules: 3 });
    expect(res.status).toBe(401);
  });
});
