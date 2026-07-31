import { MongoMemoryServer } from "mongodb-memory-server";
import fs from "fs";
import path from "path";

// Temp file to share the URI with test workers
const TMP_FILE = path.join(process.cwd(), ".mongo-test-uri.tmp");

export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Write the URI to a temp file so test workers can read it
  fs.writeFileSync(TMP_FILE, uri, "utf-8");

  // Store on globalThis so globalTeardown can access it (same process)
  (globalThis as any).__MONGOD__ = mongod;
}
