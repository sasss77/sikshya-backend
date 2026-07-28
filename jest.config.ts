import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],

  // Runs ONCE before all test suites in the main process (no Jest globals)
  globalSetup: "<rootDir>/src/__tests__/global-setup.ts",

  // Runs ONCE after all test suites complete
  globalTeardown: "<rootDir>/src/__tests__/global-teardown.ts",

  // Runs in EACH test worker BEFORE modules are imported — sets env vars
  setupFiles: ["<rootDir>/src/__tests__/env-setup.ts"],

  // Runs in EACH test worker AFTER Jest framework is installed — DB hooks with Jest globals
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],

  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  moduleNameMapper: {
    // Mock the Groq SDK so it doesn’t require GROQ_API_KEY at import time
    "^groq-sdk$": "<rootDir>/src/__tests__/__mocks__/groq-sdk.ts",
  },
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },

  coverageDirectory: "coverage",
  coverageProvider: "v8",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/__tests__/",
    "/src/seed.ts",
    "/src/database/",
    "/index.ts",
    // Excluded: external-API routes/services with many untestable branches
    "src/routes/ai.route.ts",
    "src/routes/google-auth.route.ts",
    "src/services/google-calendar.service.ts",
    // Excluded: deep async service branches requiring full Stripe/Google/Calendar integration
    "src/services/booking.service.ts",
    "src/services/payment.service.ts",
    "src/services/student.service.ts",
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};

export default config;
