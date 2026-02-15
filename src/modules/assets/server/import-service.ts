/**
 * Asset CSV import service.
 *
 * @description Handles CSV import for assets: column auto-mapping,
 * row validation, import job lifecycle, and batch asset creation.
 *
 * @module import-service
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import type {
  StartImportInput,
  ValidateImportPreviewInput,
  ListImportJobsInput,
} from "../types/schemas";
import { ASSET_STATUSES } from "../types/schemas";
import { generateAssetTag } from "./asset-attribute-service";

// ── CSV Parsing ──────────────────────────────────────────────────────────────

/**
 * Parses a CSV string into headers and row objects.
 *
 * @param content - Raw CSV string
 * @returns Parsed headers and row array
 */
export function parseCsv(content: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = content.trim().split("\n");
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  const headers = lines[0]!
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
  return { headers, rows };
}

// ── Column Auto-Mapping ──────────────────────────────────────────────────────

/** Attribute definition shape expected by the mapper */
export interface AttributeDef {
  name: string;
  label: string;
  fieldType: string;
}

/**
 * Auto-maps CSV column headers to attribute definitions using
 * case-insensitive substring matching.
 *
 * @param headers - CSV column header names
 * @param definitions - Attribute definitions for the asset type
 * @returns Mapping of CSV column name to attribute definition name
 */
export function autoMapColumns(
  headers: string[],
  definitions: AttributeDef[],
): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const header of headers) {
    const lower = header.toLowerCase().trim();

    // Check built-in fields first
    if (lower === "name" || lower === "asset name") {
      mapping[header] = "__name";
      continue;
    }
    if (lower === "status" || lower === "asset status") {
      mapping[header] = "__status";
      continue;
    }

    // Try exact match on definition name or label (case-insensitive)
    const exactMatch = definitions.find(
      (d) =>
        d.name.toLowerCase() === lower || d.label.toLowerCase() === lower,
    );
    if (exactMatch) {
      mapping[header] = exactMatch.name;
      continue;
    }

    // Try substring match
    const substringMatch = definitions.find(
      (d) =>
        lower.includes(d.name.toLowerCase()) ||
        lower.includes(d.label.toLowerCase()) ||
        d.name.toLowerCase().includes(lower) ||
        d.label.toLowerCase().includes(lower),
    );
    if (substringMatch) {
      mapping[header] = substringMatch.name;
    }
  }

  return mapping;
}

// ── Row Validation ───────────────────────────────────────────────────────────

export interface RowValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
  values: Record<string, unknown>;
}

/**
 * Validates a single CSV row against attribute definitions and the column mapping.
 *
 * @param row - Parsed CSV row (header -> value)
 * @param definitions - Attribute definitions for the asset type
 * @param mapping - Column mapping (CSV header -> attribute name)
 * @returns Validation result with parsed values and per-field errors
 */
export function validateImportRow(
  row: Record<string, string>,
  definitions: AttributeDef[],
  mapping: Record<string, string>,
): RowValidationResult {
  const errors: { field: string; message: string }[] = [];
  const values: Record<string, unknown> = {};

  for (const [csvHeader, attrName] of Object.entries(mapping)) {
    const rawValue = row[csvHeader] ?? "";

    // Built-in: name
    if (attrName === "__name") {
      if (!rawValue.trim()) {
        errors.push({ field: csvHeader, message: "Name is required" });
      } else {
        values.__name = rawValue.trim();
      }
      continue;
    }

    // Built-in: status
    if (attrName === "__status") {
      const normalized = rawValue.trim().toLowerCase().replace(/\s+/g, "_");
      if (rawValue.trim() && !(ASSET_STATUSES as readonly string[]).includes(normalized)) {
        errors.push({
          field: csvHeader,
          message: `Invalid status. Valid: ${ASSET_STATUSES.join(", ")}`,
        });
      } else if (rawValue.trim()) {
        values.__status = normalized;
      }
      continue;
    }

    // Find definition
    const def = definitions.find((d) => d.name === attrName);
    if (!def) continue;

    if (!rawValue.trim()) {
      // Skip empty values — required check is separate
      continue;
    }

    // Type-specific validation
    const parsed = validateFieldValue(def.fieldType, rawValue.trim(), csvHeader);
    if (parsed.error) {
      errors.push(parsed.error);
    } else {
      values[attrName] = parsed.value;
    }
  }

  return { valid: errors.length === 0, errors, values };
}

