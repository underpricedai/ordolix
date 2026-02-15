import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("Upstash Redis not configured — caching and rate limiting will use in-memory fallbacks");
    return null;
  }

  return new Redis({ url, token });
}

export const redis = createRedisClient();

/** 300 requests per minute for browser clients */
export const browserRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(300, "1 m"),
      prefix: "ratelimit:browser",
    })
  : null;

/** 600 requests per minute for API token clients */
export const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(600, "1 m"),
      prefix: "ratelimit:api",
    })
  : null;
