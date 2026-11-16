import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 reads the database URL for its command-line tools (migrate, seed,
// studio) from this file. The running app does not: it connects through the
// pg adapter in src/lib/db.ts, which always uses DATABASE_URL.
//
// DIRECT_URL, when set, is used here instead of DATABASE_URL. That allows
// the app to run through a transaction-mode pooler (such as Supabase's
// transaction pooler on port 6543, the right choice for serverless hosts)
// while migrations, which need a session-level connection for their
// advisory lock, use the session pooler or a direct connection.
//
// `prisma generate` (run on every `npm install`) does not need a database,
// so a missing DATABASE_URL falls back to a placeholder instead of failing
// the install. Commands that do connect (migrate, seed, studio) will then
// report that they cannot reach "database-url-not-set", which points at
// the fix: copy .env.example to .env, or set DATABASE_URL for that command.
const url =
  process.env.DIRECT_URL ??
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
