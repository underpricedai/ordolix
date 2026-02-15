/**
 * Asset attribute service.
 *
 * @description Validates typed attribute values against definitions,
 * generates unique asset tags, and manages attribute definitions CRUD.
 *
 * @module asset-attribute-service
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/server/lib/errors";
import type {
  CreateAttributeDefinitionInput,
  UpdateAttributeDefinitionInput,
  ReorderAttributesInput,
} from "../types/schemas";
import { ATTRIBUTE_FIELD_TYPES } from "../types/schemas";

// ── Asset Tag Generation ───────────────────────────────────────────────────

/**
 * Generates the next asset tag in the format "AST-NNNNN".
 *
 * @param db - Prisma client
 * @param organizationId - Organization ID for scoping
 * @returns Next asset tag string (e.g., "AST-00001")
 */
export async function generateAssetTag(
  db: PrismaClient,
  organizationId: string,
): Promise<string> {
  const lastAsset = await db.asset.findFirst({
    where: { organizationId },
    orderBy: { assetTag: "desc" },
    select: { assetTag: true },
  });

  let nextNum = 1;
  if (lastAsset?.assetTag) {
    const match = lastAsset.assetTag.match(/AST-(\d+)/);
    if (match?.[1]) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `AST-${String(nextNum).padStart(5, "0")}`;
}

// ── Attribute Definitions CRUD ─────────────────────────────────────────────

/**
 * Lists all attribute definitions for a given asset type, ordered by position.
 */
export async function listAttributeDefinitions(
  db: PrismaClient,
  organizationId: string,
  assetTypeId: string,
) {
  return db.assetAttributeDefinition.findMany({
    where: { organizationId, assetTypeId },
    orderBy: { position: "asc" },
  });
}

/**
 * Creates a new attribute definition for an asset type.
 */
export async function createAttributeDefinition(
  db: PrismaClient,
  organizationId: string,
  input: CreateAttributeDefinitionInput,
) {
  const assetType = await db.assetType.findFirst({
    where: { id: input.assetTypeId, organizationId },
  });
  if (!assetType) {
    throw new NotFoundError("AssetType", input.assetTypeId);
  }

  const existing = await db.assetAttributeDefinition.findFirst({
    where: { assetTypeId: input.assetTypeId, name: input.name },
  });
  if (existing) {
    throw new ConflictError(`Attribute '${input.name}' already exists for this asset type`);
  }

  return db.assetAttributeDefinition.create({
    data: {
      organizationId,
      assetTypeId: input.assetTypeId,
      name: input.name,
      label: input.label,
      fieldType: input.fieldType,
      isRequired: input.isRequired,
      options: input.options as Prisma.InputJsonValue ?? undefined,
      defaultValue: input.defaultValue,
      position: input.position,
      description: input.description,
    },
  });
}

/**
 * Updates an existing attribute definition.
 */
export async function updateAttributeDefinition(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: Omit<UpdateAttributeDefinitionInput, "id">,
) {
  const def = await db.assetAttributeDefinition.findFirst({
    where: { id, organizationId },
  });
  if (!def) {
    throw new NotFoundError("AssetAttributeDefinition", id);
  }

  return db.assetAttributeDefinition.update({
    where: { id },
    data: {
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.fieldType !== undefined ? { fieldType: input.fieldType } : {}),
      ...(input.isRequired !== undefined ? { isRequired: input.isRequired } : {}),
      ...(input.options !== undefined ? { options: input.options as Prisma.InputJsonValue } : {}),
      ...(input.defaultValue !== undefined ? { defaultValue: input.defaultValue } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
  });
}

/**
 * Deletes an attribute definition.
 */
export async function deleteAttributeDefinition(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const def = await db.assetAttributeDefinition.findFirst({
    where: { id, organizationId },
  });
  if (!def) {
    throw new NotFoundError("AssetAttributeDefinition", id);
  }

  return db.assetAttributeDefinition.delete({ where: { id } });
}

/**
 * Batch reorder attribute definitions by updating positions.
 */
export async function reorderAttributes(
  db: PrismaClient,
  organizationId: string,
  input: ReorderAttributesInput,
) {
  const assetType = await db.assetType.findFirst({
    where: { id: input.assetTypeId, organizationId },
  });
  if (!assetType) {
    throw new NotFoundError("AssetType", input.assetTypeId);
  }

  await Promise.all(
    input.order.map((item) =>
      db.assetAttributeDefinition.updateMany({
        where: { id: item.id, organizationId, assetTypeId: input.assetTypeId },
        data: { position: item.position },
      }),
    ),
  );

  return listAttributeDefinitions(db, organizationId, input.assetTypeId);
}

// ── Attribute Validation ───────────────────────────────────────────────────

/**
 * Validates attribute values against the type's attribute definitions.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param assetTypeId - Asset type to validate against
 * @param attributes - Attribute key-value pairs to validate
 * @throws ValidationError if required fields are missing or values are invalid
 */
export async function validateAttributes(
  db: PrismaClient,
  organizationId: string,
  assetTypeId: string,
  attributes: Record<string, unknown>,
): Promise<void> {
  const definitions = await listAttributeDefinitions(db, organizationId, assetTypeId);

  if (definitions.length === 0) return;

  const errors: string[] = [];

  for (const def of definitions) {
    const value = attributes[def.name];

    if (def.isRequired && (value === undefined || value === null || value === "")) {
      errors.push(`Attribute '${def.label}' is required`);
      continue;
    }

    if (value === undefined || value === null || value === "") continue;

    const valid = validateFieldValue(def.fieldType, value, def.options);
    if (!valid) {
      errors.push(`Attribute '${def.label}' has invalid value for type '${def.fieldType}'`);
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join("; "), {
      code: "INVALID_ASSET_ATTRIBUTES",
    });
  }
}

/**
 * Validates a single field value against its type.
 */
function validateFieldValue(
  fieldType: string,
  value: unknown,
  options: unknown,
): boolean {
  switch (fieldType) {
    case "text":
    case "url":
    case "ipAddress":
    case "user":
    case "reference":
      return typeof value === "string";
    case "number":
      return typeof value === "number" || (typeof value === "string" && !isNaN(Number(value)));
    case "date":
      return typeof value === "string" && !isNaN(Date.parse(value));
    case "boolean":
      return typeof value === "boolean" || value === "true" || value === "false";
    case "select": {
      if (typeof value !== "string") return false;
      const opts = Array.isArray(options) ? options : [];
      return opts.length === 0 || opts.includes(value);
    }
    default:
      return true;
  }
}
