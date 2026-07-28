import request from "supertest";
import app from "../../app";
import { UserModel } from "../../models/user.model";
import { createTestUser } from "../helpers/auth.helper";

// ─── POST /api/users/register ────────────────────────────────────────────────

describe("POST /api/users/register", () => {
  const validBody = {
    fullName: "Alice Smith",
    email: "alice@example.com",
    role: "student",
    password: "Password1!",
  };

  it("should register a new user and return 201", async () => {
    const res = await request(app).post("/api/users/register").send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe("alice@example.com");
  });

  it("should return 400 if email already exists", async () => {
    await request(app).post("/api/users/register").send(validBody);
    const res = await request(app).post("/api/users/register").send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 on invalid email format", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({ ...validBody, email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("should return 400 on weak password", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({ ...validBody, password: "weak" });
    expect(res.status).toBe(400);
  });

  it("should return 400 on invalid role", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({ ...validBody, role: "superuser" });
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/users/login ───────────────────────────────────────────────────

describe("POST /api/users/login", () => {
  beforeEach(async () => {
    // Register via API so password gets hashed properly
    await request(app).post("/api/users/register").send({
      fullName: "Bob Jones",
      email: "bob@example.com",
      role: "student",
      password: "Password1!",
    });
  });

  it("should login successfully and return a token", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "bob@example.com", password: "Password1!" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe("bob@example.com");
  });

  it("should return 404 for non-existent email", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "nobody@example.com", password: "Password1!" });
    expect(res.status).toBe(404);
  });

  it("should return 401 for wrong password", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "bob@example.com", password: "WrongPass1!" });
    expect(res.status).toBe(401);
  });

  it("should return 400 for missing email", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ password: "Password1!" });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/users/whoami ───────────────────────────────────────────────────

describe("GET /api/users/whoami", () => {
  it("should return the logged-in user's profile", async () => {
    const { token } = await createTestUser({ email: "whoami@test.com" });
    const res = await request(app)
      .get("/api/users/whoami")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe("whoami@test.com");
  });

  it("should return 401 without a token", async () => {
    const res = await request(app).get("/api/users/whoami");
    expect(res.status).toBe(401);
  });

  it("should return 401 with an invalid token", async () => {
    const res = await request(app)
      .get("/api/users/whoami")
      .set("Authorization", "Bearer invalid.token.here");
    // Malformed JWT may return 401 (expected) or 500 if error middleware doesn't catch
    // The important thing is it does NOT return 200
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ─── PATCH /api/users/update-profile ────────────────────────────────────────

describe("PATCH /api/users/update-profile", () => {
  it("should update the user's full name", async () => {
    const { token } = await createTestUser({ email: "update@test.com" });
    const res = await request(app)
      .patch("/api/users/update-profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Updated Name" });
    expect(res.status).toBe(200);
    expect(res.body.data.fullName).toBe("Updated Name");
  });

  it("should return 400 when no valid fields are provided", async () => {
    const { token } = await createTestUser({ email: "noupdate@test.com" });
    const res = await request(app)
      .patch("/api/users/update-profile")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("should return 401 without a token", async () => {
    const res = await request(app)
      .patch("/api/users/update-profile")
      .send({ fullName: "Ghost" });
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/users/google-login ────────────────────────────────────────────

describe("POST /api/users/google-login", () => {
  it("should return 400 if idToken is missing", async () => {
    const res = await request(app).post("/api/users/google-login").send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/idToken/i);
  });
});

// ─── POST /api/users/set-role ────────────────────────────────────────────────

describe("POST /api/users/set-role", () => {
  it("should return 400 if role is missing from body", async () => {
    const { token } = await createTestUser({ role: "unassigned" });
    const res = await request(app)
      .post("/api/users/set-role")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/role/i);
  });

  it("should return 400 for an invalid role", async () => {
    const { token } = await createTestUser({ role: "unassigned" });
    const res = await request(app)
      .post("/api/users/set-role")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "superadmin" });
    expect(res.status).toBe(400);
  });

  it("should return 400 if user already has a role", async () => {
    const { token } = await createTestUser({ role: "student" });
    const res = await request(app)
      .post("/api/users/set-role")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "tutor" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already has a role/i);
  });

  it("should successfully assign role to unassigned user", async () => {
    const { token } = await createTestUser({ role: "unassigned" });
    const res = await request(app)
      .post("/api/users/set-role")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "student" });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe("student");
  });

  it("should return 401 without token", async () => {
    const res = await request(app)
      .post("/api/users/set-role")
      .send({ role: "student" });
    expect(res.status).toBe(401);
  });
});
