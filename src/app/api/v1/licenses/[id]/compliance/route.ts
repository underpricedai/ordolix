/**
 * REST API v1 license compliance endpoint.
 *
 * - GET /api/v1/licenses/:id/compliance — Get compliance status for a license
 *
 * @module api-v1-licenses-id-compliance
 */

import { db } from "@/server/db";
import { apiHandler } from "../../../lib/handler";
import * as res from "../../../lib/response";
import { getLicenseCompliance } from "@/modules/assets/server/license-compliance";

/**
 * GET /api/v1/licenses/:id/compliance
 *
 * Returns the compliance status for a single license, including
 * total, used, and available entitlement counts.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("License ID is required", undefined, ctx.rateLimit);
  }

  try {
    const compliance = await getLicenseCompliance(db, ctx.organizationId, id);
    return res.success(compliance, { requestId: ctx.requestId }, ctx.rateLimit);
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      const appError = error as { statusCode: number };
      if (appError.statusCode === 404) {
        return res.notFound("License", id, ctx.rateLimit);
      }
    }
    throw error;
  }
});
