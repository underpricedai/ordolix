/**
 * SailPoint webhook receiver endpoint.
 *
 * POST /api/v1/webhooks/sailpoint
 *
 * Receives SailPoint IdentityNow event payloads (access request
 * approved/revoked) and routes them to the sync handler.
 *
 * @module api-v1-webhooks-sailpoint
 */

import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/server/lib/logger";
import { CORRELATION_HEADER, generateCorrelationId } from "@/server/lib/correlation";
import { db } from "@/server/db";
import { handleSailPointEvent } from "@/integrations/sailpoint/sailpoint-service";
import { sailPointEventSchema } from "@/integrations/sailpoint/schemas";

/**
 * POST /api/v1/webhooks/sailpoint
 *
 * SailPoint sends event payloads here when access requests are
 * approved or revoked. Auth is via webhook secret in the
 * X-SailPoint-Webhook-Secret header.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const requestId =
    request.headers.get(CORRELATION_HEADER) || generateCorrelationId();
  const log = logger.child({ requestId, path: "/api/v1/webhooks/sailpoint" });

  try {
    const rawBody = await request.text();
    const webhookSecret = request.headers.get("x-sailpoint-webhook-secret");

    if (!webhookSecret) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Missing X-SailPoint-Webhook-Secret header" } },
        { status: 400, headers: { [CORRELATION_HEADER]: requestId } },
      );
    }

    // Find the SailPoint integration config to verify webhook secret
    const integration = await db.integrationConfig.findFirst({
      where: { provider: "sailpoint", isActive: true },
      select: { webhookSecret: true, organizationId: true },
    });

    if (!integration || !integration.webhookSecret) {
      log.warn("No active SailPoint integration config found");
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No SailPoint integration configured" } },
        { status: 404, headers: { [CORRELATION_HEADER]: requestId } },
      );
    }

    // Verify webhook secret
    if (integration.webhookSecret !== webhookSecret) {
      log.warn("SailPoint webhook secret verification failed");
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid webhook secret" } },
        { status: 401, headers: { [CORRELATION_HEADER]: requestId } },
      );
    }

    // Parse and validate the payload
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid JSON payload" } },
        { status: 400, headers: { [CORRELATION_HEADER]: requestId } },
      );
    }

    const parsed = sailPointEventSchema.safeParse(payload);
    if (!parsed.success) {
      log.warn({ errors: parsed.error.issues }, "Invalid SailPoint event payload");
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid event payload", details: parsed.error.issues } },
        { status: 400, headers: { [CORRELATION_HEADER]: requestId } },
      );
    }

    log.info({ eventType: parsed.data.eventType }, "SailPoint webhook received");

    const result = await handleSailPointEvent(
      db,
      integration.organizationId,
      parsed.data,
    );

    return NextResponse.json(
      { data: { received: true, ...result, requestId } },
      { status: 200, headers: { [CORRELATION_HEADER]: requestId } },
    );
  } catch (err) {
    log.error({ err, requestId }, "SailPoint webhook processing error");

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to process SailPoint webhook" } },
      { status: 500, headers: { [CORRELATION_HEADER]: requestId } },
    );
  }
}
