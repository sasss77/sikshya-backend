import request from "supertest";
import mongoose from "mongoose";
import app from "../../app";
import { createTestUser } from "../helpers/auth.helper";

const BASE = "/api/v1/admin/users";

// Helper: create admin token
const getAdminToken = async () => {
  const { token } = await createTestUser({
    email: `admin_${Date.now()}@test.com`,
    role: "admin",
    isVerifiedAdmin: true,
  });
  return token;
};

// ─── GET /api/v1/admin/users ─────────────────────────────────────────────────

describe(`GET ${BASE}`, () => {
  it("should return paginated list of users for admin", async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.meta).toBeDefined();
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it("should return 403 for non-admin user", async () => {
    const { token } = await createTestUser({ role: "student" });
    const res = await request(app).get(BASE).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("should support search query param", async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(`${BASE}?search=test&page=1&limit=5`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("should support role filter query param", async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(`${BASE}?role=student`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/v1/admin/users ─────────────────────────────────────────────────

describe(`POST ${BASE}`, () => {
  it("should create a new user", async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({
        fullName: "New Admin User",
        email: `newuser_${Date.now()}@test.com`,
        role: "student",
        password: "Password1!",
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullName).toBe("New Admin User");
  });

  it("should return 400 for duplicate email", async () => {
    const token = await getAdminToken();
    const email = `dup_${Date.now()}@test.com`;
    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "User1", email, role: "student", password: "Password1!" });
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "User2", email, role: "student", password: "Password1!" });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/v1/admin/users/:id ─────────────────────────────────────────────

describe(`GET ${BASE}/:id`, () => {
  it("should return a user by ID", async () => {
    const token = await getAdminToken();
    const { user } = await createTestUser({ email: `byid_${Date.now()}@test.com` });
    const res = await request(app)
      .get(`${BASE}/${user._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id.toString()).toBe(user._id.toString());
  });

  it("should return 404 for non-existent user", async () => {
    const token = await getAdminToken();
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`${BASE}/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/v1/admin/users/:id ───────────────────────────────────────────

describe(`PATCH ${BASE}/:id`, () => {
  it("should update a user's fullName", async () => {
    const token = await getAdminToken();
    const { user } = await createTestUser({ email: `patch_${Date.now()}@test.com` });
    const res = await request(app)
      .patch(`${BASE}/${user._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Patched Name" });
    expect(res.status).toBe(200);
    expect(res.body.data.fullName).toBe("Patched Name");
  });
});

// ─── DELETE /api/v1/admin/users/:id ──────────────────────────────────────────

describe(`DELETE ${BASE}/:id`, () => {
  it("should delete a user successfully", async () => {
    const token = await getAdminToken();
    const { user } = await createTestUser({ email: `delete_${Date.now()}@test.com` });
    const res = await request(app)
      .delete(`${BASE}/${user._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 404 for non-existent user", async () => {
    const token = await getAdminToken();
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .delete(`${BASE}/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ─── GET /api/v1/admin/users/stats ───────────────────────────────────────────

describe(`GET ${BASE}/stats`, () => {
  it("should return admin statistics", async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(`${BASE}/stats`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("totalUsers");
    expect(res.body.data).toHaveProperty("totalStudents");
    expect(res.body.data).toHaveProperty("totalTutors");
  });
});

// ─── GET /api/v1/admin/users/requests ────────────────────────────────────────

describe(`GET ${BASE}/requests`, () => {
  it("should return admin verification requests", async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(`${BASE}/requests`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─── PATCH /api/v1/admin/users/:id/verify-admin ──────────────────────────────

describe(`PATCH ${BASE}/:id/verify-admin`, () => {
  it("should verify an admin user", async () => {
    const token = await getAdminToken();
    const { user } = await createTestUser({
      email: `verifyadmin_${Date.now()}@test.com`,
      role: "admin",
      isVerifiedAdmin: false,
    });
    const res = await request(app)
      .patch(`${BASE}/${user._id}/verify-admin`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verified/i);
  });

  it("should return 400 when user is not an admin", async () => {
    const token = await getAdminToken();
    const { user } = await createTestUser({
      email: `notadmin_${Date.now()}@test.com`,
      role: "student",
    });
    const res = await request(app)
      .patch(`${BASE}/${user._id}/verify-admin`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/v1/admin/users/courses ─────────────────────────────────────────

describe(`GET ${BASE}/courses`, () => {
  it("should return all courses (empty initially)", async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(`${BASE}/courses`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─── POST /api/v1/admin/users/notifications/send ─────────────────────────────

describe(`POST ${BASE}/notifications/send`, () => {
  it("should send notifications to all users", async () => {
    const token = await getAdminToken();
    // ensure there's at least one user (admin)
    const res = await request(app)
      .post(`${BASE}/notifications/send`)
      .set("Authorization", `Bearer ${token}`)
      .send({ audience: "all", title: "Test", message: "Hello everyone" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 404 when no matching users for audience", async () => {
    const token = await getAdminToken();
    const fakeUserId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`${BASE}/notifications/send`)
      .set("Authorization", `Bearer ${token}`)
      .send({ audience: fakeUserId, title: "T", message: "M" });
    expect(res.status).toBe(404);
  });
});
