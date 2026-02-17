/**
 * REST API v1 asset export endpoint.
 *
 * - GET /api/v1/assets/export — Export assets as CSV
 *
 * @module api-v1-assets-export
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import { exportAssets } from "@/modules/assets/server/export-service";
import { ASSET_STATUSES } from "@/modules/assets/types/schemas";

const exportQuerySchema = z.object({
  assetTypeId: z.string().min(1),
  status: z.enum(ASSET_STATUSES).optional(),
  search: z.string().optional(),
});

/**
 * GET /api/v1/assets/export
 *
 * Exports assets for a given asset type as a CSV file.
 * Returns text/csv content type with Content-Disposition header.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = exportQuerySchema.parse(rawParams);

  const result = await exportAssets(db, ctx.organizationId, input);

  return new Response(result.csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
    },
  });
});
