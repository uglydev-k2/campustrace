import "server-only";

/**
 * A small fixed-window rate limiter kept in memory.
 *
 * Good enough for one server process (local development, a single small
 * server). It resets on restart and is not shared between instances, so a
 * multi-instance deployment needs a shared store such as Redis instead.
 * See docs/deployment.md.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }

  reset(key: string) {
    this.hits.delete(key);
  }
}

export const loginLimiter = new RateLimiter(8, 10 * 60 * 1000);
