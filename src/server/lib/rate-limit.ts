/**
 * Rate limiting module for Ordolix.
 *
 * Uses @upstash/ratelimit with Redis when configured, and falls back to an
 * in-memory sliding window rate limiter for development without Redis.
 *
 * Two tiers:
 * - **browser**: 300 requests per minute (sliding window) for browser sessions
 * - **api**: 600 requests per minute for API token requests
 *
 * @module rate-limit
 */

import { browserRateLimiter, apiRateLimiter } from "./redis";
import { logger } from "./logger";

/** Result from a rate limit check */
export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the rate limit resets */
  reset: number;
}

/** Rate limit type determines the limit tier */
export type RateLimitType = "browser" | "api";

/** Configuration for each rate limit tier */
const RATE_LIMIT_CONFIG: Record<RateLimitType, { maxRequests: number; windowMs: number }> = {
  browser: { maxRequests: 300, windowMs: 60_000 },
  api: { maxRequests: 600, windowMs: 60_000 },
};

// ── In-Memory Fallback ──────────────────────────────────────────────────────

interface WindowEntry {
  timestamps: number[];
}

const inMemoryStore = new Map<string, WindowEntry>();

/**
 * In-memory sliding window rate limiter used when Redis is not configured.
 * Not suitable for production (single-process only, no persistence).
 */
function checkInMemoryRateLimit(
  identifier: string,
  type: RateLimitType,
): RateLimitResult {
  const config = RATE_LIMIT_CONFIG[type];
  const key = `${type}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = inMemoryStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    inMemoryStore.set(key, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  const remaining = Math.max(0, config.maxRequests - entry.timestamps.length);
  const reset = now + config.windowMs;

  if (entry.timestamps.length >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset,
    };
  }

  entry.timestamps.push(now);

  return {
    success: true,
    limit: config.maxRequests,
    remaining: remaining - 1,
    reset,
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Checks whether a request from the given identifier is within the rate limit.
 *
 * @param identifier - Unique identifier for the client (IP address or API token hash)
 * @param type - The rate limit tier: "browser" (300/min) or "api" (600/min)
 * @returns Rate limit result indicating success, remaining quota, and reset time
 *
 * @example
 * ```ts
 * const result = await checkRateLimit("192.168.1.1", "browser");
 * if (!result.success) {
 *   return new Response("Too Many Requests", { status: 429 });
 * }
 * ```
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType,
): Promise<RateLimitResult> {
  const limiter = type === "browser" ? browserRateLimiter : apiRateLimiter;

  if (!limiter) {
    logger.debug(
      { identifier, type },
      "Redis not configured — using in-memory rate limiter",
    );
    return checkInMemoryRateLimit(identifier, type);
  }

  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Resets the in-memory rate limit store. Useful for testing.
 * Has no effect on Redis-backed rate limits.
 */
export function resetInMemoryStore(): void {
  inMemoryStore.clear();
}
