import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getAssetFinancials,
  setAssetFinancials,
  calculateDepreciation,
  getWarrantyAlerts,
  getAssetTCO,
  getCostCenterSummary,
} from "./asset-financial-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

function createMockDb() {
  return {
    asset: {
      findFirst: vi.fn(),
    },
    assetFinancial: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    assetHistory: {
      create: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const ASSET_ID = "asset-1";
const USER_ID = "user-1";

const mockAsset = {
  id: ASSET_ID,
  name: "Server-001",
};

const mockFinancialRecord = {
  id: "fin-1",
  organizationId: ORG_ID,
  assetId: ASSET_ID,
  purchasePrice: 1500,
  purchaseCurrency: "USD",
  purchaseDate: new Date("2024-01-15"),
  costCenter: "IT-OPS",
  costType: "capex",
  depreciationMethod: "straight_line",
  usefulLifeMonths: 36,
  salvageValue: 200,
  warrantyStart: new Date("2024-01-15"),
  warrantyEnd: new Date("2027-01-15"),
  warrantyProvider: "Dell",
  warrantyNotes: null,
  maintenanceCost: 100,
  disposalValue: 50,
  disposalDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── getAssetFinancials ───────────────────────────────────────────────────────

describe("getAssetFinancials", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns financial record for an asset", async () => {
    db.asset.findFirst.mockResolvedValue(mockAsset);
    db.assetFinancial.findFirst.mockResolvedValue(mockFinancialRecord);

    const result = await getAssetFinancials(db, ORG_ID, ASSET_ID);

    expect(result).not.toBeNull();
    expect(result!.purchasePrice).toBe(1500);
    expect(result!.salvageValue).toBe(200);
    expect(result!.purchaseCurrency).toBe("USD");
    expect(db.asset.findFirst).toHaveBeenCalledWith({
      where: { id: ASSET_ID, organizationId: ORG_ID },
      select: { id: true },
    });
  });

  it("returns null when no financial record exists", async () => {
    db.asset.findFirst.mockResolvedValue(mockAsset);
    db.assetFinancial.findFirst.mockResolvedValue(null);

    const result = await getAssetFinancials(db, ORG_ID, ASSET_ID);
    expect(result).toBeNull();
  });

  it("throws NotFoundError when asset does not exist", async () => {
    db.asset.findFirst.mockResolvedValue(null);

    await expect(getAssetFinancials(db, ORG_ID, "bad-id")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── setAssetFinancials ───────────────────────────────────────────────────────

describe("setAssetFinancials", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("upserts financial record for an asset", async () => {
    db.asset.findFirst.mockResolvedValue(mockAsset);
    db.assetFinancial.upsert.mockResolvedValue(mockFinancialRecord);
    db.assetHistory.create.mockResolvedValue({});

    const input = {
      assetId: ASSET_ID,
      purchasePrice: 1500,
      purchaseCurrency: "USD",
      purchaseDate: new Date("2024-01-15"),
    };

    const result = await setAssetFinancials(db, ORG_ID, ASSET_ID, input, USER_ID);

    expect(result).toBeDefined();
    expect(result.purchasePrice).toBe(1500);
    expect(db.assetFinancial.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { assetId: ASSET_ID },
        create: expect.objectContaining({
          organizationId: ORG_ID,
          assetId: ASSET_ID,
        }),
      }),
    );
  });

  it("throws NotFoundError when asset does not exist", async () => {
    db.asset.findFirst.mockResolvedValue(null);

    await expect(
      setAssetFinancials(db, ORG_ID, ASSET_ID, { assetId: ASSET_ID, purchaseCurrency: "USD" }, USER_ID),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError when warranty end is before start", async () => {
    db.asset.findFirst.mockResolvedValue(mockAsset);

    const input = {
      assetId: ASSET_ID,
      purchaseCurrency: "USD",
      warrantyStart: new Date("2025-01-01"),
      warrantyEnd: new Date("2024-01-01"),
    };

    await expect(
      setAssetFinancials(db, ORG_ID, ASSET_ID, input, USER_ID),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError when salvage value exceeds purchase price", async () => {
    db.asset.findFirst.mockResolvedValue(mockAsset);

    const input = {
      assetId: ASSET_ID,
      purchaseCurrency: "USD",
      purchasePrice: 1000,
      salvageValue: 2000,
    };

    await expect(
      setAssetFinancials(db, ORG_ID, ASSET_ID, input, USER_ID),
    ).rejects.toThrow(ValidationError);
  });

  it("logs asset history on financial update", async () => {
    db.asset.findFirst.mockResolvedValue(mockAsset);
    db.assetFinancial.upsert.mockResolvedValue(mockFinancialRecord);
    db.assetHistory.create.mockResolvedValue({});

    await setAssetFinancials(
      db,
      ORG_ID,
      ASSET_ID,
      { assetId: ASSET_ID, purchaseCurrency: "USD", purchasePrice: 1500 },
      USER_ID,
    );

    expect(db.assetHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        assetId: ASSET_ID,
        userId: USER_ID,
        action: "updated",
        field: "financials",
      }),
    });
  });
});

// ── calculateDepreciation ────────────────────────────────────────────────────

describe("calculateDepreciation", () => {
  it("calculates straight-line depreciation correctly", () => {
    // Asset purchased 400 days ago (firmly >12 months), $1200 price, $0 salvage, 36 months life
    const purchaseDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);

    const result = calculateDepreciation(
      1200,
      0,
      36,
      "straight_line",
      purchaseDate,
    );

    // Monthly dep = 1200 / 36 = 33.33
    expect(result.monthlyDepreciation).toBeCloseTo(33.33, 1);
    // After ~13 months: accumulated should be around 433
    expect(result.accumulatedDepreciation).toBeGreaterThan(350);
    expect(result.accumulatedDepreciation).toBeLessThan(500);
    // Book value should be between 700 and 850
    expect(result.currentBookValue).toBeGreaterThan(700);
    expect(result.currentBookValue).toBeLessThan(850);
    // ~33-40% depreciated
    expect(result.percentDepreciated).toBeGreaterThan(25);
    expect(result.percentDepreciated).toBeLessThan(45);
  });

  it("calculates straight-line with salvage value", () => {
    const purchaseDate = new Date();
    purchaseDate.setMonth(purchaseDate.getMonth() - 18);

    const result = calculateDepreciation(
      3600,
      600,
      36,
      "straight_line",
      purchaseDate,
    );

    // Monthly dep = (3600 - 600) / 36 = 83.33
    expect(result.monthlyDepreciation).toBeCloseTo(83.33, 1);
    // After 18 months: accumulated ~ 1500
    expect(result.accumulatedDepreciation).toBeCloseTo(1500, -1);
    // Book value ~ 2100
    expect(result.currentBookValue).toBeCloseTo(2100, -1);
  });

  it("does not depreciate below salvage value", () => {
    const purchaseDate = new Date();
    purchaseDate.setFullYear(purchaseDate.getFullYear() - 10); // 10 years ago, way past useful life

    const result = calculateDepreciation(
      1000,
      200,
      12,
      "straight_line",
      purchaseDate,
    );

    expect(result.currentBookValue).toBe(200);
    expect(result.percentDepreciated).toBe(100);
  });

  it("calculates declining balance depreciation", () => {
    const purchaseDate = new Date();
    purchaseDate.setMonth(purchaseDate.getMonth() - 6);

    const result = calculateDepreciation(
      10000,
      1000,
      60,
      "declining_balance",
      purchaseDate,
    );

    // Double-declining rate = 2/60 = 0.0333 per month
    // After 6 months, book value should be less than straight-line
    expect(result.currentBookValue).toBeLessThan(10000);
    expect(result.currentBookValue).toBeGreaterThan(1000);
    expect(result.accumulatedDepreciation).toBeGreaterThan(0);
    expect(result.percentDepreciated).toBeGreaterThan(0);
    expect(result.percentDepreciated).toBeLessThan(100);
  });

  it("handles zero elapsed time", () => {
    const result = calculateDepreciation(
      5000,
      500,
      36,
      "straight_line",
      new Date(), // purchased just now
    );

    expect(result.currentBookValue).toBe(5000);
    expect(result.accumulatedDepreciation).toBe(0);
    expect(result.percentDepreciated).toBe(0);
  });

  it("handles zero purchase price", () => {
    const purchaseDate = new Date();
    purchaseDate.setMonth(purchaseDate.getMonth() - 12);

    const result = calculateDepreciation(0, 0, 36, "straight_line", purchaseDate);

    expect(result.currentBookValue).toBe(0);
    expect(result.monthlyDepreciation).toBe(0);
    expect(result.percentDepreciated).toBe(0);
  });

  it("declining balance does not go below salvage value", () => {
    const purchaseDate = new Date();
    purchaseDate.setFullYear(purchaseDate.getFullYear() - 10);

    const result = calculateDepreciation(
      5000,
      1000,
      24,
      "declining_balance",
      purchaseDate,
    );

    expect(result.currentBookValue).toBeGreaterThanOrEqual(1000);
  });
});

// ── getWarrantyAlerts ────────────────────────────────────────────────────────

describe("getWarrantyAlerts", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns assets with warranties expiring within threshold", async () => {
    const warrantyEnd = new Date();
    warrantyEnd.setDate(warrantyEnd.getDate() + 15); // 15 days from now

    db.assetFinancial.findMany.mockResolvedValue([
      {
        assetId: ASSET_ID,
        warrantyEnd,
        warrantyProvider: "Dell",
        asset: {
          id: ASSET_ID,
          name: "Server-001",
          assetTag: "AST-00001",
          status: "in_use",
        },
      },
    ]);

    const result = await getWarrantyAlerts(db, ORG_ID, 30);

    expect(result).toHaveLength(1);
    expect(result[0]!.assetName).toBe("Server-001");
    expect(result[0]!.daysRemaining).toBeGreaterThan(0);
    expect(result[0]!.daysRemaining).toBeLessThanOrEqual(30);
  });

  it("returns empty array when no warranties are expiring", async () => {
    db.assetFinancial.findMany.mockResolvedValue([]);

    const result = await getWarrantyAlerts(db, ORG_ID, 30);
    expect(result).toHaveLength(0);
  });

  it("passes correct date range to query", async () => {
    db.assetFinancial.findMany.mockResolvedValue([]);

    await getWarrantyAlerts(db, ORG_ID, 60);

    expect(db.assetFinancial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: ORG_ID,
          warrantyEnd: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });
});

