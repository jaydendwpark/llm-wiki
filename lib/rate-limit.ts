/**
 * Simple in-memory rate limiter.
 * For production, replace with Upstash Redis or similar distributed store.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Window size in milliseconds */
  windowMs: number;
  /** Max requests per window */
  max: number;
}

/**
 * Check rate limit for a given key (e.g. IP address).
 * Returns { allowed: true } or { allowed: false, retryAfterMs: number }.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (entry.count >= config.max) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true };
}

// Pre-configured limiters
export const LIMITS = {
  upload: { windowMs: 60_000, max: 10 },
  ingest: { windowMs: 60_000, max: 5 },
  query:  { windowMs: 60_000, max: 10 },
  lint:   { windowMs: 60_000, max: 3 },
  tasks:  { windowMs: 60_000, max: 30 },
} satisfies Record<string, RateLimitConfig>;
