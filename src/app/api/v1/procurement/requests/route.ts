/**
 * REST API v1 procurement requests collection endpoints.
 *
 * - GET /api/v1/procurement/requests -- List procurement requests
 * - POST /api/v1/procurement/requests -- Create a new procurement request
 *
 * @module api-v1-procurement-requests
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import { PROCUREMENT_REQUEST_STATUSES, PROCUREMENT_URGENCIES } from "@/modules/assets/types/schemas";
import * as procService from "@/modules/assets/server/procurement-service";

const listQuerySchema = z.object({
  status: z.string().optional(),
  urgency: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

const createInput = z.object({
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  vendorId: z.string().nullable().optional(),
  estimatedCost: z.number().nonnegative().nullable().optional(),
  quantity: z.number().int().positive().default(1),
  costCenter: z.string().nullable().optional(),
  urgency: z.enum(PROCUREMENT_URGENCIES).default("normal"),
});

/**
 * GET /api/v1/procurement/requests
 *
 * Lists procurement requests for the authenticated organization.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = listQuerySchema.parse(rawParams);

  const result = await procService.listProcurementRequests(db, ctx.organizationId, {
    status: input.status as typeof PROCUREMENT_REQUEST_STATUSES[number] | undefined,
    urgency: input.urgency as typeof PROCUREMENT_URGENCIES[number] | undefined,
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
 * POST /api/v1/procurement/requests
 *
 * Creates a new procurement request.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createInput.parse(body);

  const procRequest = await procService.createProcurementRequest(
    db,
    ctx.organizationId,
    input,
    ctx.userId ?? "system",
  );

  return res.created(procRequest, ctx.rateLimit);
});
