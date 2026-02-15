/**
 * Core asset service.
 *
 * @description CRUD operations for asset types and assets, including
 * relationships. Integrates with typed attribute validation and
 * history logging.
 *
 * @module asset-service
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/server/lib/errors";
import type {
  CreateAssetTypeInput,
  CreateAssetInput,
  ListAssetsInput,
  AddRelationshipInput,
} from "../types/schemas";
import { generateAssetTag, validateAttributes } from "./asset-attribute-service";
import { logAssetHistory } from "./asset-lifecycle-service";

// ── Asset Types ─────────────────────────────────────────────────────────────

export async function createAssetType(
  db: PrismaClient,
  organizationId: string,
  input: CreateAssetTypeInput,
) {
  const existing = await db.assetType.findFirst({
    where: { organizationId, name: input.name },
  });
  if (existing) {
    throw new ConflictError(`Asset type '${input.name}' already exists`);
  }

  return db.assetType.create({
    data: {
      organizationId,
      name: input.name,
      icon: input.icon,
      description: input.description,
      color: input.color,
      schema: input.schema as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function listAssetTypes(
  db: PrismaClient,
  organizationId: string,
) {
  return db.assetType.findMany({
    where: { organizationId },
    orderBy: { name: "asc" as const },
    include: {
      _count: { select: { assets: true, attributeDefinitions: true } },
    },
  });
}

export async function updateAssetType(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: {
    name?: string;
    icon?: string;
    description?: string;
    color?: string;
    schema?: Record<string, unknown>;
  },
) {
  const assetType = await db.assetType.findFirst({
    where: { id, organizationId },
  });
  if (!assetType) {
    throw new NotFoundError("AssetType", id);
  }

  if (input.name && input.name !== assetType.name) {
    const conflict = await db.assetType.findFirst({
      where: { organizationId, name: input.name },
    });
    if (conflict) {
      throw new ConflictError(`Asset type '${input.name}' already exists`);
    }
  }

  return db.assetType.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.schema !== undefined
        ? { schema: input.schema as unknown as Prisma.InputJsonValue }
        : {}),
    },
  });
}

export async function deleteAssetType(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const assetType = await db.assetType.findFirst({
    where: { id, organizationId },
  });
  if (!assetType) {
    throw new NotFoundError("AssetType", id);
  }

  return db.assetType.delete({ where: { id } });
}

// ── Assets ──────────────────────────────────────────────────────────────────

export async function createAsset(
  db: PrismaClient,
  organizationId: string,
  input: CreateAssetInput,
  userId: string,
) {
  const assetType = await db.assetType.findFirst({
    where: { id: input.assetTypeId, organizationId },
  });
  if (!assetType) {
    throw new NotFoundError("AssetType", input.assetTypeId);
  }

  // Validate typed attributes
  await validateAttributes(db, organizationId, input.assetTypeId, input.attributes);

  // Generate unique asset tag
  const assetTag = await generateAssetTag(db, organizationId);

  const asset = await db.asset.create({
    data: {
      organizationId,
      assetTypeId: input.assetTypeId,
      assetTag,
      name: input.name,
      status: input.status,
      assigneeId: input.assigneeId,
      attributes: input.attributes as unknown as Prisma.InputJsonValue,
    },
    include: { assetType: true },
  });

  // Log creation in history
  await logAssetHistory(db, organizationId, asset.id, userId, "created");

  return asset;
}

export async function getAsset(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const asset = await db.asset.findFirst({
    where: { id, organizationId },
    include: {
      assetType: true,
      assignee: { select: { id: true, name: true, email: true, image: true } },
      relationshipsFrom: { include: { toAsset: { include: { assetType: true } } } },
      relationshipsTo: { include: { fromAsset: { include: { assetType: true } } } },
      history: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!asset) {
    throw new NotFoundError("Asset", id);
  }
  return asset;
}

export async function listAssets(
  db: PrismaClient,
  organizationId: string,
  input: ListAssetsInput,
) {
  return db.asset.findMany({
    where: {
      organizationId,
      ...(input.assetTypeId ? { assetTypeId: input.assetTypeId } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.assigneeId ? { assigneeId: input.assigneeId } : {}),
    },
    include: {
      assetType: true,
      assignee: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" as const },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });
}

export async function updateAsset(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: {
    name?: string;
    status?: string;
    assigneeId?: string | null;
    attributes?: Record<string, unknown>;
  },
  userId: string,
) {
  const asset = await db.asset.findFirst({
    where: { id, organizationId },
  });
  if (!asset) {
    throw new NotFoundError("Asset", id);
  }

  // Validate typed attributes if provided
  if (input.attributes) {
    await validateAttributes(db, organizationId, asset.assetTypeId, input.attributes);
  }

  // Build diff for history logging
  const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];
  if (input.name !== undefined && input.name !== asset.name) {
    changes.push({ field: "name", oldValue: asset.name, newValue: input.name });
  }
  if (input.status !== undefined && input.status !== asset.status) {
    changes.push({ field: "status", oldValue: asset.status, newValue: input.status });
  }
  if (input.assigneeId !== undefined && input.assigneeId !== asset.assigneeId) {
    changes.push({
      field: "assigneeId",
      oldValue: asset.assigneeId,
      newValue: input.assigneeId ?? null,
    });
  }
  if (input.attributes !== undefined) {
    const oldAttrs = (asset.attributes ?? {}) as Record<string, unknown>;
    const newAttrs = input.attributes;
    for (const key of new Set([...Object.keys(oldAttrs), ...Object.keys(newAttrs)])) {
      const oldVal = oldAttrs[key];
      const newVal = newAttrs[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field: key,
          oldValue: oldVal !== undefined ? String(oldVal) : null,
          newValue: newVal !== undefined ? String(newVal) : null,
        });
      }
    }
  }

  const updated = await db.asset.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
      ...(input.attributes !== undefined
        ? { attributes: input.attributes as unknown as Prisma.InputJsonValue }
        : {}),
    },
    include: { assetType: true },
  });

  // Log changes to history
  for (const change of changes) {
    await logAssetHistory(
      db,
      organizationId,
      id,
      userId,
      change.field === "status" ? "status_changed" : "updated",
      change.field,
      change.oldValue,
      change.newValue,
    );
  }

  return updated;
}

export async function deleteAsset(
  db: PrismaClient,
  organizationId: string,
  id: string,
  userId: string,
) {
  const asset = await db.asset.findFirst({
    where: { id, organizationId },
  });
  if (!asset) {
    throw new NotFoundError("Asset", id);
  }

  // Log deletion before deleting
  await logAssetHistory(db, organizationId, id, userId, "deleted");

  return db.asset.delete({ where: { id } });
}

// ── Relationships ───────────────────────────────────────────────────────────

export async function addRelationship(
  db: PrismaClient,
  organizationId: string,
  input: AddRelationshipInput,
  userId: string,
) {
  if (input.fromAssetId === input.toAssetId) {
    throw new ValidationError("An asset cannot have a relationship with itself", {
      code: "SELF_REFERENCE_NOT_ALLOWED",
    });
  }

  const [fromAsset, toAsset] = await Promise.all([
    db.asset.findFirst({ where: { id: input.fromAssetId, organizationId } }),
    db.asset.findFirst({ where: { id: input.toAssetId, organizationId } }),
  ]);

  if (!fromAsset) {
    throw new NotFoundError("Asset", input.fromAssetId);
  }
  if (!toAsset) {
    throw new NotFoundError("Asset", input.toAssetId);
  }

  const relationship = await db.assetRelationship.create({
    data: {
      fromAssetId: input.fromAssetId,
      toAssetId: input.toAssetId,
      relationshipType: input.relationshipType,
    },
    include: {
      fromAsset: true,
      toAsset: true,
    },
  });

  // Log relationship change on both assets
  await logAssetHistory(
    db,
    organizationId,
    input.fromAssetId,
    userId,
    "relationship_changed",
    "relationship",
    null,
    `${input.relationshipType} -> ${toAsset.name}`,
  );

  return relationship;
}

export async function removeRelationship(
  db: PrismaClient,
  organizationId: string,
  id: string,
  userId: string,
) {
  const relationship = await db.assetRelationship.findFirst({
    where: {
      id,
      fromAsset: { organizationId },
    },
    include: { fromAsset: true, toAsset: true },
  });
  if (!relationship) {
    throw new NotFoundError("AssetRelationship", id);
  }

  await logAssetHistory(
    db,
    organizationId,
    relationship.fromAssetId,
    userId,
    "relationship_changed",
    "relationship",
    `${relationship.relationshipType} -> ${relationship.toAsset.name}`,
    null,
  );

  return db.assetRelationship.delete({ where: { id } });
}
