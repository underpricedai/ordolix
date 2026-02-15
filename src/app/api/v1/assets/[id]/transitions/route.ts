/**
 * REST API v1 asset status transition endpoint.
 *
 * - POST /api/v1/assets/:id/transitions — Transition asset status
 *
 * @module api-v1-assets-transitions
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../../lib/handler";
import * as res from "../../../lib/response";
import { ASSET_STATUSES } from "@/modules/assets/types/schemas";
import { transitionAssetStatus } from "@/modules/assets/server/asset-lifecycle-service";

const transitionInput = z.object({
  toStatus: z.enum(ASSET_STATUSES),
});

/**
 * POST /api/v1/assets/:id/transitions
 *
 * Transitions an asset to a new lifecycle status, enforcing
 * configured transition rules and required fields.
 */
export const POST = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Asset ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const input = transitionInput.parse(body);

  try {
    const asset = await transitionAssetStatus(
      db,
      ctx.organizationId,
      id,
      input.toStatus,
      ctx.userId ?? "system",
    );

    return res.success(asset, { requestId: ctx.requestId }, ctx.rateLimit);
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      const appError = error as { statusCode: number; message: string; code?: string };
      if (appError.statusCode === 404) {
        return res.notFound("Asset", id, ctx.rateLimit);
      }
      if (appError.statusCode === 400) {
        return res.badRequest(appError.message, undefined, ctx.rateLimit);
      }
    }
    throw error;
  }
});
