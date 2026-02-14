/**
 * REST API v1 authentication helper.
 *
 * Extracts and validates Bearer tokens from the Authorization header.
 * Tokens are hashed (SHA-256) and looked up against the ApiToken table's
 * tokenHash column, returning the associated userId and organizationId.
 *
 * @module api-v1-auth
 */

import { db } from "@/server/db";
import { AppError } from "@/server/lib/errors";

/** Authenticated API context returned after successful token validation */
export interface ApiAuthContext {
  /** ID of the user associated with the API token */
  userId: string;
  /** ID of the organization the token belongs to */
  organizationId: string;
  /** The API token record ID (for rate limiting) */
  tokenId: string;
}

/**
 * Hashes a raw API token using SHA-256 for database lookup.
 *
 * @param token - The raw Bearer token string
 * @returns Hex-encoded SHA-256 hash
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Extracts and validates a Bearer token from the request's Authorization header.
 *
 * Hashes the raw token, looks it up in the ApiToken table by tokenHash,
 * verifies it is not expired, updates the lastUsedAt timestamp, and returns
 * the associated user and organization IDs.
 *
 * @param request - The incoming Request object
 * @returns The authenticated API context
 * @throws {AppError} With UNAUTHORIZED code if the token is missing, invalid, or expired
 *
 * @example
 * ```ts
 * const auth = await authenticateApiRequest(request);
 * // auth.userId, auth.organizationId, auth.tokenId
 * ```
 */
export async function authenticateApiRequest(
  request: Request,
): Promise<ApiAuthContext> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    throw new AppError(
      "UNAUTHORIZED",
      "Missing Authorization header. Use: Authorization: Bearer <token>",
      401,
    );
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
    throw new AppError(
      "UNAUTHORIZED",
      "Invalid Authorization header format. Use: Authorization: Bearer <token>",
      401,
    );
  }

  const rawToken = parts[1];
  const tokenHash = await hashToken(rawToken);

  // Look up the API token by its hash
  const apiToken = await db.apiToken.findUnique({
    where: { tokenHash },
    include: {
      user: { select: { id: true } },
    },
  });

  if (!apiToken) {
    throw new AppError("UNAUTHORIZED", "Invalid or inactive API token", 401);
  }

  // Check expiration
  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
    throw new AppError("UNAUTHORIZED", "API token has expired", 401);
  }

  // Update lastUsedAt (fire-and-forget, do not block the response)
  db.apiToken
    .update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Silently ignore — lastUsedAt is informational
    });

  return {
    userId: apiToken.user.id,
    organizationId: apiToken.organizationId,
    tokenId: apiToken.id,
  };
}
