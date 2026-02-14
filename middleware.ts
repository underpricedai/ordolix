/**
 * Next.js Edge Middleware.
 *
 * Runs on every matched request. Applies:
 * 1. Correlation ID (X-Correlation-ID) — extract from header or generate
 * 2. Rate limiting — 300 req/min browser, 600 req/min API token
 * 3. Security headers
 *
 * Skips rate limiting for static assets and auth routes (handled by matcher).
 *
 * @module middleware
 */

import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Correlation ID ──────────────────────────────────────────────────────────

const CORRELATION_HEADER = "X-Correlation-ID";

function getCorrelationId(request: NextRequest): string {
  const existing = request.headers.get(CORRELATION_HEADER);
  return existing?.trim() || crypto.randomUUID();
}

// ── Rate Limiting (Edge-compatible) ─────────────────────────────────────────

/**
 * Lazily initializes rate limiters. Returns null if Redis is not configured
 * (e.g., in development without Upstash credentials).
 */
function createRateLimiters() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const redis = new Redis({ url, token });

  return {
    browser: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(300, "1 m"),
      prefix: "ratelimit:browser",
    }),
    api: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(600, "1 m"),
      prefix: "ratelimit:api",
    }),
  };
}

let rateLimiters: ReturnType<typeof createRateLimiters> | undefined;

function getRateLimiters() {
  if (rateLimiters === undefined) {
    rateLimiters = createRateLimiters();
  }
  return rateLimiters;
}

/**
 * Extracts the client identifier for rate limiting.
 *
 * If the request has an Authorization header with a Bearer token,
 * it is treated as an API request. Otherwise, uses the client IP.
 */
function extractRateLimitIdentifier(request: NextRequest): {
  identifier: string;
  type: "browser" | "api";
} {
  const authHeader = request.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    // Hash-like identifier from the token (use first 32 chars to avoid storing full token)
    const token = authHeader.slice(7);
    const truncated = token.slice(0, 32);
    return { identifier: `api:${truncated}`, type: "api" };
  }

  // Use IP address for browser clients
  const forwarded = request.headers.get("X-Forwarded-For");
  const realIp = request.headers.get("X-Real-IP");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";
  return { identifier: `ip:${ip}`, type: "browser" };
}

// ── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  // 1. Correlation ID
  const correlationId = getCorrelationId(request);

  // 2. Rate limiting
  const limiters = getRateLimiters();

  if (limiters) {
    const { identifier, type } = extractRateLimitIdentifier(request);
    const limiter = type === "api" ? limiters.api : limiters.browser;
    const result = await limiter.limit(identifier);

    if (!result.success) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

      return new NextResponse(
        JSON.stringify({
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
          requestId: correlationId,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.max(1, retryAfter)),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.reset),
            [CORRELATION_HEADER]: correlationId,
          },
        },
      );
    }

    // Attach rate limit headers to successful responses
    const response = NextResponse.next();

    // Security headers
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );

    // Correlation ID
    response.headers.set(CORRELATION_HEADER, correlationId);

    // Rate limit info
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.reset));

    return response;
  }

  // No rate limiter configured — still apply security headers and correlation ID
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  // Correlation ID
  response.headers.set(CORRELATION_HEADER, correlationId);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - api/auth (Auth.js handles its own security)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/auth).*)",
  ],
};
