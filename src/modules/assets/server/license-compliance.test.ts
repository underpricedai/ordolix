import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  checkCompliance,
  getLicenseCompliance,
  getComplianceDashboard,
  getRenewalAlerts,
} from "./license-compliance";
import { NotFoundError } from "@/server/lib/errors";

function createMockDb() {
  return {
    softwareLicense: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    softwareLicenseAllocation: {
      count: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as PrismaClient;
}

const ORG_ID = "org-1";

describe("license-compliance", () => {
  // ── checkCompliance (pure function) ─────────────────────────────────

  describe("checkCompliance", () => {
    it("returns compliant when used is between 50% and 100%", () => {
      const result = checkCompliance(10, 7);
      expect(result.status).toBe("compliant");
      expect(result.total).toBe(10);
      expect(result.used).toBe(7);
      expect(result.available).toBe(3);
    });

    it("returns compliant at exactly 50%", () => {
      const result = checkCompliance(10, 5);
      expect(result.status).toBe("compliant");
    });

    it("returns compliant at exactly 100%", () => {
      const result = checkCompliance(10, 10);
      expect(result.status).toBe("compliant");
      expect(result.available).toBe(0);
    });

    it("returns over_deployed when used exceeds total", () => {
      const result = checkCompliance(10, 12);
      expect(result.status).toBe("over_deployed");
      expect(result.available).toBe(0);
    });

    it("returns under_utilized when used is below 50%", () => {
      const result = checkCompliance(10, 4);
      expect(result.status).toBe("under_utilized");
      expect(result.available).toBe(6);
    });

    it("returns under_utilized when no allocations", () => {
      const result = checkCompliance(10, 0);
      expect(result.status).toBe("under_utilized");
      expect(result.available).toBe(10);
    });

    it("handles edge case of 1 entitlement with 0 used", () => {
      const result = checkCompliance(1, 0);
      expect(result.status).toBe("under_utilized");
    });

    it("handles edge case of 1 entitlement with 1 used", () => {
      const result = checkCompliance(1, 1);
      expect(result.status).toBe("compliant");
    });

    it("handles edge case of 2 entitlements with 1 used (exactly 50%)", () => {
      const result = checkCompliance(2, 1);
      expect(result.status).toBe("compliant");
    });
  });

  // ── getLicenseCompliance ────────────────────────────────────────────

  describe("getLicenseCompliance", () => {
    let db: ReturnType<typeof createMockDb>;

    beforeEach(() => {
      db = createMockDb();
      vi.clearAllMocks();
    });

    it("returns compliance for a found license", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findFirst as any).mockResolvedValue({
        id: "lic-1",
        totalEntitlements: 10,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicenseAllocation.count as any).mockResolvedValue(7);

      const result = await getLicenseCompliance(db, ORG_ID, "lic-1");
      expect(result.status).toBe("compliant");
      expect(result.total).toBe(10);
      expect(result.used).toBe(7);
    });

    it("throws NotFoundError when license not found", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findFirst as any).mockResolvedValue(null);

      await expect(getLicenseCompliance(db, ORG_ID, "x")).rejects.toThrow(NotFoundError);
    });
  });

  // ── getComplianceDashboard ──────────────────────────────────────────

  describe("getComplianceDashboard", () => {
    let db: ReturnType<typeof createMockDb>;

    beforeEach(() => {
      db = createMockDb();
      vi.clearAllMocks();
    });

    it("returns aggregated compliance dashboard", async () => {
      const licenses = [
        { id: "lic-1", totalEntitlements: 10, purchasePrice: { toNumber: () => 1000 }, _count: { allocations: 7 } },
        { id: "lic-2", totalEntitlements: 5, purchasePrice: { toNumber: () => 500 }, _count: { allocations: 6 } },
        { id: "lic-3", totalEntitlements: 20, purchasePrice: null, _count: { allocations: 2 } },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findMany as any).mockResolvedValue(licenses);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.count as any).mockResolvedValue(1);

      const result = await getComplianceDashboard(db, ORG_ID);

      expect(result.totalLicenses).toBe(3);
      // lic-1: 7/10 = compliant; lic-2: 6/5 = over_deployed; lic-3: 2/20 = under_utilized
      expect(result.compliant).toBe(1);
      expect(result.overDeployed).toBe(1);
      expect(result.underUtilized).toBe(1);
      expect(result.expiringWithin30Days).toBe(1);
    });

    it("sums purchase prices for totalCost", async () => {
      const licenses = [
        { id: "lic-1", totalEntitlements: 10, purchasePrice: 1000, _count: { allocations: 7 } },
        { id: "lic-2", totalEntitlements: 5, purchasePrice: 500, _count: { allocations: 3 } },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findMany as any).mockResolvedValue(licenses);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.count as any).mockResolvedValue(0);

      const result = await getComplianceDashboard(db, ORG_ID);
      expect(result.totalCost).toBe(1500);
    });

    it("returns zeros when no licenses exist", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findMany as any).mockResolvedValue([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.count as any).mockResolvedValue(0);

      const result = await getComplianceDashboard(db, ORG_ID);
      expect(result.totalLicenses).toBe(0);
      expect(result.compliant).toBe(0);
      expect(result.overDeployed).toBe(0);
      expect(result.underUtilized).toBe(0);
      expect(result.totalCost).toBe(0);
    });
  });

  // ── getRenewalAlerts ────────────────────────────────────────────────

  describe("getRenewalAlerts", () => {
    let db: ReturnType<typeof createMockDb>;

    beforeEach(() => {
      db = createMockDb();
      vi.clearAllMocks();
    });

    it("returns licenses expiring within daysAhead", async () => {
      const expiringLicense = {
        id: "lic-1",
        name: "Expiring License",
        vendor: "Vendor A",
        expirationDate: new Date(Date.now() + 10 * 86400000),
        renewalDate: null,
        autoRenew: false,
        renewalCost: null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findMany as any).mockResolvedValue([expiringLicense]);

      const result = await getRenewalAlerts(db, ORG_ID, 30);
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe("Expiring License");
    });

    it("converts renewal cost from Decimal to number", async () => {
      const license = {
        id: "lic-1",
        name: "License",
        vendor: null,
        expirationDate: new Date(Date.now() + 5 * 86400000),
        renewalDate: null,
        autoRenew: true,
        renewalCost: { toNumber: () => 199.99 },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findMany as any).mockResolvedValue([license]);

      const result = await getRenewalAlerts(db, ORG_ID, 30);
      // Decimal serializes to number via Number()
      expect(typeof result[0]!.renewalCost).toBe("number");
    });

    it("returns empty array when no licenses are expiring", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.softwareLicense.findMany as any).mockResolvedValue([]);

      const result = await getRenewalAlerts(db, ORG_ID, 30);
      expect(result).toEqual([]);
    });
  });
});
