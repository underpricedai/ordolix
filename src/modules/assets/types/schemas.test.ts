import { describe, expect, it } from "vitest";
import {
  createAssetTypeInput,
  updateAssetTypeInput,
  createAssetInput,
  updateAssetInput,
  listAssetsInput,
  addRelationshipInput,
  removeRelationshipInput,
  createAttributeDefinitionInput,
  updateAttributeDefinitionInput,
  reorderAttributesInput,
  setLifecycleTransitionsInput,
  transitionAssetStatusInput,
  getAssetHistoryInput,
  ASSET_STATUSES,
  ATTRIBUTE_FIELD_TYPES,
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
      description: "Laptop computers",
      color: "#4BADE8",
      schema: { brand: "string" },
    });
    expect(result.name).toBe("Laptop");
    expect(result.icon).toBe("laptop");
    expect(result.description).toBe("Laptop computers");
    expect(result.color).toBe("#4BADE8");
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
    const result = updateAssetTypeInput.parse({ id: "at-1", name: "Router", description: "Routers" });
    expect(result.id).toBe("at-1");
    expect(result.name).toBe("Router");
    expect(result.description).toBe("Routers");
  });
});

describe("createAssetInput", () => {
  it("accepts valid input with defaults", () => {
    const result = createAssetInput.parse({
      assetTypeId: "at-1",
      name: "Server-001",
    });
    expect(result.status).toBe("ordered");
    expect(result.attributes).toEqual({});
  });

  it("accepts valid status values", () => {
    for (const status of ASSET_STATUSES) {
      const result = createAssetInput.parse({
        assetTypeId: "at-1",
        name: "Test",
        status,
      });
      expect(result.status).toBe(status);
    }
  });

  it("rejects invalid status", () => {
    expect(() =>
      createAssetInput.parse({
        assetTypeId: "at-1",
        name: "Test",
        status: "invalid_status",
      }),
    ).toThrow();
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

  it("accepts nullable assigneeId", () => {
    const result = updateAssetInput.parse({ id: "a-1", assigneeId: null });
    expect(result.assigneeId).toBeNull();
  });
});

describe("listAssetsInput", () => {
  it("provides default limit of 50", () => {
    const result = listAssetsInput.parse({});
    expect(result.limit).toBe(50);
  });

  it("accepts filters including assigneeId", () => {
    const result = listAssetsInput.parse({
      assetTypeId: "at-1",
      status: "ordered",
      assigneeId: "user-1",
      limit: 10,
      cursor: "c-1",
    });
    expect(result.assetTypeId).toBe("at-1");
    expect(result.status).toBe("ordered");
    expect(result.assigneeId).toBe("user-1");
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

describe("createAttributeDefinitionInput", () => {
  it("accepts valid input", () => {
    const result = createAttributeDefinitionInput.parse({
      assetTypeId: "at-1",
      name: "serialNumber",
      label: "Serial Number",
      fieldType: "text",
    });
    expect(result.name).toBe("serialNumber");
    expect(result.isRequired).toBe(false);
    expect(result.position).toBe(0);
  });

  it("validates name is a valid identifier", () => {
    expect(() =>
      createAttributeDefinitionInput.parse({
        assetTypeId: "at-1",
        name: "123invalid",
        label: "Test",
        fieldType: "text",
      }),
    ).toThrow();
  });

  it("rejects invalid field types", () => {
    expect(() =>
      createAttributeDefinitionInput.parse({
        assetTypeId: "at-1",
        name: "test",
        label: "Test",
        fieldType: "invalid_type",
      }),
    ).toThrow();
  });

  it("accepts all valid field types", () => {
    for (const fieldType of ATTRIBUTE_FIELD_TYPES) {
      const result = createAttributeDefinitionInput.parse({
        assetTypeId: "at-1",
        name: "test",
        label: "Test",
        fieldType,
      });
      expect(result.fieldType).toBe(fieldType);
    }
  });
});

describe("updateAttributeDefinitionInput", () => {
  it("requires id", () => {
    expect(() => updateAttributeDefinitionInput.parse({})).toThrow();
  });

  it("accepts partial updates", () => {
    const result = updateAttributeDefinitionInput.parse({
      id: "ad-1",
      label: "Updated Label",
      isRequired: true,
    });
    expect(result.label).toBe("Updated Label");
    expect(result.isRequired).toBe(true);
  });
});

describe("reorderAttributesInput", () => {
  it("accepts valid reorder input", () => {
    const result = reorderAttributesInput.parse({
      assetTypeId: "at-1",
      order: [
        { id: "ad-1", position: 0 },
        { id: "ad-2", position: 1 },
      ],
    });
    expect(result.order).toHaveLength(2);
  });
});

describe("setLifecycleTransitionsInput", () => {
  it("accepts valid transitions", () => {
    const result = setLifecycleTransitionsInput.parse({
      assetTypeId: null,
      transitions: [
        { fromStatus: "ordered", toStatus: "received" },
        { fromStatus: "received", toStatus: "deployed" },
      ],
    });
    expect(result.transitions).toHaveLength(2);
    expect(result.transitions[0]?.requiredFields).toEqual([]);
  });

  it("accepts transitions with required fields", () => {
    const result = setLifecycleTransitionsInput.parse({
      assetTypeId: "at-1",
      transitions: [
        {
          fromStatus: "ordered",
          toStatus: "received",
          requiredFields: ["serialNumber"],
        },
      ],
    });
    expect(result.transitions[0]?.requiredFields).toEqual(["serialNumber"]);
  });
});

describe("transitionAssetStatusInput", () => {
  it("accepts valid input", () => {
    const result = transitionAssetStatusInput.parse({
      assetId: "a-1",
      toStatus: "received",
    });
    expect(result.assetId).toBe("a-1");
    expect(result.toStatus).toBe("received");
  });

  it("rejects invalid status", () => {
    expect(() =>
      transitionAssetStatusInput.parse({
        assetId: "a-1",
        toStatus: "bad_status",
      }),
    ).toThrow();
  });
});

describe("getAssetHistoryInput", () => {
  it("provides default limit", () => {
    const result = getAssetHistoryInput.parse({ assetId: "a-1" });
    expect(result.limit).toBe(50);
  });

  it("accepts cursor for pagination", () => {
    const result = getAssetHistoryInput.parse({
      assetId: "a-1",
      limit: 20,
      cursor: "h-1",
    });
    expect(result.cursor).toBe("h-1");
  });
});
