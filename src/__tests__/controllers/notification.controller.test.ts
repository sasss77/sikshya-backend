import request from "supertest";
import app from "../../app";
import { createTestUser } from "../helpers/auth.helper";
import mongoose from "mongoose";
import { NotificationModel } from "../../models/notification.model";
import { BookingModel } from "../../models/booking.model";

const BASE = "/api/notifications";

// ─── GET /api/notifications ───────────────────────────────────────────────────

describe(`GET ${BASE}`, () => {
  it("should return notifications for logged-in user", async () => {
    const { user, token } = await createTestUser({
      role: "student",
      email: `notifget_${Date.now()}@test.com`,
    });
    await NotificationModel.create({
      userId: user._id,
      type: "system",
      title: "Hello",
      message: "Test notification",
    });
    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────

describe(`PATCH ${BASE}/:id/read`, () => {
  it("should mark a notification as read", async () => {
    const { user, token } = await createTestUser({
      role: "student",
      email: `notifread_${Date.now()}@test.com`,
    });
    const notif = await NotificationModel.create({
      userId: user._id,
      type: "booking",
      title: "New Booking",
      message: "You have a session",
    });
    const res = await request(app)
      .patch(`${BASE}/${notif._id}/read`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/marked as read/i);
  });

  it("should return 401 without token", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).patch(`${BASE}/${fakeId}/read`);
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

describe(`PATCH ${BASE}/read-all`, () => {
  it("should mark all notifications as read", async () => {
    const { user, token } = await createTestUser({
      role: "student",
      email: `notifreadall_${Date.now()}@test.com`,
    });
    await NotificationModel.create([
      { userId: user._id, type: "system", title: "N1", message: "M1" },
      { userId: user._id, type: "system", title: "N2", message: "M2" },
    ]);
    const res = await request(app)
      .patch(`${BASE}/read-all`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/all notifications marked as read/i);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).patch(`${BASE}/read-all`);
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/notifications/clear ─────────────────────────────────────────

describe(`DELETE ${BASE}/clear-all`, () => {
  it("should clear all notifications for user", async () => {
    const { user, token } = await createTestUser({
      role: "student",
      email: `notifclear_${Date.now()}@test.com`,
    });
    await NotificationModel.create({
      userId: user._id,
      type: "system",
      title: "Old",
      message: "To be cleared",
    });
    const res = await request(app)
      .delete(`${BASE}/clear-all`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cleared/i);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).delete(`${BASE}/clear-all`);
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/notifications/my-students ──────────────────────────────────────

describe(`GET ${BASE}/my-students`, () => {
  it("should return students for a tutor", async () => {
    const { user: tutor, token } = await createTestUser({
      role: "tutor",
      email: `tutorstudents_${Date.now()}@test.com`,
    });
    const { user: student } = await createTestUser({
      role: "student",
      email: `studentfortut_${Date.now()}@test.com`,
    });
    // Create an upcoming booking
    await BookingModel.create({
      studentId: student._id,
      tutorId: tutor._id,
      subject: "Math",
      day: "Mon",
      time: "10:00 AM",
      price: 500,
      priceUSD: 5,
      status: "upcoming",
    });
    const res = await request(app)
      .get(`${BASE}/my-students`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get(`${BASE}/my-students`);
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/notifications/send ────────────────────────────────────────────

describe(`POST ${BASE}/send`, () => {
  it("should return 401 without token", async () => {
    const res = await request(app).post(`${BASE}/send`).send({});
    expect(res.status).toBe(401);
  });
});
