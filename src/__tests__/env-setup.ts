/**
 * env-setup.ts — runs via Jest's "setupFiles" option.
 *
 * This runs in EACH test worker BEFORE any test files or modules are imported.
 * This is the correct place to set environment variables that affect module
 * initialization (e.g., Stripe SDK, Groq SDK, JWT secret).
 *
 * Note: Jest globals (beforeAll, describe, etc.) are NOT available here.
 */

// Auth
process.env.JWT_SECRET = "test_secret_key_for_jest";
process.env.JWT_EXPIRES_IN = "1d";
process.env.ADMIN_EMAIL = "admin@test.com";

// Stripe — dummy key so SDK initializes (no real calls in tests)
process.env.STRIPE_SECRET_KEY = "sk_test_dummy_key_for_jest_tests_only_000000";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_dummy_webhook_secret_00000000";

// Groq — dummy key so SDK initializes (no real calls in tests)
process.env.GROQ_API_KEY = "gsk_dummy_groq_api_key_for_jest_tests_only_00000000";

// Google OAuth
process.env.GOOGLE_CLIENT_ID = "dummy-google-client-id.apps.googleusercontent.com";

// Google Calendar (if needed)
process.env.GOOGLE_CALENDAR_CLIENT_ID = "dummy-cal-client-id";
process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "dummy-cal-secret";
process.env.GOOGLE_CALENDAR_REFRESH_TOKEN = "dummy-refresh-token";

// MongoDB URI — set by global-setup.ts via temp file, read in setup.ts
