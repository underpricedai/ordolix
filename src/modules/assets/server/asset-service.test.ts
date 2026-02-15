import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createAssetType,
  listAssetTypes,
  updateAssetType,
  deleteAssetType,
  createAsset,
  getAsset,
  listAssets,
  updateAsset,
  deleteAsset,
  addRelationship,
  removeRelationship,
} from "./asset-service";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/server/lib/errors";

// Mock dependent services
vi.mock("./asset-attribute-service", () => ({
  generateAssetTag: vi.fn().mockResolvedValue("AST-00001"),
  validateAttributes: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./asset-lifecycle-service", () => ({
  logAssetHistory: vi.fn().mockResolvedValue({}),
}));

function createMockDb() {
  return {
    assetType: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    asset: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    assetRelationship: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    assetHistory: {
      create: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockAssetType = {
  id: "at-1",
  organizationId: ORG_ID,
  name: "Server",
  icon: null,
  description: null,
  color: null,
  schema: {},
  createdAt: new Date(),
};

const mockAsset = {
  id: "a-1",
  organizationId: ORG_ID,
  assetTypeId: "at-1",
  assetTag: "AST-00001",
  name: "Server-001",
  status: "ordered",
  assigneeId: null,
  attributes: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  assetType: mockAssetType,
};

const mockRelationship = {
  id: "rel-1",
  fromAssetId: "a-1",
  toAssetId: "a-2",
  relationshipType: "depends_on",
  createdAt: new Date(),
  fromAsset: mockAsset,
  toAsset: { ...mockAsset, id: "a-2", name: "Server-002" },
};

// ── createAssetType ─────────────────────────────────────────────────────────

describe("createAssetType", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.assetType.findFirst.mockResolvedValue(null);
    db.assetType.create.mockResolvedValue(mockAssetType);
  });

  it("creates an asset type", async () => {
    const result = await createAssetType(db, ORG_ID, { name: "Server", schema: {} });

    expect(result.id).toBe("at-1");
    expect(db.assetType.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        name: "Server",
      }),
    });
  });

  it("throws ConflictError if name already exists", async () => {
    db.assetType.findFirst.mockResolvedValue(mockAssetType);

    await expect(
      createAssetType(db, ORG_ID, { name: "Server", schema: {} }),
    ).rejects.toThrow(ConflictError);
  });
});

// ── listAssetTypes ──────────────────────────────────────────────────────────

describe("listAssetTypes", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.assetType.findMany.mockResolvedValue([mockAssetType]);
  });

  it("returns all asset types for org", async () => {
    const result = await listAssetTypes(db, ORG_ID);

    expect(result).toHaveLength(1);
    expect(db.assetType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID },
      }),
    );
  });
});

// ── updateAssetType ─────────────────────────────────────────────────────────

describe("updateAssetType", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.assetType.findFirst.mockResolvedValue(mockAssetType);
    db.assetType.update.mockResolvedValue({ ...mockAssetType, name: "Router" });
  });

  it("updates an asset type", async () => {
    db.assetType.findFirst
      .mockResolvedValueOnce(mockAssetType)
      .mockResolvedValueOnce(null);

    const result = await updateAssetType(db, ORG_ID, "at-1", { name: "Router" });

    expect(result.name).toBe("Router");
    expect(db.assetType.update).toHaveBeenCalledWith({
      where: { id: "at-1" },
      data: expect.objectContaining({ name: "Router" }),
    });
  });

  it("throws NotFoundError if asset type not found", async () => {
    db.assetType.findFirst.mockResolvedValue(null);

    await expect(
      updateAssetType(db, ORG_ID, "nope", { name: "Router" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError if new name conflicts", async () => {
    db.assetType.findFirst
      .mockResolvedValueOnce(mockAssetType)
      .mockResolvedValueOnce({ ...mockAssetType, id: "at-2", name: "Router" });

    await expect(
      updateAssetType(db, ORG_ID, "at-1", { name: "Router" }),
    ).rejects.toThrow(ConflictError);
  });
});

// ── deleteAssetType ─────────────────────────────────────────────────────────

describe("deleteAssetType", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.assetType.findFirst.mockResolvedValue(mockAssetType);
    db.assetType.delete.mockResolvedValue(mockAssetType);
  });

  it("deletes an asset type", async () => {
    await deleteAssetType(db, ORG_ID, "at-1");

    expect(db.assetType.delete).toHaveBeenCalledWith({ where: { id: "at-1" } });
  });

  it("throws NotFoundError if asset type not found", async () => {
    db.assetType.findFirst.mockResolvedValue(null);

    await expect(deleteAssetType(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── createAsset ─────────────────────────────────────────────────────────────

describe("createAsset", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.assetType.findFirst.mockResolvedValue(mockAssetType);
    db.asset.create.mockResolvedValue(mockAsset);
  });

  it("creates an asset with generated tag", async () => {
    const result = await createAsset(db, ORG_ID, {
      assetTypeId: "at-1",
      name: "Server-001",
      status: "ordered",
      attributes: {},
    }, USER_ID);

    expect(result.id).toBe("a-1");
    expect(db.asset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        assetTypeId: "at-1",
        assetTag: "AST-00001",
        name: "Server-001",
      }),
      include: { assetType: true },
    });
  });

  it("throws NotFoundError if asset type does not exist", async () => {
    db.assetType.findFirst.mockResolvedValue(null);

    await expect(
      createAsset(db, ORG_ID, {
        assetTypeId: "nope",
        name: "Server-001",
        status: "ordered",
        attributes: {},
      }, USER_ID),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── getAsset ────────────────────────────────────────────────────────────────

describe("getAsset", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.asset.findFirst.mockResolvedValue({
      ...mockAsset,
      assignee: null,
      relationshipsFrom: [],
      relationshipsTo: [],
      history: [],
    });
  });

  it("returns asset with relationships and history", async () => {
    const result = await getAsset(db, ORG_ID, "a-1");

    expect(result.id).toBe("a-1");
    expect(db.asset.findFirst).toHaveBeenCalledWith({
      where: { id: "a-1", organizationId: ORG_ID },
      include: expect.objectContaining({
        assetType: true,
        assignee: expect.any(Object),
        relationshipsFrom: expect.any(Object),
        relationshipsTo: expect.any(Object),
        history: expect.any(Object),
      }),
    });
  });

  it("throws NotFoundError if asset not found", async () => {
    db.asset.findFirst.mockResolvedValue(null);

    await expect(getAsset(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });
});

// ── listAssets ───────────────────────────────────────────────────────────────

describe("listAssets", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.asset.findMany.mockResolvedValue([mockAsset]);
  });

  it("returns assets for org", async () => {
    const result = await listAssets(db, ORG_ID, { limit: 50 });

    expect(result).toHaveLength(1);
    expect(db.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID },
        take: 50,
      }),
    );
  });

  it("filters by assetTypeId and status", async () => {
    await listAssets(db, ORG_ID, {
      assetTypeId: "at-1",
      status: "ordered",
      limit: 10,
    });

    expect(db.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: ORG_ID,
          assetTypeId: "at-1",
          status: "ordered",
        },
        take: 10,
      }),
    );
  });
});

