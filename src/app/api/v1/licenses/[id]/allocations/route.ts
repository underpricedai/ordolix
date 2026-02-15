/**
 * REST API v1 license allocation endpoints.
 *
 * - POST /api/v1/licenses/:id/allocations — Allocate a license
 * - DELETE /api/v1/licenses/:id/allocations — Revoke a license allocation
 *
 * @module api-v1-licenses-id-allocations
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../../lib/handler";
import * as res from "../../../lib/response";
import {
  allocateLicense,
  revokeLicenseAllocation,
} from "@/modules/assets/server/license-service";

/** Input schema for allocating a license */
const allocateBody = z.object({
  assetId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
});

/** Input schema for revoking an allocation */
const revokeBody = z.object({
  allocationId: z.string().min(1),
});

/**
 * POST /api/v1/licenses/:id/allocations
 *
 * Allocates a license to an asset and/or user.
 * At least one of assetId or userId must be provided.
 */
export const POST = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("License ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const input = allocateBody.parse(body);

  try {
    const allocation = await allocateLicense(db, ctx.organizationId, id, {
      assetId: input.assetId ?? undefined,
      userId: input.userId ?? undefined,
    });

    return res.created(allocation, ctx.rateLimit);
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      const appError = error as { statusCode: number; message: string };
      if (appError.statusCode === 404) {
        return res.notFound("License", id, ctx.rateLimit);
      }
      if (appError.statusCode === 400) {
        return res.badRequest(appError.message, undefined, ctx.rateLimit);
      }
      if (appError.statusCode === 409) {
        return res.error("CONFLICT", appError.message, 409, undefined, ctx.rateLimit);
      }
    }
    throw error;
  }
});

/**
 * DELETE /api/v1/licenses/:id/allocations
 *
 * Revokes a license allocation. Expects { allocationId } in the body.
 */
export const DELETE = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("License ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const input = revokeBody.parse(body);

  try {
    const allocation = await revokeLicenseAllocation(db, ctx.organizationId, input.allocationId);
    return res.success(allocation, { requestId: ctx.requestId }, ctx.rateLimit);
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      const appError = error as { statusCode: number; message: string };
      if (appError.statusCode === 404) {
        return res.notFound("LicenseAllocation", input.allocationId, ctx.rateLimit);
      }
      if (appError.statusCode === 409) {
        return res.error("CONFLICT", appError.message, 409, undefined, ctx.rateLimit);
      }
    }
    throw error;
  }
});
