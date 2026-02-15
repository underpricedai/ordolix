/**
 * Asset CSV export service.
 *
 * @description Handles CSV export for assets: querying assets,
 * building CSV strings with typed attribute columns, and generating
 * empty CSV templates from attribute definitions.
 *
 * @module export-service
 */

import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";
import type { ExportAssetsInput } from "../types/schemas";

// ── CSV Generation ───────────────────────────────────────────────────────────

/**
 * Escapes a CSV value, wrapping in quotes if it contains commas or quotes.
 *
 * @param value - String value to escape
 * @returns Escaped CSV value
 */
function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Builds a CSV string from headers and rows.
 *
 * @param headers - Column header names
 * @param rows - Array of row value arrays
 * @returns CSV string
 */
export function toCsv(headers: string[], rows: string[][]): string {
  return [
    headers.map(escapeCsv).join(","),
    ...rows.map((r) => r.map(escapeCsv).join(",")),
  ].join("\n");
}

// ── Row Serialization ────────────────────────────────────────────────────────

/** Attribute definition shape for export */
interface ExportAttributeDef {
  name: string;
  label: string;
  fieldType: string;
}

/**
 * Serializes a single asset's attributes to a CSV row array.
 *
 * @param asset - Asset record with name, status, and attributes
 * @param definitions - Attribute definitions for the asset type
 * @returns Array of string values matching the column order
 */
export function buildCsvRow(
  asset: { name: string; status: string; assetTag: string; attributes: Record<string, unknown> },
  definitions: ExportAttributeDef[],
): string[] {
  const row: string[] = [asset.assetTag, asset.name, asset.status];

  for (const def of definitions) {
    const value = asset.attributes[def.name];
    if (value === null || value === undefined) {
      row.push("");
    } else if (typeof value === "boolean") {
      row.push(value ? "true" : "false");
    } else if (value instanceof Date) {
      row.push(value.toISOString());
    } else {
      row.push(String(value));
    }
  }

  return row;
}

// ── Export Assets ────────────────────────────────────────────────────────────

/**
 * Exports assets for an asset type as a CSV string.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param input - Export filters (assetTypeId, optional status and search)
 * @returns Object with csvContent string, fileName, and row count
 * @throws NotFoundError if asset type not found
 */
export async function exportAssets(
  db: PrismaClient,
  organizationId: string,
  input: ExportAssetsInput,
) {
  const assetType = await db.assetType.findFirst({
    where: { id: input.assetTypeId, organizationId },
  });
  if (!assetType) {
    throw new NotFoundError("AssetType", input.assetTypeId);
  }

  const definitions = await db.assetAttributeDefinition.findMany({
    where: { organizationId, assetTypeId: input.assetTypeId },
    orderBy: { position: "asc" },
  });

  const where = {
    organizationId,
    assetTypeId: input.assetTypeId,
    ...(input.status ? { status: input.status } : {}),
    ...(input.search
      ? { name: { contains: input.search, mode: "insensitive" as const } }
      : {}),
  };

  const assets = await db.asset.findMany({
    where,
    orderBy: { name: "asc" },
  });

  const headers = [
    "Asset Tag",
    "Name",
    "Status",
    ...definitions.map((d) => d.label),
  ];

  const rows = assets.map((asset) =>
    buildCsvRow(
      {
        name: asset.name,
        status: asset.status,
        assetTag: asset.assetTag,
        attributes: (asset.attributes as Record<string, unknown>) ?? {},
      },
      definitions,
    ),
  );

  const csvContent = toCsv(headers, rows);

  return {
    csvContent,
    fileName: `${assetType.name.toLowerCase().replace(/\s+/g, "-")}-export.csv`,
    rowCount: assets.length,
  };
}

// ── Export Template ──────────────────────────────────────────────────────────

/**
 * Generates an empty CSV template with headers from attribute definitions.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param assetTypeId - Asset type to generate template for
 * @returns Object with csvContent (headers only) and fileName
 * @throws NotFoundError if asset type not found
 */
export async function getExportTemplate(
  db: PrismaClient,
  organizationId: string,
  assetTypeId: string,
) {
  const assetType = await db.assetType.findFirst({
    where: { id: assetTypeId, organizationId },
  });
  if (!assetType) {
    throw new NotFoundError("AssetType", assetTypeId);
  }

  const definitions = await db.assetAttributeDefinition.findMany({
    where: { organizationId, assetTypeId },
    orderBy: { position: "asc" },
  });

  const headers = [
    "Name",
    "Status",
    ...definitions.map((d) => d.label),
  ];

  const csvContent = toCsv(headers, []);

  return {
    csvContent,
    fileName: `${assetType.name.toLowerCase().replace(/\s+/g, "-")}-template.csv`,
    headers,
  };
}
