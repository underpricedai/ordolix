/**
 * REST API v1 warranty alerts endpoint.
 *
 * - GET /api/v1/assets/warranty-alerts — Get assets with warranties expiring soon
 *
 * @module api-v1-assets-warranty-alerts
 */

import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import { getWarrantyAlerts } from "@/modules/assets/server/asset-financial-service";

/**
 * GET /api/v1/assets/warranty-alerts?daysAhead=30
 *
 * Returns assets with warranties expiring within the specified number of days.
 * Defaults to 30 days if no daysAhead query parameter is provided.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const daysAheadParam = url.searchParams.get("daysAhead");
  const daysAhead = daysAheadParam ? Math.min(365, Math.max(1, parseInt(daysAheadParam, 10) || 30)) : 30;

  const alerts = await getWarrantyAlerts(db, ctx.organizationId, daysAhead);

  return res.success(alerts, { requestId: ctx.requestId }, ctx.rateLimit);
});
