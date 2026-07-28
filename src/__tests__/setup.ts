import mongoose from "mongoose";
import fs from "fs";
import path from "path";

/**
 * This file runs in EACH test worker AFTER the Jest framework is installed.
 * Jest globals (beforeAll, afterAll, afterEach, expect) are available here.
 *
 * Environment variables are set in env-setup.ts (via "setupFiles" config),
 * which runs BEFORE module imports.
 *
 * The MongoMemoryServer URI is read from a temp file written by global-setup.ts.
 */

const TMP_FILE = path.join(process.cwd(), ".mongo-test-uri.tmp");

beforeAll(async () => {
  const uri = fs.readFileSync(TMP_FILE, "utf-8");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});
