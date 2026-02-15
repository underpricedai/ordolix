/**
 * REST API v1 single procurement request endpoint.
 *
 * - GET /api/v1/procurement/requests/:id -- Get request by ID
 *
 * @module api-v1-procurement-request-id
 */

import { db } from "@/server/db";
import { apiHandler } from "../../../lib/handler";
import * as res from "../../../lib/response";
import * as procService from "@/modules/assets/server/procurement-service";
import { NotFoundError } from "@/server/lib/errors";

/**
 * GET /api/v1/procurement/requests/:id
 *
 * Retrieves a single procurement request with approvals, vendor, and order.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Request ID is required", undefined, ctx.rateLimit);
  }

  try {
    const procRequest = await procService.getProcurementRequest(db, ctx.organizationId, id);
    return res.success(procRequest, { requestId: ctx.requestId }, ctx.rateLimit);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.notFound("ProcurementRequest", id, ctx.rateLimit);
    }
    throw error;
  }
});
