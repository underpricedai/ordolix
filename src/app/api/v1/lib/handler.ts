/**
 * REST API v1 route handler wrapper.
 *
 * Provides a standard wrapper for all API v1 route handlers that handles:
 * - Bearer token authentication
 * - Rate limiting (600 req/min for API tokens)
 * - Error mapping from AppError hierarchy to JSON responses
 * - Correlation ID tracking
 *
 * @module api-v1-handler
 */

import { type NextRequest } from "next/server";
import { authenticateApiRequest, type ApiAuthContext } from "./auth";
import * as res from "./response";
import { checkRateLimit, type RateLimitResult } from "@/server/lib/rate-limit";
import { AppError } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { CORRELATION_HEADER, generateCorrelationId } from "@/server/lib/correlation";
import { ZodError } from "zod";

/** Context passed to every API v1 route handler */
export interface ApiHandlerContext extends ApiAuthContext {
  /** Correlation ID for request tracing */
  requestId: string;
  /** Rate limit result for this request */
  rateLimit: RateLimitResult;
}

/** Route handler function type */
type HandlerFn = (
  request: NextRequest,
  context: ApiHandlerContext,
  params: Record<string, string>,
) => Promise<Response>;

/**
 * Wraps an API v1 route handler with authentication, rate limiting, and error handling.
 *
 * @param handler - The route handler function to wrap
 * @returns A Next.js route handler function
 *
 * @example
 * ```ts
 * export const GET = apiHandler(async (request, ctx, params) => {
 *   const data = await getStuff(ctx.organizationId);
 *   return success(data, undefined, ctx.rateLimit);
 * });
 * ```
 */
export function apiHandler(handler: HandlerFn) {
  return async (
    request: NextRequest,
    routeContext: { params: Promise<Record<string, string>> },
  ): Promise<Response> => {
    const requestId =
      request.headers.get(CORRELATION_HEADER) || generateCorrelationId();
    const log = logger.child({ requestId, path: request.nextUrl.pathname });

    try {
      // Authenticate
      const auth = await authenticateApiRequest(request);

      // Rate limit (using tokenId as identifier for the API tier)
      const rateLimit = await checkRateLimit(auth.tokenId, "api");
      if (!rateLimit.success) {
        log.warn({ tokenId: auth.tokenId }, "API rate limit exceeded");
        return res.rateLimited(rateLimit);
      }

      const params = await routeContext.params;

      const ctx: ApiHandlerContext = {
        ...auth,
        requestId,
        rateLimit,
      };

      const response = await handler(request, ctx, params);

      // Add correlation ID to response headers
      if (response instanceof Response) {
        response.headers.set(CORRELATION_HEADER, requestId);
      }

      return response;
    } catch (err) {
      return handleError(err, requestId);
    }
  };
}

/**
 * Maps errors to appropriate API v1 error responses.
 */
function handleError(err: unknown, requestId: string): Response {
  if (err instanceof AppError) {
    const response = res.error(err.code, err.message, err.statusCode, err.details);
    response.headers.set(CORRELATION_HEADER, requestId);
    return response;
  }

  if (err instanceof ZodError) {
    const details: Record<string, unknown> = {
      issues: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    };
    const response = res.badRequest("Validation failed", details);
    response.headers.set(CORRELATION_HEADER, requestId);
    return response;
  }

  // Unexpected error
  logger.error({ err, requestId }, "Unhandled API error");
  const response = res.error(
    "INTERNAL_ERROR",
    "An unexpected error occurred",
    500,
  );
  response.headers.set(CORRELATION_HEADER, requestId);
  return response;
}
