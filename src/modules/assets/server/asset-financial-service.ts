/**
 * Asset financial service.
 *
 * @description Manages financial records for assets including purchase info,
 * depreciation calculations, warranty tracking, TCO analysis, and cost center
 * aggregation.
 *
 * @module asset-financial-service
 */

import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import { logAssetHistory } from "./asset-lifecycle-service";
import type { SetAssetFinancialsInput } from "../types/schemas";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a Prisma Decimal value to a plain number.
 *
 * @param value - Decimal or null value from Prisma
 * @returns number or null
 */
function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

/**
 * Serializes an AssetFinancial record, converting Decimal fields to numbers.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeFinancial(record: any) {
  return {
    ...record,
    purchasePrice: decimalToNumber(record.purchasePrice),
    salvageValue: decimalToNumber(record.salvageValue),
    maintenanceCost: decimalToNumber(record.maintenanceCost),
    disposalValue: decimalToNumber(record.disposalValue),
  };
}

// ── Get Financial Record ─────────────────────────────────────────────────────

/**
 * Retrieves the financial record for a given asset.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param assetId - The asset ID
 * @returns The financial record or null if none exists
 * @throws NotFoundError if the asset does not exist
 */
export async function getAssetFinancials(
  db: PrismaClient,
  organizationId: string,
  assetId: string,
) {
  const asset = await db.asset.findFirst({
    where: { id: assetId, organizationId },
    select: { id: true },
  });
  if (!asset) {
    throw new NotFoundError("Asset", assetId);
  }

  const record = await db.assetFinancial.findFirst({
    where: { assetId, organizationId },
  });

  return record ? serializeFinancial(record) : null;
}

// ── Set (Upsert) Financial Record ────────────────────────────────────────────

/**
 * Creates or updates the financial record for an asset.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param assetId - The asset ID
 * @param input - Financial data to set
 * @param userId - The user performing the action
 * @returns The upserted financial record
 * @throws NotFoundError if the asset does not exist
 */
export async function setAssetFinancials(
  db: PrismaClient,
  organizationId: string,
  assetId: string,
  input: SetAssetFinancialsInput,
  userId: string,
) {
  const asset = await db.asset.findFirst({
    where: { id: assetId, organizationId },
    select: { id: true },
  });
  if (!asset) {
    throw new NotFoundError("Asset", assetId);
  }

  // Validate warranty dates
  if (input.warrantyStart && input.warrantyEnd) {
    if (input.warrantyEnd < input.warrantyStart) {
      throw new ValidationError("Warranty end date must be after start date", {
        code: "INVALID_WARRANTY_DATES",
      });
    }
  }

  // Validate salvage value vs purchase price
  if (
    input.purchasePrice !== null &&
    input.purchasePrice !== undefined &&
    input.salvageValue !== null &&
    input.salvageValue !== undefined &&
    input.salvageValue > input.purchasePrice
  ) {
    throw new ValidationError(
      "Salvage value cannot exceed purchase price",
      { code: "INVALID_SALVAGE_VALUE" },
    );
  }

  const { assetId: _assetId, ...data } = input;

  const record = await db.assetFinancial.upsert({
    where: { assetId },
    create: {
      organizationId,
      assetId,
      ...data,
    },
    update: {
      ...data,
    },
  });

  // Log the financial update in asset history
  await logAssetHistory(
    db,
    organizationId,
    assetId,
    userId,
    "updated",
    "financials",
    null,
    "financial_data_updated",
  );

  return serializeFinancial(record);
}

// ── Depreciation Calculation ─────────────────────────────────────────────────

/**
 * Pure function that calculates depreciation metrics.
 *
 * @param purchasePrice - Original purchase price
 * @param salvageValue - Estimated residual value at end of life
 * @param usefulLifeMonths - Total useful life in months
 * @param depreciationMethod - "straight_line" or "declining_balance"
 * @param purchaseDate - Date of purchase
 * @returns Depreciation metrics
 */
export function calculateDepreciation(
  purchasePrice: number,
  salvageValue: number,
  usefulLifeMonths: number,
  depreciationMethod: "straight_line" | "declining_balance",
  purchaseDate: Date,
): {
  currentBookValue: number;
  accumulatedDepreciation: number;
  monthlyDepreciation: number;
  percentDepreciated: number;
} {
  const now = new Date();
  const elapsedMs = now.getTime() - purchaseDate.getTime();
  const elapsedMonths = Math.max(0, Math.floor(elapsedMs / (30.4375 * 24 * 60 * 60 * 1000)));
  const monthsUsed = Math.min(elapsedMonths, usefulLifeMonths);

  if (depreciationMethod === "straight_line") {
    const monthlyDep = (purchasePrice - salvageValue) / usefulLifeMonths;
    const accumulatedDepreciation = monthlyDep * monthsUsed;
    const currentBookValue = Math.max(salvageValue, purchasePrice - accumulatedDepreciation);
    const percentDepreciated =
      purchasePrice > 0
        ? Math.min(100, ((purchasePrice - currentBookValue) / (purchasePrice - salvageValue)) * 100)
        : 0;

    return {
      currentBookValue: Math.round(currentBookValue * 100) / 100,
      accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
      monthlyDepreciation: Math.round(monthlyDep * 100) / 100,
      percentDepreciated: Math.round(percentDepreciated * 100) / 100,
    };
  }

  // Declining balance (double-declining balance method)
  const monthlyRate = 2 / usefulLifeMonths;
  let bookValue = purchasePrice;
  let totalDepreciation = 0;
  let lastMonthlyDep = 0;

  for (let i = 0; i < monthsUsed; i++) {
    const monthlyDep = bookValue * monthlyRate;
    // Don't depreciate below salvage value
    if (bookValue - monthlyDep < salvageValue) {
      const dep = bookValue - salvageValue;
      totalDepreciation += dep;
      bookValue = salvageValue;
      lastMonthlyDep = dep;
      break;
    }
    totalDepreciation += monthlyDep;
    bookValue -= monthlyDep;
    lastMonthlyDep = monthlyDep;
  }

  const percentDepreciated =
    purchasePrice > salvageValue
      ? Math.min(100, (totalDepreciation / (purchasePrice - salvageValue)) * 100)
      : 0;

  return {
    currentBookValue: Math.round(bookValue * 100) / 100,
    accumulatedDepreciation: Math.round(totalDepreciation * 100) / 100,
    monthlyDepreciation: Math.round(lastMonthlyDep * 100) / 100,
    percentDepreciated: Math.round(percentDepreciated * 100) / 100,
  };
}

