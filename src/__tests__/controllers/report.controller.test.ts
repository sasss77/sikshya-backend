import request from "supertest";
import app from "../../app";
import { createTestUser } from "../helpers/auth.helper";
import mongoose from "mongoose";
import { ReportModel } from "../../models/report.model";

const BASE = "/api/reports";

// ─── POST /api/reports ────────────────────────────────────────────────────────

describe(`POST ${BASE}`, () => {
  it("should create a report successfully", async () => {
    const { token } = await createTestUser({
      role: "student",
      email: `reporter_${Date.now()}@test.com`,
    });
    const { user: reported } = await createTestUser({
      role: "tutor",
      email: `reported_${Date.now()}@test.com`,
    });
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({
        reportedUserId: reported._id.toString(),
        reason: "Inappropriate behavior",
        details: "The tutor was rude during the session",
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/submitted/i);
  });

  it("should return 400 if reportedUserId is missing", async () => {
    const { token } = await createTestUser({
      role: "student",
      email: `reporter2_${Date.now()}@test.com`,
    });
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "Harassment" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Missing required fields/i);
  });

  it("should return 400 if reason is missing", async () => {
    const { token } = await createTestUser({
      role: "student",
      email: `reporter3_${Date.now()}@test.com`,
    });
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ reportedUserId: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(400);
  });

  it("should return 401 without token", async () => {
    const res = await request(app).post(BASE).send({});
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/reports/admin (Admin only) ──────────────────────────────────────

describe(`GET ${BASE}/admin`, () => {
  it("should return 401 without token", async () => {
    const res = await request(app).get(`${BASE}/admin`);
    expect(res.status).toBe(401);
  });

  it("should return reports for admin", async () => {
    const { token } = await createTestUser({
      role: "admin",
      isVerifiedAdmin: true,
      email: `adminreport_${Date.now()}@test.com`,
    });
    const res = await request(app)
      .get(`${BASE}/admin`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should support pagination", async () => {
    const { token } = await createTestUser({
      role: "admin",
      isVerifiedAdmin: true,
      email: `adminreport2_${Date.now()}@test.com`,
    });
    const res = await request(app)
      .get(`${BASE}/admin?page=1&limit=5`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toBeDefined();
  });
});

// ─── PATCH /api/reports/admin/:id ───────────────────────────────────────────

describe(`PATCH ${BASE}/admin/:id`, () => {
  it("should return 400 for invalid status", async () => {
    const { token } = await createTestUser({
      role: "admin",
      isVerifiedAdmin: true,
      email: `adminpatch_${Date.now()}@test.com`,
    });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`${BASE}/admin/${fakeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "invalid-status" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid status/i);
  });

  it("should update report status to reviewed", async () => {
    const { user: reporter, token: adminToken } = await createTestUser({
      role: "admin",
      isVerifiedAdmin: true,
      email: `adminupd_${Date.now()}@test.com`,
    });
    const { user: reported } = await createTestUser({
      role: "tutor",
      email: `reportedupd_${Date.now()}@test.com`,
    });
    const report = await ReportModel.create({
      reporterId: reporter._id,
      reportedUserId: reported._id,
      reason: "Misconduct",
      status: "pending",
    });
    const res = await request(app)
      .patch(`${BASE}/admin/${report._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "reviewed" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("reviewed");
  });

  it("should return 404 for non-existent report", async () => {
    const { token } = await createTestUser({
      role: "admin",
      isVerifiedAdmin: true,
      email: `admin404_${Date.now()}@test.com`,
    });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`${BASE}/admin/${fakeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "resolved" });
    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`${BASE}/admin/${fakeId}`)
      .send({ status: "resolved" });
    expect(res.status).toBe(401);
  });
});
