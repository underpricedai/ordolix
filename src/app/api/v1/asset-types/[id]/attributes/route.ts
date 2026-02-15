/**
 * REST API v1 asset type attribute definitions endpoint.
 *
 * - GET /api/v1/asset-types/:id/attributes — List attribute definitions
 *
 * @module api-v1-asset-types-attributes
 */

import { db } from "@/server/db";
import { apiHandler } from "../../../lib/handler";
import * as res from "../../../lib/response";

/**
 * GET /api/v1/asset-types/:id/attributes
 *
 * Returns all typed attribute definitions for a specific asset type.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Asset type ID is required", undefined, ctx.rateLimit);
  }

  // Verify the asset type exists and belongs to this org
  const assetType = await db.assetType.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true, name: true },
  });

  if (!assetType) {
    return res.notFound("AssetType", id, ctx.rateLimit);
  }

  const definitions = await db.assetAttributeDefinition.findMany({
    where: { assetTypeId: id, organizationId: ctx.organizationId },
    orderBy: { position: "asc" },
  });

  return res.success(
    definitions,
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});
