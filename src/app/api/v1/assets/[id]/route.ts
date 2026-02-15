/**
 * REST API v1 single asset endpoints.
 *
 * - GET /api/v1/assets/:id — Get asset by ID
 * - PUT /api/v1/assets/:id — Update an asset
 *
 * @module api-v1-assets-id
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import { ASSET_STATUSES } from "@/modules/assets/types/schemas";
import { updateAsset } from "@/modules/assets/server/asset-service";

/** Input schema for updating an asset */
const updateAssetInput = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.enum(ASSET_STATUSES).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  assigneeId: z.string().nullable().optional(),
});

const ASSET_SELECT = {
  id: true,
  assetTag: true,
  assetTypeId: true,
  name: true,
  status: true,
  attributes: true,
  assigneeId: true,
  createdAt: true,
  updatedAt: true,
  assetType: {
    select: {
      id: true,
      name: true,
      icon: true,
    },
  },
  relationshipsFrom: {
    select: {
      id: true,
      toAssetId: true,
      relationshipType: true,
      toAsset: {
        select: { id: true, name: true },
      },
    },
  },
  relationshipsTo: {
    select: {
      id: true,
      fromAssetId: true,
      relationshipType: true,
      fromAsset: {
        select: { id: true, name: true },
      },
    },
  },
} as const;

/**
 * GET /api/v1/assets/:id
 *
 * Retrieves a single asset by ID, including its type and relationships.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Asset ID is required", undefined, ctx.rateLimit);
  }

  const asset = await db.asset.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: ASSET_SELECT,
  });

  if (!asset) {
    return res.notFound("Asset", id, ctx.rateLimit);
  }

  return res.success(asset, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * PUT /api/v1/assets/:id
 *
 * Updates an existing asset. Accepts partial updates for name,
 * status, and attributes.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Asset ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const input = updateAssetInput.parse(body);

  try {
    const asset = await updateAsset(
      db,
      ctx.organizationId,
      id,
      input,
      ctx.userId ?? "system",
    );

    return res.success(asset, { requestId: ctx.requestId }, ctx.rateLimit);
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      const appError = error as { statusCode: number; message: string };
      if (appError.statusCode === 404) {
        return res.notFound("Asset", id, ctx.rateLimit);
      }
    }
    throw error;
  }
});
