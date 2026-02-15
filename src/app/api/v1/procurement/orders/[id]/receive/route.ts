/**
 * REST API v1 purchase order receive endpoint.
 *
 * - POST /api/v1/procurement/orders/:id/receive -- Mark order as received
 *
 * @module api-v1-procurement-order-receive
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../../../lib/handler";
import * as res from "../../../../lib/response";
import * as procService from "@/modules/assets/server/procurement-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

const receiveInput = z.object({
  lineItemUpdates: z.array(z.object({
    lineItemId: z.string().min(1),
    assetId: z.string().nullable().optional(),
  })).default([]),
});

/**
 * POST /api/v1/procurement/orders/:id/receive
 *
 * Marks a purchase order as received, optionally linking assets to line items.
 */
export const POST = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Order ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json().catch(() => ({}));
  const input = receiveInput.parse(body);

  try {
    const order = await procService.receiveOrder(
      db,
      ctx.organizationId,
      id,
      input.lineItemUpdates,
    );
    return res.success(order, { requestId: ctx.requestId }, ctx.rateLimit);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.notFound("PurchaseOrder", id, ctx.rateLimit);
    }
    if (error instanceof ValidationError) {
      return res.badRequest(error.message, undefined, ctx.rateLimit);
    }
    throw error;
  }
});
