import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { TEST_DATABASE_URL } from "../playwright.config";

/**
 * Brings the test database to a known state before the tests run:
 * apply migrations, then load the same demo data as `npm run db:seed`.
 */
export default function globalSetup() {
  if (!TEST_DATABASE_URL.includes("test")) {
    throw new Error("Refusing to reset a database whose name does not contain 'test'.");
  }
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
  execSync("npx prisma db seed", { env, stdio: "inherit" });
  rmSync("./storage/e2e-uploads", { recursive: true, force: true });
}
