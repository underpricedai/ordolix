import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createField,
  updateField,
  listFields,
  getField,
  deleteField,
  setFieldValue,
  getFieldValues,
  validateFieldValue,
} from "./custom-field-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    customField: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    customFieldValue: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockTextField = {
  id: "field-1",
  organizationId: ORG_ID,
  name: "Sprint",
  fieldType: "text",
  description: null,
  options: null,
  defaultValue: null,
  context: { type: "issue" },
  isRequired: false,
  aggregation: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSelectField = {
  ...mockTextField,
  id: "field-2",
  name: "Region",
  fieldType: "select",
  options: ["US", "EU", "APAC"],
};

// ── createField ──────────────────────────────────────────────────────────────

describe("createField", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.customField.create.mockResolvedValue(mockTextField);
    db.auditLog.create.mockResolvedValue({});
  });

  it("creates a text custom field", async () => {
    const result = await createField(db, ORG_ID, USER_ID, {
      name: "Sprint",
      fieldType: "text",
      isRequired: false,
      context: "issue",
    });

    expect(result).toEqual(mockTextField);
    expect(db.customField.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        name: "Sprint",
        fieldType: "text",
      }),
    });
  });

  it("creates an audit log entry", async () => {
    await createField(db, ORG_ID, USER_ID, {
      name: "Sprint",
      fieldType: "text",
      isRequired: false,
      context: "issue",
    });

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        userId: USER_ID,
        entityType: "CustomField",
        action: "CREATED",
      }),
    });
  });

  it("throws ValidationError for select without options", async () => {
    await expect(
      createField(db, ORG_ID, USER_ID, {
        name: "Region",
        fieldType: "select",
        isRequired: false,
        context: "issue",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("creates a select field with options", async () => {
    db.customField.create.mockResolvedValue(mockSelectField);

    const result = await createField(db, ORG_ID, USER_ID, {
      name: "Region",
      fieldType: "select",
      options: ["US", "EU", "APAC"],
      isRequired: false,
      context: "issue",
    });

    expect(result.options).toEqual(["US", "EU", "APAC"]);
  });
});

// ── updateField ──────────────────────────────────────────────────────────────

describe("updateField", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.customField.findFirst.mockResolvedValue(mockTextField);
    db.customField.update.mockResolvedValue({
      ...mockTextField,
      name: "Updated Sprint",
    });
  });

  it("updates the field name", async () => {
    const result = await updateField(db, ORG_ID, {
      id: "field-1",
      name: "Updated Sprint",
    });

    expect(result.name).toBe("Updated Sprint");
    expect(db.customField.update).toHaveBeenCalledWith({
      where: { id: "field-1" },
      data: { name: "Updated Sprint" },
    });
  });

  it("throws NotFoundError if field does not exist", async () => {
    db.customField.findFirst.mockResolvedValue(null);

    await expect(
      updateField(db, ORG_ID, { id: "nope", name: "x" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── listFields ───────────────────────────────────────────────────────────────

describe("listFields", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.customField.findMany.mockResolvedValue([mockTextField, mockSelectField]);
  });

  it("returns all fields for org", async () => {
    const result = await listFields(db, ORG_ID, {});

    expect(result).toHaveLength(2);
    expect(db.customField.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID },
      orderBy: { name: "asc" },
    });
  });

  it("filters by context when provided", async () => {
    await listFields(db, ORG_ID, { context: "asset" });

    expect(db.customField.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        context: { path: ["type"], equals: "asset" },
      },
      orderBy: { name: "asc" },
    });
  });
});

// ── getField ─────────────────────────────────────────────────────────────────

describe("getField", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns field when found", async () => {
    db.customField.findFirst.mockResolvedValue(mockTextField);

    const result = await getField(db, ORG_ID, "field-1");
    expect(result).toEqual(mockTextField);
  });

  it("throws NotFoundError when not found", async () => {
    db.customField.findFirst.mockResolvedValue(null);

    await expect(getField(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });
});

// ── deleteField ──────────────────────────────────────────────────────────────

