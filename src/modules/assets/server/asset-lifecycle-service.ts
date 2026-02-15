/**
 * Asset lifecycle service.
 *
 * @description Validates lifecycle transitions, enforces required fields,
 * and executes status changes with full audit trail logging.
 *
 * @module asset-lifecycle-service
 */

import type { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  ValidationError,
} from "@/server/lib/errors";
import type {
  SetLifecycleTransitionsInput,
  GetAssetHistoryInput,
  AssetStatus,
} from "../types/schemas";
import { ASSET_STATUSES } from "../types/schemas";

// ── Default Lifecycle Transitions ──────────────────────────────────────────

/**
 * Default allowed transitions when none are configured.
 */
export const DEFAULT_TRANSITIONS: Array<{ fromStatus: AssetStatus; toStatus: AssetStatus }> = [
  { fromStatus: "ordered", toStatus: "received" },
  { fromStatus: "received", toStatus: "deployed" },
  { fromStatus: "deployed", toStatus: "in_use" },
  { fromStatus: "in_use", toStatus: "maintenance" },
  { fromStatus: "maintenance", toStatus: "in_use" },
  { fromStatus: "in_use", toStatus: "retired" },
  { fromStatus: "maintenance", toStatus: "retired" },
  { fromStatus: "retired", toStatus: "disposed" },
  { fromStatus: "ordered", toStatus: "disposed" },
];

// ── Lifecycle Transition Rules ─────────────────────────────────────────────

/**
 * Lists allowed transitions for an asset type (or global defaults).
 */
export async function listLifecycleTransitions(
  db: PrismaClient,
  organizationId: string,
  assetTypeId: string | null,
) {
  const transitions = await db.assetLifecycleTransition.findMany({
    where: {
      organizationId,
      assetTypeId: assetTypeId ?? null,
    },
    orderBy: [{ fromStatus: "asc" }, { toStatus: "asc" }],
  });

  if (transitions.length === 0 && assetTypeId) {
    const globalTransitions = await db.assetLifecycleTransition.findMany({
      where: { organizationId, assetTypeId: null },
      orderBy: [{ fromStatus: "asc" }, { toStatus: "asc" }],
    });
    return globalTransitions;
  }

  return transitions;
}

/**
 * Sets lifecycle transition rules for an asset type (or globally).
 * Replaces all existing transitions for the given scope.
 */
export async function setLifecycleTransitions(
  db: PrismaClient,
  organizationId: string,
  input: SetLifecycleTransitionsInput,
) {
  // Validate that from and to statuses are different
  for (const t of input.transitions) {
    if (t.fromStatus === t.toStatus) {
      throw new ValidationError(
        `Transition from '${t.fromStatus}' to '${t.toStatus}' is not allowed (same status)`,
        { code: "INVALID_LIFECYCLE_TRANSITION" },
      );
    }
  }

  // If assetTypeId is provided, verify it exists
  if (input.assetTypeId) {
    const assetType = await db.assetType.findFirst({
      where: { id: input.assetTypeId, organizationId },
    });
    if (!assetType) {
      throw new NotFoundError("AssetType", input.assetTypeId);
    }
  }

  // Delete existing transitions for this scope
  await db.assetLifecycleTransition.deleteMany({
    where: {
      organizationId,
      assetTypeId: input.assetTypeId ?? null,
    },
  });

  // Create new transitions
  if (input.transitions.length === 0) return [];

  await db.assetLifecycleTransition.createMany({
    data: input.transitions.map((t) => ({
      organizationId,
      assetTypeId: input.assetTypeId,
      fromStatus: t.fromStatus,
      toStatus: t.toStatus,
      requiredFields: t.requiredFields,
    })),
  });

  return db.assetLifecycleTransition.findMany({
    where: {
      organizationId,
      assetTypeId: input.assetTypeId ?? null,
    },
    orderBy: [{ fromStatus: "asc" }, { toStatus: "asc" }],
  });
}

// ── Status Transitions ─────────────────────────────────────────────────────

/**
 * Validates and executes an asset status transition.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param assetId - Asset to transition
 * @param toStatus - Target status
 * @param userId - User performing the transition
 * @returns Updated asset
 * @throws NotFoundError if asset doesn't exist
 * @throws ValidationError if transition is not allowed or required fields are missing
 */
