import request from "supertest";
import app from "../../app";
import { createTestUser } from "../helpers/auth.helper";
import mongoose from "mongoose";
import { BookingModel } from "../../models/booking.model";
import { ReviewModel } from "../../models/review.model";

const BASE = "/api/reviews";

// ─── POST /api/reviews ────────────────────────────────────────────────────────

describe(`POST ${BASE}`, () => {
  it("should return 401 without token", async () => {
    const res = await request(app).post(BASE).send({});
    expect(res.status).toBe(401);
  });

  it("should create a tutor review", async () => {
    const { user: student, token } = await createTestUser({
      role: "student",
      email: `revs_${Date.now()}@test.com`,
      isVerifiedStudent: true,
    });
    const { user: tutor } = await createTestUser({
      role: "tutor",
      email: `revt_${Date.now()}@test.com`,
    });
    // Create a completed booking
    const booking = await BookingModel.create({
      studentId: student._id,
      tutorId: tutor._id,
      subject: "Math",
      day: "Mon",
      time: "10:00 AM",
      price: 500,
      priceUSD: 5,
      status: "completed",
    });

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({
        tutorId: tutor._id.toString(),
        targetType: "tutor",
        rating: 5,
        reviewText: "Excellent teacher!",
        bookingId: booking._id.toString(),
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ─── GET /api/reviews/tutor/:id ───────────────────────────────────────────────

describe(`GET ${BASE}/tutor/:id`, () => {
  it("should return reviews for a tutor (public)", async () => {
    const { user: tutor } = await createTestUser({
      role: "tutor",
      email: `tutorrev_${Date.now()}@test.com`,
    });
    const res = await request(app).get(`${BASE}/tutor/${tutor._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should support limit query param", async () => {
    const { user: tutor } = await createTestUser({
      role: "tutor",
      email: `tutor_lim_${Date.now()}@test.com`,
    });
    const res = await request(app).get(`${BASE}/tutor/${tutor._id}?limit=5`);
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/reviews/course/:id ─────────────────────────────────────────────

describe(`GET ${BASE}/course/:id`, () => {
  it("should return reviews for a course (public)", async () => {
    const fakeCourseId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`${BASE}/course/${fakeCourseId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
