import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  listLifecycleTransitions,
  setLifecycleTransitions,
  transitionAssetStatus,
  getAssetHistory,
  logAssetHistory,
  DEFAULT_TRANSITIONS,
} from "./asset-lifecycle-service";
import {
  NotFoundError,
  ValidationError,
} from "@/server/lib/errors";

function createMockDb() {
  return {
    asset: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    assetType: {
      findFirst: vi.fn(),
    },
    assetLifecycleTransition: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    assetHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";

const mockAsset = {
  id: "a-1",
  organizationId: ORG_ID,
  assetTypeId: "at-1",
  assetTag: "AST-00001",
  name: "Server-001",
  status: "ordered",
  attributes: {},
  assetType: { id: "at-1", name: "Server" },
};

const mockTransition = {
  id: "lt-1",
  organizationId: ORG_ID,
  assetTypeId: null,
  fromStatus: "ordered",
  toStatus: "received",
  requiredFields: [],
};

// ── listLifecycleTransitions ──────────────────────────────────────────────

describe("listLifecycleTransitions", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns transitions for a specific asset type", async () => {
    db.assetLifecycleTransition.findMany.mockResolvedValue([mockTransition]);

    const result = await listLifecycleTransitions(db, ORG_ID, "at-1");
    expect(result).toHaveLength(1);
  });

  it("falls back to global transitions when type-specific are empty", async () => {
    db.assetLifecycleTransition.findMany
      .mockResolvedValueOnce([]) // type-specific returns empty
      .mockResolvedValueOnce([mockTransition]); // global returns results

    const result = await listLifecycleTransitions(db, ORG_ID, "at-1");
    expect(result).toHaveLength(1);
  });
});

// ── setLifecycleTransitions ───────────────────────────────────────────────

