/**
 * REST API v1 purchase orders collection endpoints.
 *
 * - GET /api/v1/procurement/orders -- List purchase orders
 * - POST /api/v1/procurement/orders -- Create a new purchase order
 *
 * @module api-v1-procurement-orders
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import { PURCHASE_ORDER_STATUSES } from "@/modules/assets/types/schemas";
import * as procService from "@/modules/assets/server/procurement-service";

const listQuerySchema = z.object({
  status: z.string().optional(),
  vendorId: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

const createInput = z.object({
  procurementRequestId: z.string().nullable().optional(),
  vendorId: z.string().min(1),
  totalAmount: z.number().nonnegative().nullable().optional(),
  expectedDelivery: z.coerce.date().nullable().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().int().positive().default(1),
    unitPrice: z.number().nonnegative(),
  })).default([]),
});

/**
 * GET /api/v1/procurement/orders
 *
 * Lists purchase orders for the authenticated organization.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = listQuerySchema.parse(rawParams);

  const result = await procService.listPurchaseOrders(db, ctx.organizationId, {
    status: input.status as typeof PURCHASE_ORDER_STATUSES[number] | undefined,
    vendorId: input.vendorId,
    search: input.search,
    limit: input.limit,
    cursor: input.cursor,
  });

  return res.success(
    result.items,
    { total: result.total, nextCursor: result.nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/procurement/orders
 *
 * Creates a new purchase order.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createInput.parse(body);

  const order = await procService.createPurchaseOrder(
    db,
    ctx.organizationId,
    input.procurementRequestId,
    input,
  );

  return res.created(order, ctx.rateLimit);
});
