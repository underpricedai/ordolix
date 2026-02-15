import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  generateAssetTag,
  listAttributeDefinitions,
  createAttributeDefinition,
  updateAttributeDefinition,
  deleteAttributeDefinition,
  reorderAttributes,
  validateAttributes,
} from "./asset-attribute-service";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/server/lib/errors";

function createMockDb() {
  return {
    asset: {
      findFirst: vi.fn(),
    },
    assetType: {
      findFirst: vi.fn(),
    },
    assetAttributeDefinition: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";

const mockAttrDef = {
  id: "ad-1",
  organizationId: ORG_ID,
  assetTypeId: "at-1",
  name: "serialNumber",
  label: "Serial Number",
  fieldType: "text",
  isRequired: false,
  options: null,
  defaultValue: null,
  position: 0,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAssetType = {
  id: "at-1",
  organizationId: ORG_ID,
  name: "Server",
};

// ── generateAssetTag ──────────────────────────────────────────────────────

describe("generateAssetTag", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("generates AST-00001 when no assets exist", async () => {
    db.asset.findFirst.mockResolvedValue(null);

    const tag = await generateAssetTag(db, ORG_ID);
    expect(tag).toBe("AST-00001");
  });

  it("increments from the last asset tag", async () => {
    db.asset.findFirst.mockResolvedValue({ assetTag: "AST-00042" });

    const tag = await generateAssetTag(db, ORG_ID);
    expect(tag).toBe("AST-00043");
  });

  it("pads numbers to 5 digits", async () => {
    db.asset.findFirst.mockResolvedValue({ assetTag: "AST-00099" });

    const tag = await generateAssetTag(db, ORG_ID);
    expect(tag).toBe("AST-00100");
  });
});

// ── listAttributeDefinitions ──────────────────────────────────────────────

describe("listAttributeDefinitions", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.assetAttributeDefinition.findMany.mockResolvedValue([mockAttrDef]);
  });

  it("returns definitions ordered by position", async () => {
    const result = await listAttributeDefinitions(db, ORG_ID, "at-1");

    expect(result).toHaveLength(1);
    expect(db.assetAttributeDefinition.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, assetTypeId: "at-1" },
      orderBy: { position: "asc" },
    });
  });
});

// ── createAttributeDefinition ─────────────────────────────────────────────

