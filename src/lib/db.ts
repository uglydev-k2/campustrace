import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * One Prisma client for the whole server process.
 *
 * In development Next.js reloads modules on every edit. Without the
 * `globalThis` cache each reload would open a new connection pool and
 * PostgreSQL would eventually refuse connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

/** The client type available inside `db.$transaction(async (tx) => ...)`. */
export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];