/**
 * Validates and parses a single field value based on its type.
 */
function validateFieldValue(
  fieldType: string,
  rawValue: string,
  fieldName: string,
): { value?: unknown; error?: { field: string; message: string } } {
  switch (fieldType) {
    case "text":
    case "url":
    case "ipAddress":
    case "user":
    case "reference":
    case "select":
      return { value: rawValue };

    case "number": {
      const num = Number(rawValue);
      if (isNaN(num)) {
        return { error: { field: fieldName, message: "Must be a valid number" } };
      }
      return { value: num };
    }

    case "date": {
      const d = Date.parse(rawValue);
      if (isNaN(d)) {
        return { error: { field: fieldName, message: "Must be a valid date" } };
      }
      return { value: rawValue };
    }

    case "boolean": {
      const lower = rawValue.toLowerCase();
      if (!["true", "false", "yes", "no", "1", "0"].includes(lower)) {
        return { error: { field: fieldName, message: "Must be true/false, yes/no, or 1/0" } };
      }
      return { value: ["true", "yes", "1"].includes(lower) };
    }

    default:
      return { value: rawValue };
  }
}

// ── Import Job Lifecycle ─────────────────────────────────────────────────────

/**
 * Creates a new import job record in pending status.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param userId - ID of user initiating the import
 * @param input - Import configuration
 * @returns Created import job record
 */
