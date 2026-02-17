/**
 * GitHub webhook receiver endpoint.
 *
 * POST /api/v1/webhooks/github
 *
 * Receives native GitHub webhook payloads with HMAC signature verification.
 * Routes events to the appropriate handler (push, pull_request, issue_comment).
 *
 * @module api-v1-webhooks-github
 */

import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/server/lib/logger";
import { CORRELATION_HEADER, generateCorrelationId } from "@/server/lib/correlation";
import { db } from "@/server/db";
import {
  verifySignature,
  handlePushEvent,
  handlePREvent,
  handleIssueCommentEvent,
} from "@/integrations/github/webhook";

/**
 * POST /api/v1/webhooks/github
 *
 * GitHub sends native webhook payloads here. Auth is via HMAC signature
 * in the X-Hub-Signature-256 header, NOT via Bearer token.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const requestId =
    request.headers.get(CORRELATION_HEADER) || generateCorrelationId();
  const log = logger.child({ requestId, path: "/api/v1/webhooks/github" });

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const eventType = request.headers.get("x-github-event");
    const deliveryId = request.headers.get("x-github-delivery");

    if (!signature || !eventType) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Missing GitHub webhook headers" } },
        { status: 400, headers: { [CORRELATION_HEADER]: requestId } },
      );
    }

    log.info({ eventType, deliveryId }, "GitHub webhook received");

    // Find the GitHub integration config to get the webhook secret
    const integration = await db.integrationConfig.findFirst({
      where: { provider: "github", isActive: true },
      select: { webhookSecret: true, organizationId: true, config: true },
    });

    if (!integration || !integration.webhookSecret) {
      log.warn("No active GitHub integration config found");
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No GitHub integration configured" } },
        { status: 404, headers: { [CORRELATION_HEADER]: requestId } },
      );
    }

    // Verify HMAC signature
    if (!verifySignature(integration.webhookSecret, rawBody, signature)) {
      log.warn("GitHub webhook signature verification failed");
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid signature" } },
        { status: 401, headers: { [CORRELATION_HEADER]: requestId } },
      );
    }

    const payload = JSON.parse(rawBody);
    // integration.config available for future use when token resolution is implemented
    const token = ""; // Token resolved from encryptedTokens at runtime

    let result: unknown = null;

    switch (eventType) {
      case "push":
        result = await handlePushEvent(db, integration.organizationId, token, payload);
        break;
      case "pull_request":
        result = await handlePREvent(db, integration.organizationId, token, payload);
        break;
      case "issue_comment":
        result = await handleIssueCommentEvent(db, integration.organizationId, payload);
        break;
      default:
        log.info({ eventType }, "Unhandled GitHub event type");
        result = { skipped: true, reason: `Unhandled event: ${eventType}` };
    }

    return NextResponse.json(
      { data: { received: true, event: eventType, deliveryId, result, requestId } },
      { status: 200, headers: { [CORRELATION_HEADER]: requestId } },
    );
  } catch (err) {
    log.error({ err, requestId }, "GitHub webhook processing error");

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to process GitHub webhook" } },
      { status: 500, headers: { [CORRELATION_HEADER]: requestId } },
    );
  }
}
