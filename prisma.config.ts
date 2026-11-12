import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 reads the database URL from this file (not from schema.prisma).
//
// `prisma generate` (run on every `npm install`) does not need a database,
// so a missing DATABASE_URL falls back to a placeholder instead of failing
// the install. Commands that do connect (migrate, seed, studio) will then
// report that they cannot reach "database-url-not-set", which points at
// the fix: copy .env.example to .env, or set DATABASE_URL for that command.
const url =
  process.env.DATABASE_URL ??
  "postgresql://campustrace:campustrace@database-url-not-set:5432/campustrace";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url },
});
