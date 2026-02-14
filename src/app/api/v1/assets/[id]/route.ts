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
import { type Prisma } from "@prisma/client";

/** Input schema for updating an asset */
const updateAssetInput = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

const ASSET_SELECT = {
  id: true,
  assetTypeId: true,
  name: true,
  status: true,
  attributes: true,
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

  // Verify the asset exists and belongs to this organization
  const existing = await db.asset.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return res.notFound("Asset", id, ctx.rateLimit);
  }

  const data: Prisma.AssetUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.status !== undefined) data.status = input.status;
  if (input.attributes !== undefined) data.attributes = input.attributes as unknown as Prisma.InputJsonValue;

  const asset = await db.asset.update({
    where: { id },
    data,
    select: ASSET_SELECT,
  });

  return res.success(asset, { requestId: ctx.requestId }, ctx.rateLimit);
});
