import request from "supertest";
import app from "../../app";
import { createTestUser } from "../helpers/auth.helper";

const BASE = "/api/payments";

// ─── POST /api/payments/create-checkout-session ───────────────────────────────

describe(`POST ${BASE}/create-checkout-session`, () => {
  it("should return 401 without token", async () => {
    const res = await request(app)
      .post(`${BASE}/create-checkout-session`)
      .send({});
    expect(res.status).toBe(401);
  });

  it("should return 403 for non-verified student", async () => {
    const { token } = await createTestUser({
      role: "student",
      isVerifiedStudent: false,
      email: `pay_notvs_${Date.now()}@test.com`,
    });
    const res = await request(app)
      .post(`${BASE}/create-checkout-session`)
      .set("Authorization", `Bearer ${token}`)
      .send({ tutorId: "fakeid", subject: "Math", day: "Mon", time: "10:00 AM" });
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/payments/webhook ───────────────────────────────────────────────

describe(`POST ${BASE}/webhook`, () => {
  it("should return 400 when stripe-signature header is missing", async () => {
    const res = await request(app)
      .post(`${BASE}/webhook`)
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({ type: "checkout.session.completed" })));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/stripe-signature/i);
  });
});

// ─── GET /api/payments/session/:sessionId ─────────────────────────────────────

describe(`GET ${BASE}/session/:sessionId`, () => {
  it("should return 401 without token", async () => {
    const res = await request(app).get(`${BASE}/session/sess_fake123`);
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/payments/create-payment-intent ────────────────────────────────

describe(`POST ${BASE}/create-payment-intent`, () => {
  it("should return 401 without token", async () => {
    const res = await request(app)
      .post(`${BASE}/create-payment-intent`)
      .send({});
    expect(res.status).toBe(401);
  });

  it("should return 403 for non-verified student", async () => {
    const { token } = await createTestUser({
      role: "student",
      isVerifiedStudent: false,
      email: `pay_intent_${Date.now()}@test.com`,
    });
    const res = await request(app)
      .post(`${BASE}/create-payment-intent`)
      .set("Authorization", `Bearer ${token}`)
      .send({ tutorId: "fakeid", subject: "Math", day: "Mon", time: "10:00 AM" });
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/payments/confirm-booking ──────────────────────────────────────

describe(`POST ${BASE}/confirm-booking`, () => {
  it("should return 401 without token", async () => {
    const res = await request(app)
      .post(`${BASE}/confirm-booking`)
      .send({});
    expect(res.status).toBe(401);
  });

  it("should return 400 when paymentIntentId is missing", async () => {
    const { token } = await createTestUser({
      role: "student",
      email: `pay_confirm_${Date.now()}@test.com`,
    });
    const res = await request(app)
      .post(`${BASE}/confirm-booking`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/paymentIntentId/i);
  });
});
