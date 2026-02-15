/**
 * REST API v1 software licenses collection endpoints.
 *
 * - GET /api/v1/licenses — List software licenses
 * - POST /api/v1/licenses — Create a new software license
 *
 * @module api-v1-licenses
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import { LICENSE_TYPES, LICENSE_STATUSES } from "@/modules/assets/types/schemas";
import { createLicense, listLicenses } from "@/modules/assets/server/license-service";

/** Query parameters for listing licenses */
const listQuerySchema = z.object({
  status: z.string().optional(),
  vendor: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/** Input schema for creating a license */
const createLicenseBody = z.object({
  name: z.string().min(1).max(255),
  vendor: z.string().nullable().optional(),
  licenseType: z.enum(LICENSE_TYPES),
  licenseKey: z.string().nullable().optional(),
  totalEntitlements: z.number().int().positive().default(1),
  purchasePrice: z.number().nonnegative().nullable().optional(),
  currency: z.string().default("USD"),
  purchaseDate: z.coerce.date().nullable().optional(),
  renewalDate: z.coerce.date().nullable().optional(),
  expirationDate: z.coerce.date().nullable().optional(),
  autoRenew: z.boolean().default(false),
  renewalCost: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(LICENSE_STATUSES).default("active"),
});

/**
 * GET /api/v1/licenses
 *
 * Lists software licenses for the authenticated organization.
 * Supports filtering by status, vendor, and search text.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = listQuerySchema.parse(rawParams);

  const licenses = await listLicenses(db, ctx.organizationId, {
    status: input.status as typeof LICENSE_STATUSES[number] | undefined,
    vendor: input.vendor,
    search: input.search,
    limit: input.limit,
    cursor: input.cursor,
  });

  const nextCursor =
    licenses.length > 0 ? licenses[licenses.length - 1]?.id ?? null : null;

  return res.success(
    licenses,
    { total: licenses.length, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/licenses
 *
 * Creates a new software license for the authenticated organization.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createLicenseBody.parse(body);

  const license = await createLicense(db, ctx.organizationId, input);

  return res.created(license, ctx.rateLimit);
});
