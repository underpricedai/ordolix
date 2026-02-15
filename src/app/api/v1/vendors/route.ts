/**
 * REST API v1 vendors collection endpoints.
 *
 * - GET /api/v1/vendors — List vendors
 * - POST /api/v1/vendors — Create a new vendor
 *
 * @module api-v1-vendors
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import { createVendor } from "@/modules/assets/server/vendor-service";

/** Query parameters for listing vendors */
const listQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for creating a vendor */
const createVendorBody = z.object({
  name: z.string().min(1).max(255),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  address: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
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
  _count: {
    select: { contracts: true },
  },
} as const;

/**
 * GET /api/v1/vendors
 *
 * Lists vendors for the authenticated organization.
 * Supports filtering by search text and active status.
 * Pagination is cursor-based.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = listQuerySchema.parse(rawParams);

  const where = {
    organizationId: ctx.organizationId,
    ...(input.search
      ? { name: { contains: input.search, mode: "insensitive" as const } }
      : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  };

  const [vendors, total] = await Promise.all([
    db.vendor.findMany({
      where,
      select: VENDOR_SELECT,
      orderBy: { name: "asc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.vendor.count({ where }),
  ]);

  const nextCursor =
    vendors.length > 0 ? vendors[vendors.length - 1]?.id ?? null : null;

  return res.success(
    vendors,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/vendors
 *
 * Creates a new vendor for the authenticated organization.
 * Requires: name.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createVendorBody.parse(body);

  const vendor = await createVendor(db, ctx.organizationId, input);

  return res.created(vendor, ctx.rateLimit);
});
