/**
 * Software license service.
 *
 * @description CRUD operations for software licenses and allocation
 * management. Handles entitlement limit enforcement and allocation
 * lifecycle (allocate / revoke).
 *
 * @module license-service
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/server/lib/errors";
import type {
  CreateLicenseInput,
  ListLicensesInput,
} from "../types/schemas";

// ── License CRUD ─────────────────────────────────────────────────────────────

/**
 * Creates a new software license.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param input - License creation data
 * @returns The newly created license
 */
export async function createLicense(
  db: PrismaClient,
  organizationId: string,
  input: CreateLicenseInput,
) {
  return db.softwareLicense.create({
    data: {
      organizationId,
      name: input.name,
      vendor: input.vendor ?? null,
      licenseType: input.licenseType,
      licenseKey: input.licenseKey ?? null,
      totalEntitlements: input.totalEntitlements,
      purchasePrice: input.purchasePrice != null
        ? input.purchasePrice
        : null,
      currency: input.currency,
      purchaseDate: input.purchaseDate ?? null,
      renewalDate: input.renewalDate ?? null,
      expirationDate: input.expirationDate ?? null,
      autoRenew: input.autoRenew,
      renewalCost: input.renewalCost != null
        ? input.renewalCost
        : null,
      notes: input.notes ?? null,
      status: input.status,
    },
  });
}

/**
 * Gets a single license by ID with its allocations.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param id - License ID
 * @returns The license with allocations
 * @throws NotFoundError if license does not exist
 */
export async function getLicense(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const license = await db.softwareLicense.findFirst({
    where: { id, organizationId },
    include: {
      allocations: {
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { allocatedAt: "desc" as const },
      },
    },
  });
  if (!license) {
    throw new NotFoundError("SoftwareLicense", id);
  }
  return license;
}

/**
 * Lists licenses for an organization with optional filters.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param input - Filter and pagination options
 * @returns Array of licenses with allocation counts
 */
export async function listLicenses(
  db: PrismaClient,
  organizationId: string,
  input: ListLicensesInput,
) {
  const where: Prisma.SoftwareLicenseWhereInput = {
    organizationId,
    ...(input.status ? { status: input.status } : {}),
    ...(input.vendor
      ? { vendor: { contains: input.vendor, mode: "insensitive" as const } }
      : {}),
    ...(input.search
      ? { name: { contains: input.search, mode: "insensitive" as const } }
      : {}),
  };

  return db.softwareLicense.findMany({
    where,
    include: {
      _count: {
        select: {
          allocations: {
            where: { revokedAt: null },
          },
        },
      },
    },
    orderBy: { name: "asc" as const },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });
}

/**
 * Updates an existing license.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param id - License ID
 * @param input - Partial license update data
 * @returns The updated license
 * @throws NotFoundError if license does not exist
 */
export async function updateLicense(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: {
    name?: string;
    vendor?: string | null;
    licenseType?: string;
    licenseKey?: string | null;
    totalEntitlements?: number;
    purchasePrice?: number | null;
    currency?: string;
    purchaseDate?: Date | null;
    renewalDate?: Date | null;
    expirationDate?: Date | null;
    autoRenew?: boolean;
    renewalCost?: number | null;
    notes?: string | null;
    status?: string;
  },
) {
  const license = await db.softwareLicense.findFirst({
    where: { id, organizationId },
  });
  if (!license) {
    throw new NotFoundError("SoftwareLicense", id);
  }

  return db.softwareLicense.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.vendor !== undefined ? { vendor: input.vendor } : {}),
      ...(input.licenseType !== undefined ? { licenseType: input.licenseType } : {}),
      ...(input.licenseKey !== undefined ? { licenseKey: input.licenseKey } : {}),
      ...(input.totalEntitlements !== undefined ? { totalEntitlements: input.totalEntitlements } : {}),
      ...(input.purchasePrice !== undefined
        ? { purchasePrice: input.purchasePrice != null ? input.purchasePrice : null }
        : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.purchaseDate !== undefined ? { purchaseDate: input.purchaseDate } : {}),
      ...(input.renewalDate !== undefined ? { renewalDate: input.renewalDate } : {}),
      ...(input.expirationDate !== undefined ? { expirationDate: input.expirationDate } : {}),
      ...(input.autoRenew !== undefined ? { autoRenew: input.autoRenew } : {}),
      ...(input.renewalCost !== undefined
        ? { renewalCost: input.renewalCost != null ? input.renewalCost : null }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });
}

/**
 * Deletes a license.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param id - License ID
 * @returns The deleted license
 * @throws NotFoundError if license does not exist
 */
export async function deleteLicense(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const license = await db.softwareLicense.findFirst({
    where: { id, organizationId },
  });
  if (!license) {
    throw new NotFoundError("SoftwareLicense", id);
  }

  return db.softwareLicense.delete({ where: { id } });
}

// ── Allocations ──────────────────────────────────────────────────────────────

/**
 * Allocates a license to an asset and/or user.
 *
 * @description Validates entitlement limits before creating the allocation.
 * At least one of assetId or userId must be provided.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param licenseId - License ID to allocate
 * @param target - Allocation target (assetId and/or userId)
 * @returns The created allocation
 * @throws NotFoundError if license does not exist
 * @throws ValidationError if neither assetId nor userId is provided
 * @throws ConflictError if entitlement limit would be exceeded
 */
export async function allocateLicense(
  db: PrismaClient,
  organizationId: string,
  licenseId: string,
  target: { assetId?: string; userId?: string },
) {
  if (!target.assetId && !target.userId) {
    throw new ValidationError("Either assetId or userId must be provided", {
      code: "ALLOCATION_TARGET_REQUIRED",
    });
  }

  const license = await db.softwareLicense.findFirst({
    where: { id: licenseId, organizationId },
  });
  if (!license) {
    throw new NotFoundError("SoftwareLicense", licenseId);
  }

  // Count active (non-revoked) allocations
  const activeCount = await db.softwareLicenseAllocation.count({
    where: { licenseId, revokedAt: null },
  });

  if (activeCount >= license.totalEntitlements) {
    throw new ConflictError(
      `License entitlement limit reached (${license.totalEntitlements})`,
      { code: "ENTITLEMENT_LIMIT_EXCEEDED", current: activeCount, limit: license.totalEntitlements },
    );
  }

  return db.softwareLicenseAllocation.create({
    data: {
      licenseId,
      assetId: target.assetId ?? null,
      userId: target.userId ?? null,
    },
    include: {
      asset: { select: { id: true, name: true, assetTag: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

/**
 * Revokes a license allocation by setting revokedAt timestamp.
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param allocationId - Allocation ID to revoke
 * @returns The updated allocation with revokedAt set
 * @throws NotFoundError if allocation does not exist
 * @throws ConflictError if allocation is already revoked
 */
export async function revokeLicenseAllocation(
  db: PrismaClient,
  organizationId: string,
  allocationId: string,
) {
  const allocation = await db.softwareLicenseAllocation.findFirst({
    where: {
      id: allocationId,
      license: { organizationId },
    },
  });
  if (!allocation) {
    throw new NotFoundError("SoftwareLicenseAllocation", allocationId);
  }

  if (allocation.revokedAt) {
    throw new ConflictError("Allocation is already revoked", {
      code: "ALLOCATION_ALREADY_REVOKED",
    });
  }

  return db.softwareLicenseAllocation.update({
    where: { id: allocationId },
    data: { revokedAt: new Date() },
  });
}