// ── updateAsset ─────────────────────────────────────────────────────────────

describe("updateAsset", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.asset.findFirst.mockResolvedValue(mockAsset);
    db.asset.update.mockResolvedValue({ ...mockAsset, status: "retired" });
  });

  it("updates an asset and logs history", async () => {
    const result = await updateAsset(db, ORG_ID, "a-1", { status: "retired" }, USER_ID);

    expect(result.status).toBe("retired");
    expect(db.asset.update).toHaveBeenCalledWith({
      where: { id: "a-1" },
      data: expect.objectContaining({ status: "retired" }),
      include: { assetType: true },
    });
  });

  it("throws NotFoundError if asset not found", async () => {
    db.asset.findFirst.mockResolvedValue(null);

    await expect(
      updateAsset(db, ORG_ID, "nope", { status: "retired" }, USER_ID),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteAsset ─────────────────────────────────────────────────────────────

describe("deleteAsset", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.asset.findFirst.mockResolvedValue(mockAsset);
    db.asset.delete.mockResolvedValue(mockAsset);
  });

  it("deletes an asset and logs history", async () => {
    await deleteAsset(db, ORG_ID, "a-1", USER_ID);

    expect(db.asset.delete).toHaveBeenCalledWith({ where: { id: "a-1" } });
  });

  it("throws NotFoundError if asset not found", async () => {
    db.asset.findFirst.mockResolvedValue(null);

    await expect(deleteAsset(db, ORG_ID, "nope", USER_ID)).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── addRelationship ─────────────────────────────────────────────────────────

describe("addRelationship", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.asset.findFirst.mockResolvedValue(mockAsset);
    db.assetRelationship.create.mockResolvedValue(mockRelationship);
  });

  it("creates a relationship between two assets", async () => {
    const result = await addRelationship(db, ORG_ID, {
      fromAssetId: "a-1",
      toAssetId: "a-2",
      relationshipType: "depends_on",
    }, USER_ID);

    expect(result.id).toBe("rel-1");
    expect(db.assetRelationship.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromAssetId: "a-1",
        toAssetId: "a-2",
        relationshipType: "depends_on",
      }),
      include: { fromAsset: true, toAsset: true },
    });
  });

  it("throws ValidationError for self-referencing relationship", async () => {
    await expect(
      addRelationship(db, ORG_ID, {
        fromAssetId: "a-1",
        toAssetId: "a-1",
        relationshipType: "depends_on",
      }, USER_ID),
    ).rejects.toThrow(ValidationError);
  });

  it("throws NotFoundError if fromAsset not found", async () => {
    db.asset.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(mockAsset);

    await expect(
      addRelationship(db, ORG_ID, {
        fromAssetId: "nope",
        toAssetId: "a-2",
        relationshipType: "depends_on",
      }, USER_ID),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError if toAsset not found", async () => {
    db.asset.findFirst.mockResolvedValueOnce(mockAsset).mockResolvedValueOnce(null);

    await expect(
      addRelationship(db, ORG_ID, {
        fromAssetId: "a-1",
        toAssetId: "nope",
        relationshipType: "depends_on",
      }, USER_ID),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── removeRelationship ──────────────────────────────────────────────────────

describe("removeRelationship", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.assetRelationship.findFirst.mockResolvedValue(mockRelationship);
    db.assetRelationship.delete.mockResolvedValue(mockRelationship);
  });

  it("removes a relationship and logs history", async () => {
    await removeRelationship(db, ORG_ID, "rel-1", USER_ID);

    expect(db.assetRelationship.delete).toHaveBeenCalledWith({
      where: { id: "rel-1" },
    });
  });

  it("throws NotFoundError if relationship not found", async () => {
    db.assetRelationship.findFirst.mockResolvedValue(null);

    await expect(removeRelationship(db, ORG_ID, "nope", USER_ID)).rejects.toThrow(
      NotFoundError,
    );
  });
});
