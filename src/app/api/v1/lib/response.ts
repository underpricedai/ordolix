/**
 * REST API v1 response helpers.
 *
 * Provides consistent JSON response formatting for all API v1 endpoints.
 * All responses follow the format: { data, meta? } for success, or
 * { error: { code, message, details? } } for errors.
 *
 * @module api-v1-response
 */

import { NextResponse } from "next/server";
import type { RateLimitResult } from "@/server/lib/rate-limit";

/** Metadata included in paginated or enriched responses */
export interface ResponseMeta {
  /** Total number of items matching the query */
  total?: number;
  /** Cursor for the next page of results */
  nextCursor?: string | null;
  /** Current correlation/request ID */
  requestId?: string;
  [key: string]: unknown;
}

/** Standard error response body */
export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Adds rate limit headers to a NextResponse.
 *
 * @param response - The response to add headers to
 * @param rateLimit - Rate limit result to include in headers
 * @returns The same response with rate limit headers added
 */
function withRateLimitHeaders(
  response: NextResponse,
  rateLimit?: RateLimitResult,
): NextResponse {
  if (rateLimit) {
    response.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    response.headers.set("X-RateLimit-Reset", String(rateLimit.reset));
  }
  return response;
}

/**
 * Creates a 200 OK response with the given data.
 *
 * @param data - Response payload
 * @param meta - Optional metadata (pagination, totals, etc.)
 * @param rateLimit - Optional rate limit info for headers
 * @returns NextResponse with JSON body
 *
 * @example
 * ```ts
 * return success({ id: "123", name: "My Issue" }, { total: 1 });
 * ```
 */
export function success(
  data: unknown,
  meta?: ResponseMeta,
  rateLimit?: RateLimitResult,
): NextResponse {
  const body = meta ? { data, meta } : { data };
  return withRateLimitHeaders(NextResponse.json(body, { status: 200 }), rateLimit);
}

/**
 * Creates a 201 Created response with the given data.
 *
 * @param data - The created resource
 * @param rateLimit - Optional rate limit info for headers
 * @returns NextResponse with JSON body
 */
export function created(
  data: unknown,
  rateLimit?: RateLimitResult,
): NextResponse {
  return withRateLimitHeaders(
    NextResponse.json({ data }, { status: 201 }),
    rateLimit,
  );
}

/**
 * Creates an error response with the given status code.
 *
 * @param code - Machine-readable error code
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @param details - Optional additional error details
 * @param rateLimit - Optional rate limit info for headers
 * @returns NextResponse with error JSON body
 *
 * @example
 * ```ts
 * return error("VALIDATION_ERROR", "Invalid input", 400, { field: "summary" });
 * ```
 */
export function error(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
  rateLimit?: RateLimitResult,
): NextResponse {
  const body: ErrorBody = {
    error: { code, message, ...(details ? { details } : {}) },
  };
  return withRateLimitHeaders(NextResponse.json(body, { status }), rateLimit);
}

/**
 * Creates a 404 Not Found error response.
 *
 * @param resource - Name of the resource type (e.g., "Issue", "Project")
 * @param id - Optional identifier of the resource
 * @param rateLimit - Optional rate limit info for headers
 * @returns NextResponse with 404 error
 */
export function notFound(
  resource: string,
  id?: string,
  rateLimit?: RateLimitResult,
): NextResponse {
  const message = id
    ? `${resource} with id '${id}' not found`
    : `${resource} not found`;
  return error("NOT_FOUND", message, 404, undefined, rateLimit);
}

/**
 * Creates a 403 Forbidden error response.
 *
 * @param message - Optional custom message
 * @param rateLimit - Optional rate limit info for headers
 * @returns NextResponse with 403 error
 */
export function forbidden(
  message = "You do not have permission to perform this action",
  rateLimit?: RateLimitResult,
): NextResponse {
  return error("PERMISSION_DENIED", message, 403, undefined, rateLimit);
}

/**
 * Creates a 400 Bad Request error response.
 *
 * @param message - Error description
 * @param details - Optional validation details
 * @param rateLimit - Optional rate limit info for headers
 * @returns NextResponse with 400 error
 */
export function badRequest(
  message: string,
  details?: Record<string, unknown>,
  rateLimit?: RateLimitResult,
): NextResponse {
  return error("BAD_REQUEST", message, 400, details, rateLimit);
}

/**
 * Creates a 429 Too Many Requests error response.
 *
 * @param rateLimit - Rate limit result for headers
 * @returns NextResponse with 429 error
 */
export function rateLimited(rateLimit: RateLimitResult): NextResponse {
  return error(
    "RATE_LIMITED",
    "Too many requests. Please try again later.",
    429,
    { retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000) },
    rateLimit,
  );
}