export async function transitionAssetStatus(
  db: PrismaClient,
  organizationId: string,
  assetId: string,
  toStatus: AssetStatus,
  userId: string,
) {
  const asset = await db.asset.findFirst({
    where: { id: assetId, organizationId },
    include: { assetType: true },
  });
  if (!asset) {
    throw new NotFoundError("Asset", assetId);
  }

  const fromStatus = asset.status as AssetStatus;

  if (fromStatus === toStatus) {
    throw new ValidationError(
      `Asset is already in status '${toStatus}'`,
      { code: "ASSET_ALREADY_IN_STATUS" },
    );
  }

  // Check if the transition is allowed
  const allowed = await isTransitionAllowed(
    db,
    organizationId,
    asset.assetTypeId,
    fromStatus,
    toStatus,
  );
  if (!allowed.isAllowed) {
    throw new ValidationError(
      `Transition from '${fromStatus}' to '${toStatus}' is not allowed`,
      { code: "LIFECYCLE_TRANSITION_BLOCKED" },
    );
  }

  // Check required fields
  if (allowed.requiredFields.length > 0) {
    const attributes = (asset.attributes ?? {}) as Record<string, unknown>;
    const missing = allowed.requiredFields.filter(
      (field) => !attributes[field] || attributes[field] === "",
    );
    if (missing.length > 0) {
      throw new ValidationError(
        `Required fields missing for this transition: ${missing.join(", ")}`,
        { code: "LIFECYCLE_REQUIRED_FIELDS_MISSING" },
      );
    }
  }

  // Execute the transition
  const updated = await db.asset.update({
    where: { id: assetId },
    data: { status: toStatus },
    include: { assetType: true },
  });

  // Log the transition in history
  await db.assetHistory.create({
    data: {
      organizationId,
      assetId,
      userId,
      action: "status_changed",
      field: "status",
      oldValue: fromStatus,
      newValue: toStatus,
    },
  });

  return updated;
}

/**
 * Checks if a specific transition is allowed.
 */
async function isTransitionAllowed(
  db: PrismaClient,
  organizationId: string,
  assetTypeId: string,
  fromStatus: AssetStatus,
  toStatus: AssetStatus,
): Promise<{ isAllowed: boolean; requiredFields: string[] }> {
  // First check type-specific transitions
  let transition = await db.assetLifecycleTransition.findFirst({
    where: {
      organizationId,
      assetTypeId,
      fromStatus,
      toStatus,
    },
  });

  // Fall back to global transitions
  if (!transition) {
    transition = await db.assetLifecycleTransition.findFirst({
      where: {
        organizationId,
        assetTypeId: null,
        fromStatus,
        toStatus,
      },
    });
  }

  // If no configured transitions exist at all, use defaults
  if (!transition) {
    const anyConfigured = await db.assetLifecycleTransition.count({
      where: { organizationId },
    });

    if (anyConfigured === 0) {
      const isDefault = DEFAULT_TRANSITIONS.some(
        (t) => t.fromStatus === fromStatus && t.toStatus === toStatus,
      );
      return { isAllowed: isDefault, requiredFields: [] };
    }

    return { isAllowed: false, requiredFields: [] };
  }

  const requiredFields = Array.isArray(transition.requiredFields)
    ? (transition.requiredFields as string[])
    : [];

  return { isAllowed: true, requiredFields };
}

// ── Asset History ──────────────────────────────────────────────────────────

/**
 * Retrieves paginated change history for an asset.
 */
export async function getAssetHistory(
  db: PrismaClient,
  organizationId: string,
  input: GetAssetHistoryInput,
) {
  const asset = await db.asset.findFirst({
    where: { id: input.assetId, organizationId },
    select: { id: true },
  });
  if (!asset) {
    throw new NotFoundError("Asset", input.assetId);
  }

  return db.assetHistory.findMany({
    where: { assetId: input.assetId, organizationId },
    orderBy: { createdAt: "desc" },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });
}

/**
 * Logs a history entry for an asset.
 */
export async function logAssetHistory(
  db: PrismaClient,
  organizationId: string,
  assetId: string,
  userId: string,
  action: string,
  field?: string,
  oldValue?: string | null,
  newValue?: string | null,
) {
  return db.assetHistory.create({
    data: {
      organizationId,
      assetId,
      userId,
      action,
      field: field ?? null,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
    },
  });
}
