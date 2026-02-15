/**
 * REST API v1 procurement approval decision endpoint.
 *
 * - POST /api/v1/procurement/requests/:id/approve -- Decide on an approval
 *
 * @module api-v1-procurement-approval-decide
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../../../lib/handler";
import * as res from "../../../../lib/response";
import * as approvalService from "@/modules/assets/server/procurement-approval-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

const decideInput = z.object({
  approvalId: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().nullable().optional(),
});

/**
 * POST /api/v1/procurement/requests/:id/approve
 *
 * Records an approval decision for a procurement request.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = decideInput.parse(body);

  try {
    const result = await approvalService.decideProcurementApproval(
      db,
      ctx.organizationId,
      input.approvalId,
      ctx.userId ?? "system",
      input.decision,
      input.comment,
    );
    return res.success(result, { requestId: ctx.requestId }, ctx.rateLimit);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.notFound("ProcurementApproval", input.approvalId, ctx.rateLimit);
    }
    if (error instanceof ValidationError) {
      return res.badRequest(error.message, undefined, ctx.rateLimit);
    }
    throw error;
  }
});
