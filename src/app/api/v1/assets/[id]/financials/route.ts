/**
 * REST API v1 asset financials endpoints.
 *
 * - GET /api/v1/assets/:id/financials — Get financial record for an asset
 * - PUT /api/v1/assets/:id/financials — Upsert financial record for an asset
 *
 * @module api-v1-assets-financials
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../../lib/handler";
import * as res from "../../../lib/response";
import {
  getAssetFinancials,
  setAssetFinancials,
} from "@/modules/assets/server/asset-financial-service";
import { COST_TYPES, DEPRECIATION_METHODS } from "@/modules/assets/types/schemas";

/** Input schema for updating financial data */
const updateFinancialsInput = z.object({
  purchasePrice: z.number().nonnegative().nullable().optional(),
  purchaseCurrency: z.string().default("USD"),
  purchaseDate: z.coerce.date().nullable().optional(),
  costCenter: z.string().nullable().optional(),
  costType: z.enum(COST_TYPES).nullable().optional(),
  depreciationMethod: z.enum(DEPRECIATION_METHODS).nullable().optional(),
  usefulLifeMonths: z.number().int().positive().nullable().optional(),
  salvageValue: z.number().nonnegative().nullable().optional(),
  warrantyStart: z.coerce.date().nullable().optional(),
  warrantyEnd: z.coerce.date().nullable().optional(),
  warrantyProvider: z.string().nullable().optional(),
  warrantyNotes: z.string().nullable().optional(),
  maintenanceCost: z.number().nonnegative().nullable().optional(),
  disposalValue: z.number().nonnegative().nullable().optional(),
  disposalDate: z.coerce.date().nullable().optional(),
});

/**
 * GET /api/v1/assets/:id/financials
 *
 * Retrieves the financial record for a specific asset.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Asset ID is required", undefined, ctx.rateLimit);
  }

  try {
    const financials = await getAssetFinancials(db, ctx.organizationId, id);
    return res.success(financials, { requestId: ctx.requestId }, ctx.rateLimit);
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      const appError = error as { statusCode: number; message: string };
      if (appError.statusCode === 404) {
        return res.notFound("Asset", id, ctx.rateLimit);
      }
    }
    throw error;
  }
});

/**
 * PUT /api/v1/assets/:id/financials
 *
 * Creates or updates the financial record for an asset.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Asset ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const input = updateFinancialsInput.parse(body);

  try {
    const financials = await setAssetFinancials(
      db,
      ctx.organizationId,
      id,
      { assetId: id, ...input },
      ctx.userId ?? "system",
    );

    return res.success(financials, { requestId: ctx.requestId }, ctx.rateLimit);
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      const appError = error as { statusCode: number; message: string };
      if (appError.statusCode === 404) {
        return res.notFound("Asset", id, ctx.rateLimit);
      }
      if (appError.statusCode === 400) {
        return res.badRequest(appError.message, undefined, ctx.rateLimit);
      }
    }
    throw error;
  }
});
