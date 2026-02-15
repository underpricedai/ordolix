import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createBudget,
  getBudget,
  listBudgets,
  updateBudget,
  deleteBudget,
  setCostRate,
  listCostRates,
  deleteCostRate,
  getBudgetSummary,
  getProjectCostSummary,
} from "./budget-service";
import { NotFoundError } from "@/server/lib/errors";

function createMockDb() {
  return {
    budget: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    costRate: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";

const mockBudget = {
  id: "budget-1",
  organizationId: ORG_ID,
  projectId: "proj-1",
  name: "Q1 Budget",
  amount: 50000,
  currency: "USD",
  costType: "opex",
  periodStart: new Date("2026-01-01"),
  periodEnd: new Date("2026-03-31"),
  alertThreshold: 80,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockBudgetWithEntries = {
  ...mockBudget,
  entries: [
    { id: "e-1", cost: 10000, hours: 50, ratePerHour: 200 },
    { id: "e-2", cost: 15000, hours: 75, ratePerHour: 200 },
  ],
};

const mockCostRate = {
  id: "rate-1",
  organizationId: ORG_ID,
  userId: "user-1",
  projectRoleId: null,
  ratePerHour: 150,
  currency: "USD",
  effectiveFrom: new Date("2026-01-01"),
  effectiveTo: null,
  createdAt: new Date(),
};

// ── createBudget ───────────────────────────────────────────────────────────

describe("createBudget", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.budget.create.mockResolvedValue(mockBudget);
  });

  it("creates a budget with provided fields", async () => {
    const result = await createBudget(db, ORG_ID, {
      projectId: "proj-1",
      name: "Q1 Budget",
      amount: 50000,
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-03-31"),
    });

    expect(result.id).toBe("budget-1");
    expect(db.budget.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        projectId: "proj-1",
        name: "Q1 Budget",
        amount: 50000,
        currency: "USD",
        costType: "opex",
        alertThreshold: 80,
      }),
    });
  });

  it("applies custom currency, costType, and alertThreshold", async () => {
    await createBudget(db, ORG_ID, {
      projectId: "proj-1",
      name: "Q1 Budget",
      amount: 50000,
      currency: "EUR",
      costType: "capex",
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-03-31"),
      alertThreshold: 90,
    });

    expect(db.budget.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        currency: "EUR",
        costType: "capex",
        alertThreshold: 90,
      }),
    });
  });
});

// ── getBudget ──────────────────────────────────────────────────────────────

describe("getBudget", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.budget.findFirst.mockResolvedValue(mockBudgetWithEntries);
  });

  it("returns budget with entries", async () => {
    const result = await getBudget(db, ORG_ID, "budget-1");

    expect(result.id).toBe("budget-1");
    expect(result.entries).toHaveLength(2);
    expect(db.budget.findFirst).toHaveBeenCalledWith({
      where: { id: "budget-1", organizationId: ORG_ID },
      include: { entries: true },
    });
  });

  it("throws NotFoundError if budget not found", async () => {
    db.budget.findFirst.mockResolvedValue(null);

    await expect(getBudget(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });
});

// ── listBudgets ────────────────────────────────────────────────────────────

describe("listBudgets", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.budget.findMany.mockResolvedValue([mockBudget]);
  });

  it("returns all budgets for org", async () => {
    const result = await listBudgets(db, ORG_ID);

    expect(result).toHaveLength(1);
    expect(db.budget.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID },
      orderBy: { createdAt: "desc" },
    });
  });

  it("filters by projectId when provided", async () => {
    await listBudgets(db, ORG_ID, "proj-1");

    expect(db.budget.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, projectId: "proj-1" },
      orderBy: { createdAt: "desc" },
    });
  });
});

// ── updateBudget ───────────────────────────────────────────────────────────

describe("updateBudget", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.budget.findFirst.mockResolvedValue(mockBudget);
    db.budget.update.mockResolvedValue({ ...mockBudget, amount: 60000 });
  });

  it("updates a budget", async () => {
    const result = await updateBudget(db, ORG_ID, "budget-1", {
      amount: 60000,
    });

    expect(result.amount).toBe(60000);
    expect(db.budget.update).toHaveBeenCalledWith({
      where: { id: "budget-1" },
      data: { amount: 60000 },
    });
  });

  it("throws NotFoundError if budget not found", async () => {
    db.budget.findFirst.mockResolvedValue(null);

    await expect(
      updateBudget(db, ORG_ID, "nope", { amount: 60000 }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteBudget ───────────────────────────────────────────────────────────

describe("deleteBudget", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.budget.findFirst.mockResolvedValue(mockBudget);
    db.budget.delete.mockResolvedValue(mockBudget);
  });

  it("deletes a budget", async () => {
    await deleteBudget(db, ORG_ID, "budget-1");

    expect(db.budget.delete).toHaveBeenCalledWith({
      where: { id: "budget-1" },
    });
  });

  it("throws NotFoundError if budget not found", async () => {
    db.budget.findFirst.mockResolvedValue(null);

    await expect(deleteBudget(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── setCostRate ────────────────────────────────────────────────────────────

describe("setCostRate", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.costRate.create.mockResolvedValue(mockCostRate);
  });

  it("creates a cost rate with defaults", async () => {
    const result = await setCostRate(db, ORG_ID, {
      userId: "user-1",
      ratePerHour: 150,
      effectiveFrom: new Date("2026-01-01"),
    });

    expect(result.id).toBe("rate-1");
    expect(db.costRate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        userId: "user-1",
        ratePerHour: 150,
        currency: "USD",
      }),
    });
  });

  it("creates a cost rate with custom currency and projectRoleId", async () => {
    await setCostRate(db, ORG_ID, {
      projectRoleId: "role-1",
      ratePerHour: 200,
      currency: "GBP",
      effectiveFrom: new Date("2026-01-01"),
      effectiveTo: new Date("2026-12-31"),
    });

    expect(db.costRate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectRoleId: "role-1",
        currency: "GBP",
        effectiveTo: new Date("2026-12-31"),
      }),
    });
  });
});