// ── Warranty Alerts ──────────────────────────────────────────────────────────

/**
 * Returns assets with warranties expiring within the given number of days.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param daysAhead - Number of days to look ahead
 * @returns Array of assets with expiring warranties
 */
export async function getWarrantyAlerts(
  db: PrismaClient,
  organizationId: string,
  daysAhead: number,
) {
  const now = new Date();
  const threshold = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const records = await db.assetFinancial.findMany({
    where: {
      organizationId,
      warrantyEnd: {
        gte: now,
        lte: threshold,
      },
    },
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          assetTag: true,
          status: true,
        },
      },
    },
    orderBy: { warrantyEnd: "asc" },
  });

  return records.map((r) => ({
    assetId: r.assetId,
    assetName: r.asset.name,
    assetTag: r.asset.assetTag,
    assetStatus: r.asset.status,
    warrantyEnd: r.warrantyEnd,
    warrantyProvider: r.warrantyProvider,
    daysRemaining: r.warrantyEnd
      ? Math.ceil((r.warrantyEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : 0,
  }));
}

// ── Total Cost of Ownership ──────────────────────────────────────────────────

/**
 * Calculates the total cost of ownership for an asset.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param assetId - The asset ID
 * @returns TCO breakdown
 * @throws NotFoundError if the asset or financial record does not exist
 */
export async function getAssetTCO(
  db: PrismaClient,
  organizationId: string,
  assetId: string,
) {
  const asset = await db.asset.findFirst({
    where: { id: assetId, organizationId },
    select: { id: true, name: true },
  });
  if (!asset) {
    throw new NotFoundError("Asset", assetId);
  }

  const financial = await db.assetFinancial.findFirst({
    where: { assetId, organizationId },
  });

  if (!financial) {
    throw new NotFoundError("AssetFinancial", assetId);
  }

  const purchasePrice = decimalToNumber(financial.purchasePrice) ?? 0;
  const maintenanceCost = decimalToNumber(financial.maintenanceCost) ?? 0;
  const disposalValue = decimalToNumber(financial.disposalValue) ?? 0;
  const totalCost = purchasePrice + maintenanceCost - disposalValue;

  return {
    assetId,
    assetName: asset.name,
    purchasePrice,
    maintenanceCost,
    disposalValue,
    totalCostOfOwnership: Math.round(totalCost * 100) / 100,
  };
}

// ── Cost Center Summary ──────────────────────────────────────────────────────

/**
 * Aggregates financial data by cost center across all assets in an org.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @returns Array of cost center summaries
 */
export async function getCostCenterSummary(
  db: PrismaClient,
  organizationId: string,
) {
  const records = await db.assetFinancial.findMany({
    where: { organizationId },
    select: {
      costCenter: true,
      purchasePrice: true,
      maintenanceCost: true,
      disposalValue: true,
    },
  });

  const summaryMap = new Map<
    string,
    { costCenter: string; totalPurchase: number; totalMaintenance: number; totalDisposal: number; assetCount: number }
  >();

  for (const record of records) {
    const key = record.costCenter ?? "unassigned";
    const existing = summaryMap.get(key) ?? {
      costCenter: key,
      totalPurchase: 0,
      totalMaintenance: 0,
      totalDisposal: 0,
      assetCount: 0,
    };

    existing.totalPurchase += decimalToNumber(record.purchasePrice) ?? 0;
    existing.totalMaintenance += decimalToNumber(record.maintenanceCost) ?? 0;
    existing.totalDisposal += decimalToNumber(record.disposalValue) ?? 0;
    existing.assetCount += 1;

    summaryMap.set(key, existing);
  }

  return Array.from(summaryMap.values()).map((s) => ({
    ...s,
    totalPurchase: Math.round(s.totalPurchase * 100) / 100,
    totalMaintenance: Math.round(s.totalMaintenance * 100) / 100,
    totalDisposal: Math.round(s.totalDisposal * 100) / 100,
    totalCost: Math.round((s.totalPurchase + s.totalMaintenance - s.totalDisposal) * 100) / 100,
  }));
}
