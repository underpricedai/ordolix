/**
 * REST API v1 single vendor endpoints.
 *
 * - GET /api/v1/vendors/:id — Get vendor by ID
 * - PUT /api/v1/vendors/:id — Update a vendor
 *
 * @module api-v1-vendors-id
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import { updateVendor } from "@/modules/assets/server/vendor-service";

/** Input schema for updating a vendor */
const updateVendorBody = z.object({
  name: z.string().min(1).max(255).optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  address: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

const VENDOR_SELECT = {
  id: true,
  name: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  website: true,
  address: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  contracts: {
    select: {
      id: true,
      contractNumber: true,
      startDate: true,
      endDate: true,
      value: true,
      autoRenew: true,
      status: true,
    },
    orderBy: { startDate: "desc" as const },
  },
} as const;

/**
 * GET /api/v1/vendors/:id
 *
 * Retrieves a single vendor by ID, including its contracts.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Vendor ID is required", undefined, ctx.rateLimit);
  }

  const vendor = await db.vendor.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: VENDOR_SELECT,
  });

  if (!vendor) {
    return res.notFound("Vendor", id, ctx.rateLimit);
  }

  return res.success(vendor, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * PUT /api/v1/vendors/:id
 *
 * Updates an existing vendor. Accepts partial updates.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Vendor ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const input = updateVendorBody.parse(body);

  try {
    const vendor = await updateVendor(
      db,
      ctx.organizationId,
      id,
      input,
    );

    return res.success(vendor, { requestId: ctx.requestId }, ctx.rateLimit);
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      const appError = error as { statusCode: number; message: string };
      if (appError.statusCode === 404) {
        return res.notFound("Vendor", id, ctx.rateLimit);
      }
    }
    throw error;
  }
});
