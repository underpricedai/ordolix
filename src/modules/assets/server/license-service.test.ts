import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  createLicense,
  getLicense,
  listLicenses,
  updateLicense,
  deleteLicense,
  allocateLicense,
  revokeLicenseAllocation,
} from "./license-service";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/server/lib/errors";

function createMockDb() {
  return {
    softwareLicense: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    softwareLicenseAllocation: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as PrismaClient;
}

const ORG_ID = "org-1";

const mockLicense = {
  id: "lic-1",
  organizationId: ORG_ID,
  name: "Adobe Creative Cloud",
  vendor: "Adobe",
  licenseType: "subscription",
  licenseKey: null,
  totalEntitlements: 10,
  purchasePrice: null,
  currency: "USD",
  purchaseDate: null,
  renewalDate: null,
  expirationDate: null,
  autoRenew: false,
  renewalCost: null,
  notes: null,
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("license-service", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.clearAllMocks();
  });

  // ── createLicense ────────────────────────────────────────────────────

  describe("createLicense", () => {
    it("creates a license with valid input", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.create as any).mockResolvedValue(mockLicense);

      const result = await createLicense(db, ORG_ID, {
        name: "Adobe Creative Cloud",
        licenseType: "subscription",
        totalEntitlements: 10,
        currency: "USD",
        autoRenew: false,
        status: "active",
      });

      expect(result).toEqual(mockLicense);
      expect(db.softwareLicense.create).toHaveBeenCalledOnce();
    });

    it("passes vendor and licenseKey when provided", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.create as any).mockResolvedValue(mockLicense);

      await createLicense(db, ORG_ID, {
        name: "Office 365",
        licenseType: "subscription",
        vendor: "Microsoft",
        licenseKey: "XXXX-YYYY-ZZZZ",
        totalEntitlements: 50,
        currency: "USD",
        autoRenew: true,
        status: "active",
      });

      const call = vi.mocked(db.softwareLicense.create).mock.calls[0]![0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((call as any).data.vendor).toBe("Microsoft");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((call as any).data.licenseKey).toBe("XXXX-YYYY-ZZZZ");
    });
  });

  // ── getLicense ──────────────────────────────────────────────────────

  describe("getLicense", () => {
    it("returns license with allocations", async () => {
      const licenseWithAllocations = { ...mockLicense, allocations: [] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findFirst as any).mockResolvedValue(licenseWithAllocations);

      const result = await getLicense(db, ORG_ID, "lic-1");
      expect(result).toEqual(licenseWithAllocations);
    });

    it("throws NotFoundError when license does not exist", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findFirst as any).mockResolvedValue(null);

      await expect(getLicense(db, ORG_ID, "not-found")).rejects.toThrow(NotFoundError);
    });
  });

  // ── listLicenses ────────────────────────────────────────────────────

  describe("listLicenses", () => {
    it("returns list of licenses", async () => {
      const licenses = [mockLicense];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findMany as any).mockResolvedValue(licenses);

      const result = await listLicenses(db, ORG_ID, { limit: 50 });
      expect(result).toEqual(licenses);
    });

    it("applies status filter", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findMany as any).mockResolvedValue([]);

      await listLicenses(db, ORG_ID, { status: "expired", limit: 50 });

      const call = vi.mocked(db.softwareLicense.findMany).mock.calls[0]![0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((call as any).where.status).toBe("expired");
    });

    it("applies vendor filter with case insensitive match", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findMany as any).mockResolvedValue([]);

      await listLicenses(db, ORG_ID, { vendor: "Adobe", limit: 50 });

      const call = vi.mocked(db.softwareLicense.findMany).mock.calls[0]![0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((call as any).where.vendor).toEqual({
        contains: "Adobe",
        mode: "insensitive",
      });
    });

    it("applies search filter on name", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findMany as any).mockResolvedValue([]);

      await listLicenses(db, ORG_ID, { search: "Creative", limit: 50 });

      const call = vi.mocked(db.softwareLicense.findMany).mock.calls[0]![0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((call as any).where.name).toEqual({
        contains: "Creative",
        mode: "insensitive",
      });
    });
  });

  // ── updateLicense ───────────────────────────────────────────────────

  describe("updateLicense", () => {
    it("updates a license", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findFirst as any).mockResolvedValue(mockLicense);
      const updated = { ...mockLicense, name: "Updated License" };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.update as any).mockResolvedValue(updated);

      const result = await updateLicense(db, ORG_ID, "lic-1", { name: "Updated License" });
      expect(result.name).toBe("Updated License");
    });

    it("throws NotFoundError when license does not exist", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findFirst as any).mockResolvedValue(null);

      await expect(
        updateLicense(db, ORG_ID, "not-found", { name: "X" }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ── deleteLicense ───────────────────────────────────────────────────

  describe("deleteLicense", () => {
    it("deletes a license", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findFirst as any).mockResolvedValue(mockLicense);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.delete as any).mockResolvedValue(mockLicense);

      const result = await deleteLicense(db, ORG_ID, "lic-1");
      expect(result).toEqual(mockLicense);
    });

    it("throws NotFoundError when license does not exist", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findFirst as any).mockResolvedValue(null);

      await expect(deleteLicense(db, ORG_ID, "not-found")).rejects.toThrow(NotFoundError);
    });
  });

  // ── allocateLicense ─────────────────────────────────────────────────

  describe("allocateLicense", () => {
    it("allocates a license to an asset", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findFirst as any).mockResolvedValue(mockLicense);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicenseAllocation.count as any).mockResolvedValue(5);

      const allocation = {
        id: "alloc-1",
        licenseId: "lic-1",
        assetId: "asset-1",
        userId: null,
        allocatedAt: new Date(),
        revokedAt: null,
        asset: { id: "asset-1", name: "Server-1", assetTag: "AST-00001" },
        user: null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicenseAllocation.create as any).mockResolvedValue(allocation);

      const result = await allocateLicense(db, ORG_ID, "lic-1", { assetId: "asset-1" });
      expect(result.assetId).toBe("asset-1");
    });

    it("allocates a license to a user", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findFirst as any).mockResolvedValue(mockLicense);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicenseAllocation.count as any).mockResolvedValue(0);

      const allocation = {
        id: "alloc-2",
        licenseId: "lic-1",
        assetId: null,
        userId: "user-1",
        allocatedAt: new Date(),
        revokedAt: null,
        asset: null,
        user: { id: "user-1", name: "Jane", email: "jane@test.com" },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicenseAllocation.create as any).mockResolvedValue(allocation);

      const result = await allocateLicense(db, ORG_ID, "lic-1", { userId: "user-1" });
      expect(result.userId).toBe("user-1");
    });

    it("throws ValidationError when neither assetId nor userId provided", async () => {
      await expect(
        allocateLicense(db, ORG_ID, "lic-1", {}),
      ).rejects.toThrow(ValidationError);
    });

    it("throws NotFoundError when license does not exist", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findFirst as any).mockResolvedValue(null);

      await expect(
        allocateLicense(db, ORG_ID, "not-found", { assetId: "a-1" }),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError when entitlement limit reached", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findFirst as any).mockResolvedValue(mockLicense);
      // entitlements is 10, activeCount is 10 -- at limit
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicenseAllocation.count as any).mockResolvedValue(10);

      await expect(
        allocateLicense(db, ORG_ID, "lic-1", { assetId: "a-1" }),
      ).rejects.toThrow(ConflictError);
    });

    it("allows allocation when count is below limit", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findFirst as any).mockResolvedValue(mockLicense);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicenseAllocation.count as any).mockResolvedValue(9);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicenseAllocation.create as any).mockResolvedValue({
        id: "alloc-3",
        licenseId: "lic-1",
        assetId: "a-1",
        userId: null,
        allocatedAt: new Date(),
        revokedAt: null,
        asset: { id: "a-1", name: "Asset", assetTag: "AST-00002" },
        user: null,
      });

      const result = await allocateLicense(db, ORG_ID, "lic-1", { assetId: "a-1" });
      expect(result.id).toBe("alloc-3");
    });
  });

  // ── revokeLicenseAllocation ─────────────────────────────────────────

  describe("revokeLicenseAllocation", () => {
    it("revokes an allocation by setting revokedAt", async () => {
      const allocation = {
        id: "alloc-1",
        licenseId: "lic-1",
        assetId: "a-1",
        userId: null,
        allocatedAt: new Date(),
        revokedAt: null,
        license: { organizationId: ORG_ID },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicenseAllocation.findFirst as any).mockResolvedValue(allocation);

      const revoked = { ...allocation, revokedAt: new Date() };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicenseAllocation.update as any).mockResolvedValue(revoked);

      const result = await revokeLicenseAllocation(db, ORG_ID, "alloc-1");
      expect(result.revokedAt).toBeTruthy();
    });

    it("throws NotFoundError when allocation does not exist", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicenseAllocation.findFirst as any).mockResolvedValue(null);

      await expect(
        revokeLicenseAllocation(db, ORG_ID, "not-found"),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError when allocation is already revoked", async () => {
      const allocation = {
        id: "alloc-1",
        licenseId: "lic-1",
        assetId: "a-1",
        userId: null,
        allocatedAt: new Date(),
        revokedAt: new Date(),
        license: { organizationId: ORG_ID },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicenseAllocation.findFirst as any).mockResolvedValue(allocation);

      await expect(
        revokeLicenseAllocation(db, ORG_ID, "alloc-1"),
      ).rejects.toThrow(ConflictError);
    });
  });
});
