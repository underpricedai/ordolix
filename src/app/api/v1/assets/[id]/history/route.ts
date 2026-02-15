/**
 * REST API v1 asset history endpoint.
 *
 * - GET /api/v1/assets/:id/history — Get change history for an asset
 *
 * @module api-v1-assets-history
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../../lib/handler";
import * as res from "../../../lib/response";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * GET /api/v1/assets/:id/history
 *
 * Returns paginated change history for a specific asset.
 */
export const GET = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Asset ID is required", undefined, ctx.rateLimit);
  }

  // Verify the asset exists and belongs to this org
  const asset = await db.asset.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });

  if (!asset) {
    return res.notFound("Asset", id, ctx.rateLimit);
  }

  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });
  const input = querySchema.parse(rawParams);

  const history = await db.assetHistory.findMany({
    where: { assetId: id, organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });

  const nextCursor =
    history.length > 0 ? history[history.length - 1]?.id ?? null : null;

  return res.success(
    history,
    { nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});
