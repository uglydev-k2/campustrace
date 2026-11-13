import "server-only";
import { db } from "@/lib/db";

/**
 * Fixed-window rate limiting backed by the `RateLimit` table.
 *
 * One SQL statement increments the window counter (or starts a new window
 * when the old one has expired) and returns the new count, so concurrent
 * requests cannot both squeeze under the limit. Because the counter lives in
 * PostgreSQL it holds across server instances and restarts, which matters on
 * serverless hosts where an in-memory counter would be per instance.
 *
 * Keys are namespaced by the caller, e.g. "login:email:kofi@…" or
 * "login:ip:203.0.113.9". Expired rows are cleaned up opportunistically.
 */
export type Limit = { limit: number; windowMs: number };

export const LIMITS = {
  /** Failed sign-ins for one email address. */
  loginPerEmail: { limit: 8, windowMs: 10 * 60 * 1000 },
  /** Failed sign-ins from one address, whichever emails it tries. */
  loginPerIp: { limit: 40, windowMs: 10 * 60 * 1000 },
  /** New accounts from one address. */
  registerPerIp: { limit: 10, windowMs: 60 * 60 * 1000 },
} satisfies Record<string, Limit>;

/** Counts one hit against `key` and reports whether it is still within the limit. */
export async function consume(key: string, { limit, windowMs }: Limit): Promise<boolean> {
  const windowSeconds = windowMs / 1000;
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, NOW() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN 1
                       ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= NOW()
                       THEN NOW() + make_interval(secs => ${windowSeconds})
                       ELSE "RateLimit"."resetAt" END
    RETURNING "count"
  `;
  const count = Number(rows[0]?.count ?? 1);
  // Roughly one call in a hundred sweeps out rows whose window has ended.
  if (Math.random() < 0.01) {
    void db.rateLimit.deleteMany({ where: { resetAt: { lte: new Date() } } }).catch(() => {});
  }
  return count <= limit;
}

/** True when `key` has already used up its window, without counting a hit. */
export async function isBlocked(key: string, { limit }: Limit): Promise<boolean> {
  const row = await db.rateLimit.findUnique({ where: { key } });
  return row !== null && row.resetAt > new Date() && row.count >= limit;
}

/** Clears a key, e.g. the per-email counter after a successful sign-in. */
export async function clear(key: string): Promise<void> {
  await db.rateLimit.deleteMany({ where: { key } });
}

/**
 * The client's address as the platform reports it. Behind Vercel or a
 * reverse proxy that is the first entry of X-Forwarded-For; otherwise there
 * is no reliable address and every caller shares one bucket.
 */
export function clientAddress(headers: Headers | Record<string, string | undefined> | undefined): string {
  const get = (name: string) =>
    headers instanceof Headers ? headers.get(name) : headers?.[name] ?? headers?.[name.toLowerCase()];
  const forwarded = get("x-forwarded-for") ?? get("x-real-ip") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  return first && first.length <= 64 ? first : "unknown";
}