describe("deleteField", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.customField.findFirst.mockResolvedValue(mockTextField);
    db.customField.delete.mockResolvedValue(mockTextField);
  });

  it("deletes the field", async () => {
    await deleteField(db, ORG_ID, "field-1");

    expect(db.customField.delete).toHaveBeenCalledWith({
      where: { id: "field-1" },
    });
  });

  it("throws NotFoundError if field does not exist", async () => {
    db.customField.findFirst.mockResolvedValue(null);

    await expect(deleteField(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── setFieldValue ────────────────────────────────────────────────────────────

describe("setFieldValue", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.customField.findFirst.mockResolvedValue(mockTextField);
    db.customFieldValue.upsert.mockResolvedValue({
      id: "val-1",
      fieldId: "field-1",
      entityId: "issue-1",
      entityType: "issue",
      value: "hello",
    });
  });

  it("upserts a field value for an entity", async () => {
    const result = await setFieldValue(db, ORG_ID, {
      entityId: "issue-1",
      entityType: "issue",
      fieldId: "field-1",
      value: "hello",
    });

    expect(result.value).toBe("hello");
    expect(db.customFieldValue.upsert).toHaveBeenCalledWith({
      where: {
        fieldId_entityId_entityType: {
          fieldId: "field-1",
          entityId: "issue-1",
          entityType: "issue",
        },
      },
      create: expect.objectContaining({
        organizationId: ORG_ID,
        fieldId: "field-1",
        entityId: "issue-1",
      }),
      update: expect.objectContaining({
        value: "hello",
      }),
    });
  });

  it("throws NotFoundError if field does not exist", async () => {
    db.customField.findFirst.mockResolvedValue(null);

    await expect(
      setFieldValue(db, ORG_ID, {
        entityId: "issue-1",
        entityType: "issue",
        fieldId: "nope",
        value: "hello",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError for type mismatch", async () => {
    db.customField.findFirst.mockResolvedValue({
      ...mockTextField,
      fieldType: "number",
    });

    await expect(
      setFieldValue(db, ORG_ID, {
        entityId: "issue-1",
        entityType: "issue",
        fieldId: "field-1",
        value: "not-a-number",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("validates user exists for user field type", async () => {
    db.customField.findFirst.mockResolvedValue({
      ...mockTextField,
      fieldType: "user",
    });
    db.user.findFirst.mockResolvedValue(null);

    await expect(
      setFieldValue(db, ORG_ID, {
        entityId: "issue-1",
        entityType: "issue",
        fieldId: "field-1",
        value: "nonexistent-user",
      }),
    ).rejects.toThrow(ValidationError);
  });
});

// ── getFieldValues ───────────────────────────────────────────────────────────

describe("getFieldValues", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.customFieldValue.findMany.mockResolvedValue([
      {
        fieldId: "field-1",
        value: "hello",
        field: { name: "Sprint", fieldType: "text" },
      },
    ]);
  });

  it("returns field values with field definitions", async () => {
    const result = await getFieldValues(db, ORG_ID, {
      entityId: "issue-1",
      entityType: "issue",
    });

    expect(result).toEqual([
      {
        fieldId: "field-1",
        fieldName: "Sprint",
        fieldType: "text",
        value: "hello",
      },
    ]);
  });

  it("scopes query to organization", async () => {
    await getFieldValues(db, ORG_ID, {
      entityId: "issue-1",
      entityType: "issue",
    });

    expect(db.customFieldValue.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        entityId: "issue-1",
        entityType: "issue",
      },
      include: { field: true },
    });
  });
});

// ── validateFieldValue ───────────────────────────────────────────────────────

describe("validateFieldValue", () => {
  it("rejects non-string for text type", () => {
    expect(() => validateFieldValue("text", 123, null)).toThrow(
      ValidationError,
    );
  });

  it("rejects non-number for number type", () => {
    expect(() => validateFieldValue("number", "abc", null)).toThrow(
      ValidationError,
    );
  });

  it("rejects invalid date string for date type", () => {
    expect(() => validateFieldValue("date", "not-a-date", null)).toThrow(
      ValidationError,
    );
  });

  it("accepts valid ISO date string", () => {
    expect(() =>
      validateFieldValue("date", "2026-01-15T00:00:00.000Z", null),
    ).not.toThrow();
  });

  it("rejects value not in select options", () => {
    expect(() =>
      validateFieldValue("select", "JP", ["US", "EU"]),
    ).toThrow(ValidationError);
  });

  it("accepts value in select options", () => {
    expect(() =>
      validateFieldValue("select", "US", ["US", "EU"]),
    ).not.toThrow();
  });

  it("rejects non-array for multiSelect", () => {
    expect(() =>
      validateFieldValue("multiSelect", "US", ["US", "EU"]),
    ).toThrow(ValidationError);
  });

  it("rejects non-boolean for checkbox", () => {
    expect(() => validateFieldValue("checkbox", "yes", null)).toThrow(
      ValidationError,
    );
  });

  it("rejects invalid URL", () => {
    expect(() => validateFieldValue("url", "not-a-url", null)).toThrow(
      ValidationError,
    );
  });

  it("accepts valid URL", () => {
    expect(() =>
      validateFieldValue("url", "https://example.com", null),
    ).not.toThrow();
  });

  it("throws for unknown field type", () => {
    expect(() => validateFieldValue("unknown", "value", null)).toThrow(
      ValidationError,
    );
  });
});