describe("setLifecycleTransitions", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.assetLifecycleTransition.deleteMany.mockResolvedValue({ count: 0 });
    db.assetLifecycleTransition.createMany.mockResolvedValue({ count: 1 });
    db.assetLifecycleTransition.findMany.mockResolvedValue([mockTransition]);
  });

  it("replaces existing transitions", async () => {
    const result = await setLifecycleTransitions(db, ORG_ID, {
      assetTypeId: null,
      transitions: [
        { fromStatus: "ordered", toStatus: "received", requiredFields: [] },
      ],
    });

    expect(db.assetLifecycleTransition.deleteMany).toHaveBeenCalled();
    expect(db.assetLifecycleTransition.createMany).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("throws ValidationError when from equals to", async () => {
    await expect(
      setLifecycleTransitions(db, ORG_ID, {
        assetTypeId: null,
        transitions: [
          { fromStatus: "ordered", toStatus: "ordered", requiredFields: [] },
        ],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws NotFoundError if specified asset type does not exist", async () => {
    db.assetType.findFirst.mockResolvedValue(null);

    await expect(
      setLifecycleTransitions(db, ORG_ID, {
        assetTypeId: "nope",
        transitions: [
          { fromStatus: "ordered", toStatus: "received", requiredFields: [] },
        ],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("handles empty transitions array (clear all)", async () => {
    const result = await setLifecycleTransitions(db, ORG_ID, {
      assetTypeId: null,
      transitions: [],
    });

    expect(db.assetLifecycleTransition.deleteMany).toHaveBeenCalled();
    expect(db.assetLifecycleTransition.createMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

// ── transitionAssetStatus ─────────────────────────────────────────────────

describe("transitionAssetStatus", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.asset.findFirst.mockResolvedValue(mockAsset);
    db.asset.update.mockResolvedValue({ ...mockAsset, status: "received" });
    db.assetHistory.create.mockResolvedValue({});
  });

  it("transitions asset to new status when allowed (default transitions)", async () => {
    // No configured transitions, falls back to defaults
    db.assetLifecycleTransition.findFirst.mockResolvedValue(null);
    db.assetLifecycleTransition.count.mockResolvedValue(0);

    const result = await transitionAssetStatus(
      db, ORG_ID, "a-1", "received", "user-1",
    );

    expect(result.status).toBe("received");
    expect(db.asset.update).toHaveBeenCalledWith({
      where: { id: "a-1" },
      data: { status: "received" },
      include: { assetType: true },
    });
    expect(db.assetHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "status_changed",
        field: "status",
        oldValue: "ordered",
        newValue: "received",
      }),
    });
  });

  it("throws NotFoundError if asset does not exist", async () => {
    db.asset.findFirst.mockResolvedValue(null);

    await expect(
      transitionAssetStatus(db, ORG_ID, "nope", "received", "user-1"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError if already in target status", async () => {
    db.asset.findFirst.mockResolvedValue({ ...mockAsset, status: "received" });

    await expect(
      transitionAssetStatus(db, ORG_ID, "a-1", "received", "user-1"),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError if transition is not allowed", async () => {
    // ordered -> disposed is allowed by default, ordered -> in_use is not
    db.assetLifecycleTransition.findFirst.mockResolvedValue(null);
    db.assetLifecycleTransition.count.mockResolvedValue(0);

    await expect(
      transitionAssetStatus(db, ORG_ID, "a-1", "in_use", "user-1"),
    ).rejects.toThrow(ValidationError);
  });

  it("transitions using configured rules instead of defaults", async () => {
    db.assetLifecycleTransition.findFirst.mockResolvedValue(mockTransition);

    const result = await transitionAssetStatus(
      db, ORG_ID, "a-1", "received", "user-1",
    );

    expect(result.status).toBe("received");
  });

  it("throws ValidationError when required fields are missing", async () => {
    db.assetLifecycleTransition.findFirst.mockResolvedValue({
      ...mockTransition,
      requiredFields: ["serialNumber"],
    });

    await expect(
      transitionAssetStatus(db, ORG_ID, "a-1", "received", "user-1"),
    ).rejects.toThrow(ValidationError);
  });

  it("passes when required fields are present", async () => {
    db.asset.findFirst.mockResolvedValue({
      ...mockAsset,
      attributes: { serialNumber: "SN-001" },
    });
    db.assetLifecycleTransition.findFirst.mockResolvedValue({
      ...mockTransition,
      requiredFields: ["serialNumber"],
    });

    const result = await transitionAssetStatus(
      db, ORG_ID, "a-1", "received", "user-1",
    );

    expect(result.status).toBe("received");
  });
});

// ── getAssetHistory ───────────────────────────────────────────────────────

describe("getAssetHistory", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.asset.findFirst.mockResolvedValue({ id: "a-1" });
    db.assetHistory.findMany.mockResolvedValue([]);
  });

  it("returns paginated history", async () => {
    const result = await getAssetHistory(db, ORG_ID, {
      assetId: "a-1",
      limit: 50,
    });

    expect(result).toEqual([]);
    expect(db.assetHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { assetId: "a-1", organizationId: ORG_ID },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    );
  });

  it("throws NotFoundError if asset not found", async () => {
    db.asset.findFirst.mockResolvedValue(null);

    await expect(
      getAssetHistory(db, ORG_ID, { assetId: "nope", limit: 50 }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── logAssetHistory ───────────────────────────────────────────────────────

describe("logAssetHistory", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.assetHistory.create.mockResolvedValue({});
  });

  it("creates a history entry", async () => {
    await logAssetHistory(db, ORG_ID, "a-1", "user-1", "created");

    expect(db.assetHistory.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_ID,
        assetId: "a-1",
        userId: "user-1",
        action: "created",
        field: null,
        oldValue: null,
        newValue: null,
      },
    });
  });

  it("creates a history entry with field changes", async () => {
    await logAssetHistory(
      db, ORG_ID, "a-1", "user-1", "updated", "name", "Old", "New",
    );

    expect(db.assetHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        field: "name",
        oldValue: "Old",
        newValue: "New",
      }),
    });
  });
});

// ── DEFAULT_TRANSITIONS ───────────────────────────────────────────────────

describe("DEFAULT_TRANSITIONS", () => {
  it("contains expected transitions", () => {
    expect(DEFAULT_TRANSITIONS).toContainEqual({
      fromStatus: "ordered",
      toStatus: "received",
    });
    expect(DEFAULT_TRANSITIONS).toContainEqual({
      fromStatus: "in_use",
      toStatus: "retired",
    });
  });

  it("does not contain self-transitions", () => {
    for (const t of DEFAULT_TRANSITIONS) {
      expect(t.fromStatus).not.toBe(t.toStatus);
    }
  });
});
