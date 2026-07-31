import fs from "fs";
import path from "path";

const TMP_FILE = path.join(process.cwd(), ".mongo-test-uri.tmp");

export default async function globalTeardown() {
  const mongod = (globalThis as any).__MONGOD__;
  if (mongod) {
    await mongod.stop();
  }
  // Clean up temp file
  if (fs.existsSync(TMP_FILE)) {
    fs.unlinkSync(TMP_FILE);
  }
}
