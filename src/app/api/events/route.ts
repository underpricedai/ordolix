/**
 * SSE events API route.
 *
 * @description Provides a Server-Sent Events stream for real-time updates.
 * Validates the connection token provided as a query parameter, then creates
 * an SSE stream subscribed to the channels associated with that token.
 *
 * @example
 * ```
 * GET /api/events?token=<sse-token>
 * ```
 *
 * @module api/events
 */

import { auth } from "@/server/auth";
import { validateToken, createSSEStream } from "@/server/providers/realtime";

/**
 * Handles GET requests for SSE event streaming.
 *
 * @param request - The incoming HTTP request with a `token` query parameter
 * @returns A streaming Response with SSE headers, or an error response
 */
export async function GET(request: Request) {
  // Validate authentication via Auth.js session
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Extract and validate the SSE connection token from query params
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new Response(
      JSON.stringify({ code: "MISSING_TOKEN", message: "Token query parameter is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const tokenData = validateToken(token);

  if (!tokenData) {
    return new Response(
      JSON.stringify({ code: "INVALID_TOKEN", message: "Token is invalid or expired" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  // Verify the token belongs to the authenticated user
  if (tokenData.userId !== session.user.id) {
    return new Response(
      JSON.stringify({ code: "TOKEN_MISMATCH", message: "Token does not belong to authenticated user" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  // Create the SSE stream for the token's channels
  const stream = createSSEStream(tokenData.channels);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
