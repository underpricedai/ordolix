/**
 * Request correlation ID utilities.
 *
 * Generates or extracts a UUID correlation ID from request headers.
 * Used to trace requests across services and log entries.
 *
 * @module correlation
 */

import { type NextRequest } from "next/server";

/** Header name for correlation IDs */
export const CORRELATION_HEADER = "X-Correlation-ID";

/**
 * Generates a new UUID v4 correlation ID.
 *
 * @returns A new UUID string
 *
 * @example
 * ```ts
 * const id = generateCorrelationId();
 * // "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 * ```
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Extracts a correlation ID from the request's X-Correlation-ID header,
 * or generates a new one if the header is missing or empty.
 *
 * @param request - The incoming Next.js request
 * @returns The extracted or newly generated correlation ID
 *
 * @example
 * ```ts
 * const correlationId = getCorrelationId(request);
 * response.headers.set("X-Correlation-ID", correlationId);
 * ```
 */
export function getCorrelationId(request: NextRequest): string {
  const existing = request.headers.get(CORRELATION_HEADER);
  return existing?.trim() || generateCorrelationId();
}