describe("createAttributeDefinition", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.assetType.findFirst.mockResolvedValue(mockAssetType);
    db.assetAttributeDefinition.findFirst.mockResolvedValue(null);
    db.assetAttributeDefinition.create.mockResolvedValue(mockAttrDef);
  });

  it("creates an attribute definition", async () => {
    const result = await createAttributeDefinition(db, ORG_ID, {
      assetTypeId: "at-1",
      name: "serialNumber",
      label: "Serial Number",
      fieldType: "text",
      isRequired: false,
      position: 0,
    });

    expect(result.id).toBe("ad-1");
    expect(db.assetAttributeDefinition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        assetTypeId: "at-1",
        name: "serialNumber",
        fieldType: "text",
      }),
    });
  });

  it("throws NotFoundError if asset type does not exist", async () => {
    db.assetType.findFirst.mockResolvedValue(null);

    await expect(
      createAttributeDefinition(db, ORG_ID, {
        assetTypeId: "nope",
        name: "serialNumber",
        label: "Serial Number",
        fieldType: "text",
        isRequired: false,
        position: 0,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError if attribute name already exists for type", async () => {
    db.assetAttributeDefinition.findFirst.mockResolvedValue(mockAttrDef);

    await expect(
      createAttributeDefinition(db, ORG_ID, {
        assetTypeId: "at-1",
        name: "serialNumber",
        label: "Serial Number",
        fieldType: "text",
        isRequired: false,
        position: 0,
      }),
    ).rejects.toThrow(ConflictError);
  });
});

// ── updateAttributeDefinition ─────────────────────────────────────────────

describe("updateAttributeDefinition", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.assetAttributeDefinition.findFirst.mockResolvedValue(mockAttrDef);
    db.assetAttributeDefinition.update.mockResolvedValue({
      ...mockAttrDef,
      label: "SN",
    });
  });

  it("updates an attribute definition", async () => {
    const result = await updateAttributeDefinition(db, ORG_ID, "ad-1", {
      label: "SN",
    });

    expect(result.label).toBe("SN");
    expect(db.assetAttributeDefinition.update).toHaveBeenCalledWith({
      where: { id: "ad-1" },
      data: expect.objectContaining({ label: "SN" }),
    });
  });

  it("throws NotFoundError if definition not found", async () => {
    db.assetAttributeDefinition.findFirst.mockResolvedValue(null);

    await expect(
      updateAttributeDefinition(db, ORG_ID, "nope", { label: "SN" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteAttributeDefinition ─────────────────────────────────────────────

describe("deleteAttributeDefinition", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.assetAttributeDefinition.findFirst.mockResolvedValue(mockAttrDef);
    db.assetAttributeDefinition.delete.mockResolvedValue(mockAttrDef);
  });

  it("deletes an attribute definition", async () => {
    await deleteAttributeDefinition(db, ORG_ID, "ad-1");

    expect(db.assetAttributeDefinition.delete).toHaveBeenCalledWith({
      where: { id: "ad-1" },
    });
  });

  it("throws NotFoundError if not found", async () => {
    db.assetAttributeDefinition.findFirst.mockResolvedValue(null);

    await expect(
      deleteAttributeDefinition(db, ORG_ID, "nope"),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── reorderAttributes ─────────────────────────────────────────────────────

describe("reorderAttributes", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.assetType.findFirst.mockResolvedValue(mockAssetType);
    db.assetAttributeDefinition.updateMany.mockResolvedValue({ count: 1 });
    db.assetAttributeDefinition.findMany.mockResolvedValue([mockAttrDef]);
  });

  it("updates positions for all items", async () => {
    await reorderAttributes(db, ORG_ID, {
      assetTypeId: "at-1",
      order: [{ id: "ad-1", position: 2 }],
    });

    expect(db.assetAttributeDefinition.updateMany).toHaveBeenCalledWith({
      where: { id: "ad-1", organizationId: ORG_ID, assetTypeId: "at-1" },
      data: { position: 2 },
    });
  });

  it("throws NotFoundError if asset type not found", async () => {
    db.assetType.findFirst.mockResolvedValue(null);

    await expect(
      reorderAttributes(db, ORG_ID, {
        assetTypeId: "nope",
        order: [{ id: "ad-1", position: 0 }],
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── validateAttributes ────────────────────────────────────────────────────

describe("validateAttributes", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("passes when no definitions exist", async () => {
    db.assetAttributeDefinition.findMany.mockResolvedValue([]);

    await expect(
      validateAttributes(db, ORG_ID, "at-1", { anything: "goes" }),
    ).resolves.toBeUndefined();
  });

  it("passes when all required fields are present", async () => {
    db.assetAttributeDefinition.findMany.mockResolvedValue([
      { ...mockAttrDef, isRequired: true },
    ]);

    await expect(
      validateAttributes(db, ORG_ID, "at-1", { serialNumber: "SN-123" }),
    ).resolves.toBeUndefined();
  });

  it("throws when required field is missing", async () => {
    db.assetAttributeDefinition.findMany.mockResolvedValue([
      { ...mockAttrDef, isRequired: true },
    ]);

    await expect(
      validateAttributes(db, ORG_ID, "at-1", {}),
    ).rejects.toThrow(ValidationError);
  });

  it("throws when field value has wrong type for number", async () => {
    db.assetAttributeDefinition.findMany.mockResolvedValue([
      { ...mockAttrDef, fieldType: "number" },
    ]);

    // Non-numeric strings should fail
    await expect(
      validateAttributes(db, ORG_ID, "at-1", { serialNumber: "abc" }),
    ).rejects.toThrow(ValidationError);
  });

  it("accepts valid numeric string for number field", async () => {
    db.assetAttributeDefinition.findMany.mockResolvedValue([
      { ...mockAttrDef, fieldType: "number" },
    ]);

    await expect(
      validateAttributes(db, ORG_ID, "at-1", { serialNumber: "42" }),
    ).resolves.toBeUndefined();
  });

  it("validates select fields against options", async () => {
    db.assetAttributeDefinition.findMany.mockResolvedValue([
      { ...mockAttrDef, fieldType: "select", options: ["a", "b", "c"] },
    ]);

    await expect(
      validateAttributes(db, ORG_ID, "at-1", { serialNumber: "d" }),
    ).rejects.toThrow(ValidationError);

    db.assetAttributeDefinition.findMany.mockResolvedValue([
      { ...mockAttrDef, fieldType: "select", options: ["a", "b", "c"] },
    ]);

    await expect(
      validateAttributes(db, ORG_ID, "at-1", { serialNumber: "a" }),
    ).resolves.toBeUndefined();
  });

  it("validates date fields", async () => {
    db.assetAttributeDefinition.findMany.mockResolvedValue([
      { ...mockAttrDef, fieldType: "date" },
    ]);

    await expect(
      validateAttributes(db, ORG_ID, "at-1", { serialNumber: "2025-01-15" }),
    ).resolves.toBeUndefined();

    db.assetAttributeDefinition.findMany.mockResolvedValue([
      { ...mockAttrDef, fieldType: "date" },
    ]);

    await expect(
      validateAttributes(db, ORG_ID, "at-1", { serialNumber: "not-a-date" }),
    ).rejects.toThrow(ValidationError);
  });

  it("validates boolean fields", async () => {
    db.assetAttributeDefinition.findMany.mockResolvedValue([
      { ...mockAttrDef, fieldType: "boolean" },
    ]);

    await expect(
      validateAttributes(db, ORG_ID, "at-1", { serialNumber: true }),
    ).resolves.toBeUndefined();

    db.assetAttributeDefinition.findMany.mockResolvedValue([
      { ...mockAttrDef, fieldType: "boolean" },
    ]);

    await expect(
      validateAttributes(db, ORG_ID, "at-1", { serialNumber: "true" }),
    ).resolves.toBeUndefined();
  });

  it("skips validation for optional empty fields", async () => {
    db.assetAttributeDefinition.findMany.mockResolvedValue([
      { ...mockAttrDef, isRequired: false, fieldType: "number" },
    ]);

    await expect(
      validateAttributes(db, ORG_ID, "at-1", {}),
    ).resolves.toBeUndefined();
  });
});
