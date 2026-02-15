/**
 * Omnea webhook receiver endpoint.
 *
 * POST /api/v1/webhooks/omnea
 *
 * Receives webhook payloads from Omnea with webhook secret verification.
 * Routes events to the appropriate handler for processing procurement
 * status updates, approvals, and rejections.
 *
 * @module api-v1-webhooks-omnea
 */

import { type NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { logger } from "@/server/lib/logger";
import { CORRELATION_HEADER, generateCorrelationId } from "@/server/lib/correlation";
import { db } from "@/server/db";
import { handleOmneaWebhook } from "@/integrations/omnea/omnea-service";
import { omneaWebhookPayload } from "@/integrations/omnea/schemas";

/**
 * Verify an Omnea webhook signature.
 *
 * @param secret - The stored webhook secret
 * @param payload - Raw request body
 * @param signature - The X-Omnea-Signature header value
 * @returns True if the signature matches
 */
function verifyOmneaSignature(
  secret: string,
  payload: string,
  signature: string,
): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  if (expected.length !== signature.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * POST /api/v1/webhooks/omnea
 *
 * Omnea sends webhook payloads here. Auth is via HMAC signature
 * in the X-Omnea-Signature header.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const requestId =
    request.headers.get(CORRELATION_HEADER) || generateCorrelationId();
  const log = logger.child({ requestId, path: "/api/v1/webhooks/omnea" });

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-omnea-signature");

    if (!signature) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Missing X-Omnea-Signature header" } },
        { status: 400, headers: { [CORRELATION_HEADER]: requestId } },
      );
    }

    log.info("Omnea webhook received");

    // Find the Omnea integration config to get the webhook secret
    const integration = await db.integrationConfig.findFirst({
      where: { provider: "omnea", isActive: true },
      select: { webhookSecret: true, organizationId: true },
    });

    if (!integration || !integration.webhookSecret) {
      log.warn("No active Omnea integration config found");
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No Omnea integration configured" } },
        { status: 404, headers: { [CORRELATION_HEADER]: requestId } },
      );
    }

    // Verify HMAC signature
    if (!verifyOmneaSignature(integration.webhookSecret, rawBody, signature)) {
      log.warn("Omnea webhook signature verification failed");
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid signature" } },
        { status: 401, headers: { [CORRELATION_HEADER]: requestId } },
      );
    }

    // Parse and validate the payload
    const parsedPayload = JSON.parse(rawBody);
    const validationResult = omneaWebhookPayload.safeParse(parsedPayload);

    if (!validationResult.success) {
      log.warn({ errors: validationResult.error.flatten() }, "Invalid webhook payload");
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid webhook payload", details: validationResult.error.flatten() } },
        { status: 400, headers: { [CORRELATION_HEADER]: requestId } },
      );
    }

    const result = await handleOmneaWebhook(
      db,
      integration.organizationId,
      validationResult.data,
    );

    log.info({ result }, "Omnea webhook processed");

    return NextResponse.json(
      { data: { received: true, result, requestId } },
      { status: 200, headers: { [CORRELATION_HEADER]: requestId } },
    );
  } catch (err) {
    log.error({ err, requestId }, "Omnea webhook processing error");

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to process Omnea webhook" } },
      { status: 500, headers: { [CORRELATION_HEADER]: requestId } },
    );
  }
}
