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
  });
}

export async function updateAssetType(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: { name?: string; icon?: string; schema?: Record<string, unknown> },
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
) {
  const assetType = await db.assetType.findFirst({
    where: { id: input.assetTypeId, organizationId },
  });
  if (!assetType) {
    throw new NotFoundError("AssetType", input.assetTypeId);
  }

  return db.asset.create({
    data: {
      organizationId,
      assetTypeId: input.assetTypeId,
      name: input.name,
      status: input.status,
      attributes: input.attributes as unknown as Prisma.InputJsonValue,
    },
    include: { assetType: true },
  });
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
      relationshipsFrom: { include: { toAsset: true } },
      relationshipsTo: { include: { fromAsset: true } },
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
    },
    include: { assetType: true },
    orderBy: { createdAt: "desc" as const },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });
}

export async function updateAsset(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: { name?: string; status?: string; attributes?: Record<string, unknown> },
) {
  const asset = await db.asset.findFirst({
    where: { id, organizationId },
  });
  if (!asset) {
    throw new NotFoundError("Asset", id);
  }

  return db.asset.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.attributes !== undefined
        ? { attributes: input.attributes as unknown as Prisma.InputJsonValue }
        : {}),
    },
    include: { assetType: true },
  });
}

export async function deleteAsset(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const asset = await db.asset.findFirst({
    where: { id, organizationId },
  });
  if (!asset) {
    throw new NotFoundError("Asset", id);
  }

  return db.asset.delete({ where: { id } });
}

// ── Relationships ───────────────────────────────────────────────────────────

export async function addRelationship(
  db: PrismaClient,
  organizationId: string,
  input: AddRelationshipInput,
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

  return db.assetRelationship.create({
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
}

export async function removeRelationship(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const relationship = await db.assetRelationship.findFirst({
    where: {
      id,
      fromAsset: { organizationId },
    },
  });
  if (!relationship) {
    throw new NotFoundError("AssetRelationship", id);
  }

  return db.assetRelationship.delete({ where: { id } });
}
