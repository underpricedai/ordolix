/**
 * REST API v1 incoming webhooks endpoint.
 *
 * - POST /api/v1/webhooks — Receive incoming webhooks (GitHub, etc.)
 *
 * @description Handles incoming webhook payloads from external services.
 * Validates the webhook source, parses the event payload, and dispatches
 * to the appropriate integration handler.
 *
 * @module api-v1-webhooks
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/server/lib/logger";
import { CORRELATION_HEADER, generateCorrelationId } from "@/server/lib/correlation";

/**
 * Minimal webhook payload schema.
 * Each integration may have its own extended schema;
 * this validates the common envelope.
 */
const webhookPayloadSchema = z.object({
  /** Source integration identifier (e.g., "github", "sharepoint") */
  source: z.string().min(1),
  /** Event type from the source (e.g., "push", "pull_request") */
  event: z.string().min(1),
  /** The raw event payload from the source */
  payload: z.record(z.string(), z.unknown()),
});

/**
 * POST /api/v1/webhooks
 *
 * Receives incoming webhook events from external services.
 * Validates the payload format, logs the event, and returns an acknowledgment.
 *
 * Note: This endpoint does NOT use the standard apiHandler because
 * webhooks authenticate via shared secrets / signatures rather than
 * Bearer tokens. Signature verification per integration is handled
 * by the specific integration handlers.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const requestId =
    request.headers.get(CORRELATION_HEADER) || generateCorrelationId();
  const log = logger.child({ requestId, path: "/api/v1/webhooks" });

  try {
    const body = await request.json();
    const parsed = webhookPayloadSchema.safeParse(body);

    if (!parsed.success) {
      log.warn({ issues: parsed.error.issues }, "Invalid webhook payload");
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Invalid webhook payload",
            details: {
              issues: parsed.error.issues.map((i) => ({
                path: i.path.join("."),
                message: i.message,
              })),
            },
          },
        },
        {
          status: 400,
          headers: { [CORRELATION_HEADER]: requestId },
        },
      );
    }

    const { source, event, payload } = parsed.data;

    log.info(
      { source, event, payloadKeys: Object.keys(payload) },
      "Webhook received",
    );

    // TODO: Dispatch to integration-specific handlers:
    // - github: process push, PR, issue events
    // - sharepoint: process file change events
    // - etc.
    //
    // For now, we acknowledge receipt and log the event.
    // Integration handlers will be added in the integrations module.

    return NextResponse.json(
      {
        data: {
          received: true,
          source,
          event,
          requestId,
        },
      },
      {
        status: 200,
        headers: { [CORRELATION_HEADER]: requestId },
      },
    );
  } catch (err) {
    log.error({ err, requestId }, "Webhook processing error");

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to process webhook",
        },
      },
      {
        status: 500,
        headers: { [CORRELATION_HEADER]: requestId },
      },
    );
  }
}
