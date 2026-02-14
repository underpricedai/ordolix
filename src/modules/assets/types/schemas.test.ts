import { describe, expect, it } from "vitest";
import {
  createAssetTypeInput,
  updateAssetTypeInput,
  createAssetInput,
  updateAssetInput,
  listAssetsInput,
  addRelationshipInput,
  removeRelationshipInput,
} from "./schemas";

describe("createAssetTypeInput", () => {
  it("accepts valid input with name only", () => {
    const result = createAssetTypeInput.parse({ name: "Server" });
    expect(result.name).toBe("Server");
    expect(result.schema).toEqual({});
  });

  it("accepts valid input with all fields", () => {
    const result = createAssetTypeInput.parse({
      name: "Laptop",
      icon: "laptop",
      schema: { brand: "string" },
    });
    expect(result.name).toBe("Laptop");
    expect(result.icon).toBe("laptop");
    expect(result.schema).toEqual({ brand: "string" });
  });

  it("rejects empty name", () => {
    expect(() => createAssetTypeInput.parse({ name: "" })).toThrow();
  });

  it("rejects name longer than 255 characters", () => {
    expect(() =>
      createAssetTypeInput.parse({ name: "x".repeat(256) }),
    ).toThrow();
  });
});

describe("updateAssetTypeInput", () => {
  it("requires id", () => {
    expect(() => updateAssetTypeInput.parse({})).toThrow();
  });

  it("accepts id with optional fields", () => {
    const result = updateAssetTypeInput.parse({ id: "at-1", name: "Router" });
    expect(result.id).toBe("at-1");
    expect(result.name).toBe("Router");
  });
});

describe("createAssetInput", () => {
  it("accepts valid input with defaults", () => {
    const result = createAssetInput.parse({
      assetTypeId: "at-1",
      name: "Server-001",
    });
    expect(result.status).toBe("active");
    expect(result.attributes).toEqual({});
  });

  it("rejects missing assetTypeId", () => {
    expect(() => createAssetInput.parse({ name: "Server-001" })).toThrow();
  });
});

describe("updateAssetInput", () => {
  it("requires id", () => {
    expect(() => updateAssetInput.parse({})).toThrow();
  });

  it("accepts partial updates", () => {
    const result = updateAssetInput.parse({ id: "a-1", status: "retired" });
    expect(result.status).toBe("retired");
    expect(result.name).toBeUndefined();
  });
});

describe("listAssetsInput", () => {
  it("provides default limit of 50", () => {
    const result = listAssetsInput.parse({});
    expect(result.limit).toBe(50);
  });

  it("accepts filters", () => {
    const result = listAssetsInput.parse({
      assetTypeId: "at-1",
      status: "active",
      limit: 10,
      cursor: "c-1",
    });
    expect(result.assetTypeId).toBe("at-1");
    expect(result.status).toBe("active");
    expect(result.limit).toBe(10);
    expect(result.cursor).toBe("c-1");
  });
});

describe("addRelationshipInput", () => {
  it("accepts valid input", () => {
    const result = addRelationshipInput.parse({
      fromAssetId: "a-1",
      toAssetId: "a-2",
      relationshipType: "depends_on",
    });
    expect(result.relationshipType).toBe("depends_on");
  });

  it("rejects relationshipType longer than 100 characters", () => {
    expect(() =>
      addRelationshipInput.parse({
        fromAssetId: "a-1",
        toAssetId: "a-2",
        relationshipType: "x".repeat(101),
      }),
    ).toThrow();
  });
});

describe("removeRelationshipInput", () => {
  it("requires id", () => {
    expect(() => removeRelationshipInput.parse({})).toThrow();
  });

  it("accepts valid id", () => {
    const result = removeRelationshipInput.parse({ id: "rel-1" });
    expect(result.id).toBe("rel-1");
  });
});
