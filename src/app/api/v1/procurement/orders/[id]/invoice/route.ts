/**
 * REST API v1 purchase order invoice matching endpoint.
 *
 * - POST /api/v1/procurement/orders/:id/invoice -- Match invoice to order
 *
 * @module api-v1-procurement-order-invoice
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../../../lib/handler";
import * as res from "../../../../lib/response";
import * as procService from "@/modules/assets/server/procurement-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

const invoiceInput = z.object({
  invoiceNumber: z.string().min(1),
  invoiceAmount: z.number().nonnegative(),
  invoiceDate: z.coerce.date(),
});

/**
 * POST /api/v1/procurement/orders/:id/invoice
 *
 * Records invoice information for a purchase order.
 */
export const POST = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Order ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const input = invoiceInput.parse(body);

  try {
    const order = await procService.matchInvoice(
      db,
      ctx.organizationId,
      id,
      input,
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