// ── listCostRates ──────────────────────────────────────────────────────────

describe("listCostRates", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.costRate.findMany.mockResolvedValue([mockCostRate]);
  });

  it("returns all cost rates for org", async () => {
    const result = await listCostRates(db, ORG_ID);

    expect(result).toHaveLength(1);
    expect(db.costRate.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID },
      orderBy: { effectiveFrom: "desc" },
    });
  });
});

// ── deleteCostRate ─────────────────────────────────────────────────────────

describe("deleteCostRate", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.costRate.findFirst.mockResolvedValue(mockCostRate);
    db.costRate.delete.mockResolvedValue(mockCostRate);
  });

  it("deletes a cost rate", async () => {
    await deleteCostRate(db, ORG_ID, "rate-1");

    expect(db.costRate.delete).toHaveBeenCalledWith({
      where: { id: "rate-1" },
    });
  });

  it("throws NotFoundError if cost rate not found", async () => {
    db.costRate.findFirst.mockResolvedValue(null);

    await expect(deleteCostRate(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── getBudgetSummary ───────────────────────────────────────────────────────

describe("getBudgetSummary", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("computes correct cost metrics", async () => {
    db.budget.findFirst.mockResolvedValue(mockBudgetWithEntries);

    const result = await getBudgetSummary(db, ORG_ID, "budget-1");

    // entries: 10000 + 15000 = 25000
    expect(result.actualCost).toBe(25000);
    expect(result.remaining).toBe(25000); // 50000 - 25000
    expect(result.percentUsed).toBe(50); // 25000 / 50000 * 100
    expect(result.isOverBudget).toBe(false);
    expect(result.isNearThreshold).toBe(false); // 50 < 80
    expect(result.budget.id).toBe("budget-1");
  });

  it("detects over-budget condition", async () => {
    db.budget.findFirst.mockResolvedValue({
      ...mockBudget,
      amount: 20000,
      entries: [
        { id: "e-1", cost: 12000 },
        { id: "e-2", cost: 15000 },
      ],
    });

    const result = await getBudgetSummary(db, ORG_ID, "budget-1");

    expect(result.actualCost).toBe(27000);
    expect(result.remaining).toBe(-7000);
    expect(result.percentUsed).toBe(135);
    expect(result.isOverBudget).toBe(true);
    expect(result.isNearThreshold).toBe(true);
  });

  it("detects near-threshold condition", async () => {
    db.budget.findFirst.mockResolvedValue({
      ...mockBudget,
      alertThreshold: 80,
      entries: [{ id: "e-1", cost: 42000 }], // 84% of 50000
    });

    const result = await getBudgetSummary(db, ORG_ID, "budget-1");

    expect(result.percentUsed).toBe(84);
    expect(result.isNearThreshold).toBe(true);
    expect(result.isOverBudget).toBe(false);
  });

  it("handles zero-amount budget", async () => {
    db.budget.findFirst.mockResolvedValue({
      ...mockBudget,
      amount: 0,
      entries: [],
    });

    const result = await getBudgetSummary(db, ORG_ID, "budget-1");

    expect(result.percentUsed).toBe(0);
    expect(result.actualCost).toBe(0);
  });

  it("throws NotFoundError if budget not found", async () => {
    db.budget.findFirst.mockResolvedValue(null);

    await expect(getBudgetSummary(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── getProjectCostSummary ──────────────────────────────────────────────────

describe("getProjectCostSummary", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("aggregates costs across all project budgets", async () => {
    db.budget.findMany.mockResolvedValue([
      {
        ...mockBudget,
        id: "b-1",
        costType: "capex",
        amount: 30000,
        entries: [{ id: "e-1", cost: 10000 }],
      },
      {
        ...mockBudget,
        id: "b-2",
        costType: "opex",
        amount: 20000,
        entries: [
          { id: "e-2", cost: 5000 },
          { id: "e-3", cost: 3000 },
        ],
      },
    ]);

    const result = await getProjectCostSummary(db, ORG_ID, "proj-1");

    expect(result.totalBudgeted).toBe(50000); // 30000 + 20000
    expect(result.totalActual).toBe(18000); // 10000 + 5000 + 3000
    expect(result.remaining).toBe(32000); // 50000 - 18000
    expect(result.capexActual).toBe(10000);
    expect(result.opexActual).toBe(8000); // 5000 + 3000
  });

  it("returns zeros when no budgets exist", async () => {
    db.budget.findMany.mockResolvedValue([]);

    const result = await getProjectCostSummary(db, ORG_ID, "proj-1");

    expect(result.totalBudgeted).toBe(0);
    expect(result.totalActual).toBe(0);
    expect(result.remaining).toBe(0);
    expect(result.capexActual).toBe(0);
    expect(result.opexActual).toBe(0);
  });
});
