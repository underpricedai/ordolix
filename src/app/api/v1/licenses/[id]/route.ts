/**
 * REST API v1 single license endpoints.
 *
 * - GET /api/v1/licenses/:id — Get license by ID
 * - PUT /api/v1/licenses/:id — Update a license
 *
 * @module api-v1-licenses-id
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import { LICENSE_TYPES, LICENSE_STATUSES } from "@/modules/assets/types/schemas";
import {
  getLicense,
  updateLicense,
} from "@/modules/assets/server/license-service";

/** Input schema for updating a license */
const updateLicenseBody = z.object({
  name: z.string().min(1).max(255).optional(),
  vendor: z.string().nullable().optional(),
  licenseType: z.enum(LICENSE_TYPES).optional(),
  licenseKey: z.string().nullable().optional(),
  totalEntitlements: z.number().int().positive().optional(),
  purchasePrice: z.number().nonnegative().nullable().optional(),
  currency: z.string().optional(),
  purchaseDate: z.coerce.date().nullable().optional(),
  renewalDate: z.coerce.date().nullable().optional(),
  expirationDate: z.coerce.date().nullable().optional(),
  autoRenew: z.boolean().optional(),
  renewalCost: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(LICENSE_STATUSES).optional(),
});

/**
 * GET /api/v1/licenses/:id
 *
 * Retrieves a single license by ID, including its allocations.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("License ID is required", undefined, ctx.rateLimit);
  }

  try {
    const license = await getLicense(db, ctx.organizationId, id);
    return res.success(license, { requestId: ctx.requestId }, ctx.rateLimit);
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

/**
 * PUT /api/v1/licenses/:id
 *
 * Updates an existing license. Accepts partial updates.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("License ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const input = updateLicenseBody.parse(body);

  try {
    const license = await updateLicense(db, ctx.organizationId, id, input);
    return res.success(license, { requestId: ctx.requestId }, ctx.rateLimit);
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