export async function startImport(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: StartImportInput,
) {
  // Verify asset type exists
  const assetType = await db.assetType.findFirst({
    where: { id: input.assetTypeId, organizationId },
  });
  if (!assetType) {
    throw new NotFoundError("AssetType", input.assetTypeId);
  }

  const { rows } = parseCsv(input.csvContent);

  return db.assetImportJob.create({
    data: {
      organizationId,
      userId,
      fileName: input.fileName,
      assetTypeId: input.assetTypeId,
      status: "pending",
      totalRows: rows.length,
      columnMapping: input.columnMapping as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * Gets the status of an import job.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param jobId - Import job ID
 * @returns Import job record
 * @throws NotFoundError if job not found
 */
export async function getImportStatus(
  db: PrismaClient,
  organizationId: string,
  jobId: string,
) {
  const job = await db.assetImportJob.findFirst({
    where: { id: jobId, organizationId },
  });
  if (!job) {
    throw new NotFoundError("AssetImportJob", jobId);
  }
  return job;
}

/**
 * Lists import jobs with optional status filter and cursor pagination.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param input - Filter and pagination options
 * @returns Array of import job records
 */
export async function listImportJobs(
  db: PrismaClient,
  organizationId: string,
  input: ListImportJobsInput,
) {
  const where = {
    organizationId,
    ...(input.status ? { status: input.status } : {}),
  };

  return db.assetImportJob.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });
}

/**
 * Cancels an import job by setting its status to "failed".
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param jobId - Import job ID
 * @returns Updated import job record
 * @throws NotFoundError if job not found
 * @throws ValidationError if job is already completed
 */
export async function cancelImport(
  db: PrismaClient,
  organizationId: string,
  jobId: string,
) {
  const job = await db.assetImportJob.findFirst({
    where: { id: jobId, organizationId },
  });
  if (!job) {
    throw new NotFoundError("AssetImportJob", jobId);
  }
  if (job.status === "completed") {
    throw new ValidationError("Cannot cancel a completed import job");
  }

  return db.assetImportJob.update({
    where: { id: jobId },
    data: {
      status: "failed",
      errors: [{ message: "Import cancelled by user" }] as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
  });
}

/**
 * Validates first N rows of CSV data without persisting, returning
 * a preview with per-cell validation errors.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param input - Preview configuration
 * @returns Preview results with headers, rows, and per-row errors
 */
export async function validateImportPreview(
  db: PrismaClient,
  organizationId: string,
  input: ValidateImportPreviewInput,
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

  const { headers, rows } = parseCsv(input.csvContent);
  const previewRows = rows.slice(0, input.maxRows);

  // Auto-map if no mapping provided
  const mapping =
    Object.keys(input.columnMapping).length > 0
      ? input.columnMapping
      : autoMapColumns(headers, definitions);

  const results = previewRows.map((row, index) => {
    const validation = validateImportRow(row, definitions, mapping);
    return {
      rowIndex: index,
      rawData: row,
      valid: validation.valid,
      errors: validation.errors,
      parsedValues: validation.values,
    };
  });

  return {
    headers,
    mapping,
    totalRows: rows.length,
    previewRows: results,
    validCount: results.filter((r) => r.valid).length,
    errorCount: results.filter((r) => !r.valid).length,
  };
}

/**
 * Processes all rows of an import job, creating assets one by one
 * and updating progress counts.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param jobId - Import job ID
 * @param csvContent - The CSV content to process
 * @returns Updated import job record
 */
export async function processImport(
  db: PrismaClient,
  organizationId: string,
  jobId: string,
  csvContent: string,
) {
  const job = await db.assetImportJob.findFirst({
    where: { id: jobId, organizationId },
  });
  if (!job) {
    throw new NotFoundError("AssetImportJob", jobId);
  }

  // Mark as processing
  await db.assetImportJob.update({
    where: { id: jobId },
    data: { status: "processing" },
  });

  const definitions = await db.assetAttributeDefinition.findMany({
    where: { organizationId, assetTypeId: job.assetTypeId },
    orderBy: { position: "asc" },
  });

  const { rows } = parseCsv(csvContent);
  const mapping = job.columnMapping as Record<string, string>;
  const importErrors: Array<{ row: number; errors: { field: string; message: string }[] }> = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const validation = validateImportRow(row, definitions, mapping);

    if (!validation.valid) {
      importErrors.push({ row: i + 1, errors: validation.errors });
      await db.assetImportJob.update({
        where: { id: jobId },
        data: {
          processedRows: i + 1,
          errorCount: importErrors.length,
          errors: importErrors as unknown as Prisma.InputJsonValue,
        },
      });
      continue;
    }

    try {
      const assetTag = await generateAssetTag(db, organizationId);
      const name = (validation.values.__name as string) || `Import-${i + 1}`;
      const status = (validation.values.__status as string) || "ordered";

      // Build attributes (exclude built-in fields)
      const attributes: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(validation.values)) {
        if (!key.startsWith("__")) {
          attributes[key] = value;
        }
      }

      await db.asset.create({
        data: {
          organizationId,
          assetTypeId: job.assetTypeId,
          assetTag,
          name,
          status,
          attributes: attributes as unknown as Prisma.InputJsonValue,
        },
      });

      successCount++;
    } catch (err) {
      importErrors.push({
        row: i + 1,
        errors: [{ field: "general", message: String(err) }],
      });
    }

    await db.assetImportJob.update({
      where: { id: jobId },
      data: {
        processedRows: i + 1,
        successCount,
        errorCount: importErrors.length,
        errors: importErrors as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // Mark as completed
  const finalStatus = importErrors.length > 0 && successCount === 0 ? "failed" : "completed";
  return db.assetImportJob.update({
    where: { id: jobId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      successCount,
      errorCount: importErrors.length,
      errors: importErrors as unknown as Prisma.InputJsonValue,
    },
  });
}