// ── getAssetTCO ──────────────────────────────────────────────────────────────

describe("getAssetTCO", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("calculates total cost of ownership", async () => {
    db.asset.findFirst.mockResolvedValue(mockAsset);
    db.assetFinancial.findFirst.mockResolvedValue({
      purchasePrice: 5000,
      maintenanceCost: 1200,
      disposalValue: 300,
    });

    const result = await getAssetTCO(db, ORG_ID, ASSET_ID);

    expect(result.purchasePrice).toBe(5000);
    expect(result.maintenanceCost).toBe(1200);
    expect(result.disposalValue).toBe(300);
    expect(result.totalCostOfOwnership).toBe(5900); // 5000 + 1200 - 300
    expect(result.assetName).toBe("Server-001");
  });

  it("handles null financial values as zero", async () => {
    db.asset.findFirst.mockResolvedValue(mockAsset);
    db.assetFinancial.findFirst.mockResolvedValue({
      purchasePrice: null,
      maintenanceCost: null,
      disposalValue: null,
    });

    const result = await getAssetTCO(db, ORG_ID, ASSET_ID);

    expect(result.totalCostOfOwnership).toBe(0);
  });

  it("throws NotFoundError when asset does not exist", async () => {
    db.asset.findFirst.mockResolvedValue(null);

    await expect(getAssetTCO(db, ORG_ID, "bad-id")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws NotFoundError when financial record does not exist", async () => {
    db.asset.findFirst.mockResolvedValue(mockAsset);
    db.assetFinancial.findFirst.mockResolvedValue(null);

    await expect(getAssetTCO(db, ORG_ID, ASSET_ID)).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── getCostCenterSummary ─────────────────────────────────────────────────────

describe("getCostCenterSummary", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("aggregates costs by cost center", async () => {
    db.assetFinancial.findMany.mockResolvedValue([
      {
        costCenter: "IT-OPS",
        purchasePrice: 5000,
        maintenanceCost: 500,
        disposalValue: 100,
      },
      {
        costCenter: "IT-OPS",
        purchasePrice: 3000,
        maintenanceCost: 300,
        disposalValue: null,
      },
      {
        costCenter: "ENGINEERING",
        purchasePrice: 10000,
        maintenanceCost: null,
        disposalValue: null,
      },
    ]);

    const result = await getCostCenterSummary(db, ORG_ID);

    expect(result).toHaveLength(2);

    const itOps = result.find((r) => r.costCenter === "IT-OPS");
    expect(itOps).toBeDefined();
    expect(itOps!.totalPurchase).toBe(8000);
    expect(itOps!.totalMaintenance).toBe(800);
    expect(itOps!.totalDisposal).toBe(100);
    expect(itOps!.totalCost).toBe(8700); // 8000 + 800 - 100
    expect(itOps!.assetCount).toBe(2);

    const eng = result.find((r) => r.costCenter === "ENGINEERING");
    expect(eng).toBeDefined();
    expect(eng!.totalPurchase).toBe(10000);
    expect(eng!.assetCount).toBe(1);
  });

  it("groups assets without cost center as unassigned", async () => {
    db.assetFinancial.findMany.mockResolvedValue([
      {
        costCenter: null,
        purchasePrice: 1000,
        maintenanceCost: null,
        disposalValue: null,
      },
    ]);

    const result = await getCostCenterSummary(db, ORG_ID);

    expect(result).toHaveLength(1);
    expect(result[0]!.costCenter).toBe("unassigned");
    expect(result[0]!.totalPurchase).toBe(1000);
  });

  it("returns empty array when no financial records exist", async () => {
    db.assetFinancial.findMany.mockResolvedValue([]);

    const result = await getCostCenterSummary(db, ORG_ID);
    expect(result).toHaveLength(0);
  });
});
