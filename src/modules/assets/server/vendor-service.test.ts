import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  createVendor,
  getVendor,
  listVendors,
  updateVendor,
  deleteVendor,
  createVendorContract,
  listVendorContracts,
} from "./vendor-service";
import {
  NotFoundError,
  ConflictError,
} from "@/server/lib/errors";

function createMockDb() {
  return {
    vendor: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    vendorContract: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as PrismaClient;
}

const ORG_ID = "org-1";

const mockVendor = {
  id: "vendor-1",
  organizationId: ORG_ID,
  name: "Dell Technologies",
  contactName: "John Smith",
  contactEmail: "john@dell.com",
  contactPhone: "+1-555-0100",
  website: "https://dell.com",
  address: "Round Rock, TX",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockContract = {
  id: "contract-1",
  organizationId: ORG_ID,
  vendorId: "vendor-1",
  contractNumber: "CNT-00001",
  startDate: new Date("2025-01-01"),
  endDate: new Date("2026-01-01"),
  value: 50000,
  autoRenew: true,
  status: "active",
  attachmentUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("vendor-service", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.clearAllMocks();
  });

  // ── createVendor ────────────────────────────────────────────────────

  describe("createVendor", () => {
    it("creates a vendor with valid input", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findFirst as any).mockResolvedValue(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.create as any).mockResolvedValue(mockVendor);

      const result = await createVendor(db, ORG_ID, {
        name: "Dell Technologies",
        contactName: "John Smith",
        contactEmail: "john@dell.com",
        contactPhone: "+1-555-0100",
        website: "https://dell.com",
        address: "Round Rock, TX",
        isActive: true,
      });

      expect(result).toEqual(mockVendor);
      expect(db.vendor.create).toHaveBeenCalledOnce();
    });

    it("throws ConflictError when vendor name already exists in org", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findFirst as any).mockResolvedValue(mockVendor);

      await expect(
        createVendor(db, ORG_ID, {
          name: "Dell Technologies",
          isActive: true,
        }),
      ).rejects.toThrow(ConflictError);
    });

    it("passes optional fields as null when not provided", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findFirst as any).mockResolvedValue(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.create as any).mockResolvedValue({
        ...mockVendor,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        website: null,
        address: null,
      });

      await createVendor(db, ORG_ID, {
        name: "ACME Corp",
        isActive: true,
      });

      const call = vi.mocked(db.vendor.create).mock.calls[0]![0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((call as any).data.name).toBe("ACME Corp");
      expect(db.vendor.create).toHaveBeenCalledOnce();
    });
  });

  // ── getVendor ─────────────────────────────────────────────────────

  describe("getVendor", () => {
    it("returns vendor with contracts", async () => {
      const vendorWithContracts = { ...mockVendor, contracts: [mockContract] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findFirst as any).mockResolvedValue(vendorWithContracts);

      const result = await getVendor(db, ORG_ID, "vendor-1");
      expect(result).toEqual(vendorWithContracts);
      expect(result.contracts).toHaveLength(1);
    });

    it("throws NotFoundError when vendor does not exist", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findFirst as any).mockResolvedValue(null);

      await expect(getVendor(db, ORG_ID, "not-found")).rejects.toThrow(NotFoundError);
    });
  });

  // ── listVendors ───────────────────────────────────────────────────

  describe("listVendors", () => {
    it("returns list of vendors", async () => {
      const vendors = [mockVendor];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findMany as any).mockResolvedValue(vendors);

      const result = await listVendors(db, ORG_ID, { limit: 50 });
      expect(result).toEqual(vendors);
    });

    it("applies search filter on name", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findMany as any).mockResolvedValue([]);

      await listVendors(db, ORG_ID, { search: "Dell", limit: 50 });

      const call = vi.mocked(db.vendor.findMany).mock.calls[0]![0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((call as any).where.name).toEqual({
        contains: "Dell",
        mode: "insensitive",
      });
    });

    it("applies isActive filter", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findMany as any).mockResolvedValue([]);

      await listVendors(db, ORG_ID, { isActive: true, limit: 50 });

      const call = vi.mocked(db.vendor.findMany).mock.calls[0]![0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((call as any).where.isActive).toBe(true);
    });

    it("supports cursor-based pagination", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findMany as any).mockResolvedValue([]);

      await listVendors(db, ORG_ID, { cursor: "vendor-5", limit: 10 });

      const call = vi.mocked(db.vendor.findMany).mock.calls[0]![0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((call as any).skip).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((call as any).cursor).toEqual({ id: "vendor-5" });
    });
  });

  // ── updateVendor ──────────────────────────────────────────────────

  describe("updateVendor", () => {
    it("updates a vendor", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findFirst as any)
        .mockResolvedValueOnce(mockVendor)  // find vendor to update
        .mockResolvedValueOnce(null);       // name conflict check (no conflict)
      const updated = { ...mockVendor, name: "Dell Inc." };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.update as any).mockResolvedValue(updated);

      const result = await updateVendor(db, ORG_ID, "vendor-1", { name: "Dell Inc." });
      expect(result.name).toBe("Dell Inc.");
    });

    it("throws NotFoundError when vendor does not exist", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findFirst as any).mockResolvedValue(null);

      await expect(
        updateVendor(db, ORG_ID, "not-found", { name: "X" }),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError when updated name conflicts with another vendor", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findFirst as any)
        .mockResolvedValueOnce(mockVendor)  // find vendor to update
        .mockResolvedValueOnce({ id: "vendor-2", name: "HP Inc." });  // conflict check

      await expect(
        updateVendor(db, ORG_ID, "vendor-1", { name: "HP Inc." }),
      ).rejects.toThrow(ConflictError);
    });

    it("allows updating without changing the name", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findFirst as any).mockResolvedValue(mockVendor);
      const updated = { ...mockVendor, contactEmail: "new@dell.com" };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.update as any).mockResolvedValue(updated);

      const result = await updateVendor(db, ORG_ID, "vendor-1", {
        contactEmail: "new@dell.com",
      });
      expect(result.contactEmail).toBe("new@dell.com");
    });
  });

  // ── deleteVendor ──────────────────────────────────────────────────

  describe("deleteVendor", () => {
    it("deletes a vendor", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findFirst as any).mockResolvedValue(mockVendor);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.delete as any).mockResolvedValue(mockVendor);

      const result = await deleteVendor(db, ORG_ID, "vendor-1");
      expect(result).toEqual(mockVendor);
    });

    it("throws NotFoundError when vendor does not exist", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findFirst as any).mockResolvedValue(null);

      await expect(deleteVendor(db, ORG_ID, "not-found")).rejects.toThrow(NotFoundError);
    });
  });

  // ── createVendorContract ──────────────────────────────────────────

  describe("createVendorContract", () => {
    it("creates a contract for an existing vendor", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findFirst as any).mockResolvedValue(mockVendor);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendorContract.create as any).mockResolvedValue(mockContract);

      const result = await createVendorContract(db, ORG_ID, "vendor-1", {
        contractNumber: "CNT-00001",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2026-01-01"),
        value: 50000,
        autoRenew: true,
        status: "active",
      });

      expect(result).toEqual(mockContract);
      expect(db.vendorContract.create).toHaveBeenCalledOnce();
    });

    it("throws NotFoundError when vendor does not exist", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendor.findFirst as any).mockResolvedValue(null);

      await expect(
        createVendorContract(db, ORG_ID, "not-found", {
          contractNumber: "CNT-00001",
          startDate: new Date("2025-01-01"),
          autoRenew: false,
          status: "active",
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ── listVendorContracts ───────────────────────────────────────────

  describe("listVendorContracts", () => {
    it("returns contracts for a vendor", async () => {
      const contracts = [mockContract];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendorContract.findMany as any).mockResolvedValue(contracts);

      const result = await listVendorContracts(db, ORG_ID, "vendor-1");
      expect(result).toEqual(contracts);
    });

    it("returns empty array when vendor has no contracts", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.vendorContract.findMany as any).mockResolvedValue([]);

      const result = await listVendorContracts(db, ORG_ID, "vendor-1");
      expect(result).toEqual([]);
    });
  });
});
