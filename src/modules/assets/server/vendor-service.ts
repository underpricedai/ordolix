/**
 * Vendor management service.
 *
 * @description CRUD operations for vendors and vendor contracts.
 * Vendors are unique per organization by name.
 *
 * @module vendor-service
 */

import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ConflictError } from "@/server/lib/errors";
import type {
  CreateVendorInput,
  UpdateVendorInput,
  ListVendorsInput,
  CreateVendorContractInput,
} from "../types/schemas";

// ── Vendors ──────────────────────────────────────────────────────────────────

/**
 * Creates a new vendor for the organization.
 * Name must be unique within the organization.
 *
 * @param db - Prisma client
 * @param organizationId - The organization ID
 * @param input - Vendor creation input
 * @returns The created vendor
 * @throws ConflictError if vendor name already exists
 */
export async function createVendor(
  db: PrismaClient,
  organizationId: string,
  input: CreateVendorInput,
) {
  const existing = await db.vendor.findFirst({
    where: { organizationId, name: input.name },
  });
  if (existing) {
    throw new ConflictError(`Vendor '${input.name}' already exists`);
  }

  return db.vendor.create({
    data: {
      organizationId,
      name: input.name,
      contactName: input.contactName ?? null,
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone ?? null,
      website: input.website ?? null,
      address: input.address ?? null,
      isActive: input.isActive ?? true,
    },
  });
}

/**
 * Gets a single vendor by ID, including its contracts.
 *
 * @param db - Prisma client
 * @param organizationId - The organization ID
 * @param id - The vendor ID
 * @returns The vendor with contracts
 * @throws NotFoundError if vendor does not exist
 */
export async function getVendor(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const vendor = await db.vendor.findFirst({
    where: { id, organizationId },
    include: {
      contracts: { orderBy: { startDate: "desc" as const } },
    },
  });
  if (!vendor) {
    throw new NotFoundError("Vendor", id);
  }
  return vendor;
}

/**
 * Lists vendors for the organization with optional filters.
 *
 * @param db - Prisma client
 * @param organizationId - The organization ID
 * @param input - Optional search, isActive filter, pagination
 * @returns List of vendors with contract count
 */
export async function listVendors(
  db: PrismaClient,
  organizationId: string,
  input: ListVendorsInput = { limit: 50 },
) {
  return db.vendor.findMany({
    where: {
      organizationId,
      ...(input.search
        ? { name: { contains: input.search, mode: "insensitive" as const } }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: {
      _count: { select: { contracts: true } },
    },
    orderBy: { name: "asc" as const },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });
}

/**
 * Partially updates a vendor.
 *
 * @param db - Prisma client
 * @param organizationId - The organization ID
 * @param id - The vendor ID
 * @param input - Partial update fields
 * @returns The updated vendor
 * @throws NotFoundError if vendor does not exist
 * @throws ConflictError if updated name conflicts
 */
export async function updateVendor(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: Omit<UpdateVendorInput, "id">,
) {
  const vendor = await db.vendor.findFirst({
    where: { id, organizationId },
  });
  if (!vendor) {
    throw new NotFoundError("Vendor", id);
  }

  // Check name uniqueness if name is being changed
  if (input.name && input.name !== vendor.name) {
    const conflict = await db.vendor.findFirst({
      where: { organizationId, name: input.name },
    });
    if (conflict) {
      throw new ConflictError(`Vendor '${input.name}' already exists`);
    }
  }

  return db.vendor.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
      ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
      ...(input.website !== undefined ? { website: input.website } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

/**
 * Deletes a vendor by ID.
 *
 * @param db - Prisma client
 * @param organizationId - The organization ID
 * @param id - The vendor ID
 * @returns The deleted vendor
 * @throws NotFoundError if vendor does not exist
 */
export async function deleteVendor(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const vendor = await db.vendor.findFirst({
    where: { id, organizationId },
  });
  if (!vendor) {
    throw new NotFoundError("Vendor", id);
  }

  return db.vendor.delete({ where: { id } });
}

// ── Vendor Contracts ─────────────────────────────────────────────────────────

/**
 * Creates a contract for a vendor.
 *
 * @param db - Prisma client
 * @param organizationId - The organization ID
 * @param vendorId - The vendor ID
 * @param input - Contract creation input
 * @returns The created contract
 * @throws NotFoundError if vendor does not exist
 */
export async function createVendorContract(
  db: PrismaClient,
  organizationId: string,
  vendorId: string,
  input: Omit<CreateVendorContractInput, "vendorId">,
) {
  const vendor = await db.vendor.findFirst({
    where: { id: vendorId, organizationId },
  });
  if (!vendor) {
    throw new NotFoundError("Vendor", vendorId);
  }

  return db.vendorContract.create({
    data: {
      organizationId,
      vendorId,
      contractNumber: input.contractNumber,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      value: input.value ?? null,
      autoRenew: input.autoRenew ?? false,
      status: input.status ?? "active",
      attachmentUrl: input.attachmentUrl ?? null,
    },
  });
}

/**
 * Lists contracts for a vendor.
 *
 * @param db - Prisma client
 * @param organizationId - The organization ID
 * @param vendorId - The vendor ID
 * @returns List of contracts ordered by start date descending
 */
export async function listVendorContracts(
  db: PrismaClient,
  organizationId: string,
  vendorId: string,
) {
  return db.vendorContract.findMany({
    where: { organizationId, vendorId },
    orderBy: { startDate: "desc" as const },
  });
}
