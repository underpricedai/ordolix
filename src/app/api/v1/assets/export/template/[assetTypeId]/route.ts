/**
 * REST API v1 asset export template endpoint.
 *
 * - GET /api/v1/assets/export/template/:assetTypeId — Download empty CSV template
 *
 * @module api-v1-assets-export-template
 */

import { db } from "@/server/db";
import { apiHandler } from "../../../../lib/handler";
import * as res from "../../../../lib/response";
import { getExportTemplate } from "@/modules/assets/server/export-service";

/**
 * GET /api/v1/assets/export/template/:assetTypeId
 *
 * Returns an empty CSV template for the given asset type,
 * with headers based on attribute definitions.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const assetTypeId = params.assetTypeId;
  if (!assetTypeId) {
    return res.badRequest("assetTypeId is required");
  }

  const result = await getExportTemplate(db, ctx.organizationId, assetTypeId);

  return new Response(result.csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
    },
  });
});
