/**
 * REST API v1 assets collection endpoints.
 *
 * - GET /api/v1/assets — List assets (CMDB items)
 * - POST /api/v1/assets — Create a new asset
 *
 * @module api-v1-assets
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import { ASSET_STATUSES } from "@/modules/assets/types/schemas";
import { createAsset } from "@/modules/assets/server/asset-service";

/** Query parameters for listing assets */
const listQuerySchema = z.object({
  assetTypeId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for creating an asset */
const createAssetInput = z.object({
  assetTypeId: z.string().min(1),
  name: z.string().min(1).max(255),
  status: z.enum(ASSET_STATUSES).default("ordered"),
  attributes: z.record(z.string(), z.unknown()).default({}),
  assigneeId: z.string().optional(),
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
} as const;

/**
 * GET /api/v1/assets
 *
 * Lists assets for the authenticated organization.
 * Supports filtering by asset type, status, and search text.
 * Pagination is cursor-based.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = listQuerySchema.parse(rawParams);

  const where = {
    organizationId: ctx.organizationId,
    ...(input.assetTypeId ? { assetTypeId: input.assetTypeId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.search
      ? { name: { contains: input.search, mode: "insensitive" as const } }
      : {}),
  };

  const [assets, total] = await Promise.all([
    db.asset.findMany({
      where,
      select: ASSET_SELECT,
      orderBy: { name: "asc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.asset.count({ where }),
  ]);

  const nextCursor =
    assets.length > 0 ? assets[assets.length - 1]?.id ?? null : null;

  return res.success(
    assets,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/assets
 *
 * Creates a new asset for the authenticated organization.
 * Requires: assetTypeId and name.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createAssetInput.parse(body);

  const asset = await createAsset(
    db,
    ctx.organizationId,
    input,
    ctx.userId ?? "system",
  );

  return res.created(asset, ctx.rateLimit);
});
