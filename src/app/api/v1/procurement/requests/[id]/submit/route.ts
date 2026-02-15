/**
 * REST API v1 procurement request submit endpoint.
 *
 * - POST /api/v1/procurement/requests/:id/submit -- Submit request for approval
 *
 * @module api-v1-procurement-request-submit
 */

import { db } from "@/server/db";
import { apiHandler } from "../../../../lib/handler";
import * as res from "../../../../lib/response";
import * as procService from "@/modules/assets/server/procurement-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

/**
 * POST /api/v1/procurement/requests/:id/submit
 *
 * Submits a draft procurement request for approval.
 */
export const POST = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Request ID is required", undefined, ctx.rateLimit);
  }

  try {
    const updated = await procService.submitForApproval(db, ctx.organizationId, id);
    return res.success(updated, { requestId: ctx.requestId }, ctx.rateLimit);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.notFound("ProcurementRequest", id, ctx.rateLimit);
    }
    if (error instanceof ValidationError) {
      return res.badRequest(error.message, undefined, ctx.rateLimit);
    }
    throw error;
  }
});
