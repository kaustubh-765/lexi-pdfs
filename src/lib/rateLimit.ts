import type { NextRequest } from 'next/server';
import { LRUCache } from 'lru-cache';
import { createLogger } from './logger';

const logger = createLogger('lib.rateLimit');

// One entry per (bucket, key) pair; each entry holds the request timestamps
// (ms) still inside its window. TTL matches the longest window in use so
// idle keys evict themselves instead of growing the cache forever.
const buckets = new LRUCache<string, number[]>({
  max: 10_000,
  ttl: 60 * 60 * 1000,
});

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

/**
 * Fixed-window rate limiter, in-memory only (matches this app's existing
 * single-instance, no-Redis architecture — see src/lib/worker/ingestionWorker.ts
 * for the same tradeoff made deliberately elsewhere). Resets on process
 * restart; not shared across multiple instances. That's an accepted
 * limitation here, not an oversight.
 */
export function checkRateLimit(bucket: string, key: string, limit: number, windowMs: number): RateLimitResult {
  const cacheKey = `${bucket}:${key}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (buckets.get(cacheKey) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    const retryAfterMs = timestamps[0] + windowMs - now;
    logger.warn('rate limit exceeded', { bucket, key, limit, windowMs, retryAfterMs });
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  timestamps.push(now);
  buckets.set(cacheKey, timestamps);
  return { allowed: true, retryAfterMs: 0 };
}

/** Best-effort client IP from proxy headers, falling back to a shared key if absent. */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}
