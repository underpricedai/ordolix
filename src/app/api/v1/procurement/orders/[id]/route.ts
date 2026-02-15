/**
 * REST API v1 single purchase order endpoint.
 *
 * - GET /api/v1/procurement/orders/:id -- Get order by ID
 *
 * @module api-v1-procurement-order-id
 */

import { db } from "@/server/db";
import { apiHandler } from "../../../lib/handler";
import * as res from "../../../lib/response";
import * as procService from "@/modules/assets/server/procurement-service";
import { NotFoundError } from "@/server/lib/errors";

/**
 * GET /api/v1/procurement/orders/:id
 *
 * Retrieves a single purchase order with line items, vendor, and request.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Order ID is required", undefined, ctx.rateLimit);
  }

  try {
    const order = await procService.getPurchaseOrder(db, ctx.organizationId, id);
    return res.success(order, { requestId: ctx.requestId }, ctx.rateLimit);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.notFound("PurchaseOrder", id, ctx.rateLimit);
    }
    throw error;
  }
});
