import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * One Prisma client (and one connection pool) per server process.
 *
 * The client is cached on `globalThis` in every environment:
 * - In development Next.js reloads modules on each edit; without the cache
 *   every reload would open a new pool.
 * - On serverless hosts (Vercel) a warm function instance serves many
 *   requests; without the cache each request could open its own pool.
 *
 * Pool size matters on serverless hosts. Many function instances may run at
 * once and a hosted PostgreSQL pooler admits only a small number of clients
 * (Supabase's session pooler allows 15, for example), so each instance keeps
 * a very small pool and drops idle connections quickly. A long-running server
 * can afford a larger pool. Override with DATABASE_POOL_MAX.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const onServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

function poolSize(): number {
  const configured = Number(process.env.DATABASE_POOL_MAX);
  if (Number.isInteger(configured) && configured > 0) return configured;
  return onServerless ? 2 : 10;
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
  }
  const adapter = new PrismaPg({
    connectionString,
    max: poolSize(),
    // Release idle connections fast so other instances can use them.
    idleTimeoutMillis: onServerless ? 5_000 : 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = db;

/** The client type available inside `db.$transaction(async (tx) => ...)`. */
export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];
