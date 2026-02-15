import { describe, expect, it } from "vitest";
import {
  createCustomFieldInput,
  updateCustomFieldInput,
  listCustomFieldsInput,
  setFieldValueInput,
  getFieldValuesInput,
  fieldType,
} from "./schemas";

describe("fieldType enum", () => {
  it("accepts all valid field types", () => {
    const types = [
      "text",
      "number",
      "date",
      "select",
      "multiSelect",
      "checkbox",
      "url",
      "user",
      "label",
    ];
    for (const t of types) {
      expect(fieldType.safeParse(t).success).toBe(true);
    }
  });

  it("rejects invalid field type", () => {
    expect(fieldType.safeParse("invalid").success).toBe(false);
  });
});

describe("createCustomFieldInput", () => {
  it("accepts valid text field input", () => {
    const result = createCustomFieldInput.safeParse({
      name: "Sprint",
      fieldType: "text",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isRequired).toBe(false);
      expect(result.data.context).toBe("issue");
    }
  });

  it("requires options for select fieldType", () => {
    const result = createCustomFieldInput.safeParse({
      name: "Region",
      fieldType: "select",
    });
    expect(result.success).toBe(false);
  });

  it("accepts select field with options", () => {
    const result = createCustomFieldInput.safeParse({
      name: "Region",
      fieldType: "select",
      options: ["US", "EU", "APAC"],
    });
    expect(result.success).toBe(true);
  });

  it("requires options for multiSelect fieldType", () => {
    const result = createCustomFieldInput.safeParse({
      name: "Tags",
      fieldType: "multiSelect",
      options: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createCustomFieldInput.safeParse({
      name: "",
      fieldType: "text",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid context values", () => {
    for (const ctx of ["issue", "project", "asset"]) {
      const result = createCustomFieldInput.safeParse({
        name: "Test",
        fieldType: "text",
        context: ctx,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("updateCustomFieldInput", () => {
  it("requires id", () => {
    const result = updateCustomFieldInput.safeParse({
      name: "Updated",
    });
    expect(result.success).toBe(false);
  });

  it("accepts partial updates", () => {
    const result = updateCustomFieldInput.safeParse({
      id: "field-1",
      name: "Updated Name",
    });
    expect(result.success).toBe(true);
  });
});

describe("listCustomFieldsInput", () => {
  it("accepts empty input", () => {
    const result = listCustomFieldsInput.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid context filter", () => {
    const result = listCustomFieldsInput.safeParse({ context: "asset" });
    expect(result.success).toBe(true);
  });
});

describe("setFieldValueInput", () => {
  it("accepts valid input", () => {
    const result = setFieldValueInput.safeParse({
      entityId: "issue-1",
      entityType: "issue",
      fieldId: "field-1",
      value: "hello",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid entityType", () => {
    const result = setFieldValueInput.safeParse({
      entityId: "issue-1",
      entityType: "project",
      fieldId: "field-1",
      value: "hello",
    });
    expect(result.success).toBe(false);
  });
});

describe("getFieldValuesInput", () => {
  it("accepts valid input", () => {
    const result = getFieldValuesInput.safeParse({
      entityId: "issue-1",
      entityType: "issue",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing entityId", () => {
    const result = getFieldValuesInput.safeParse({
      entityType: "issue",
    });
    expect(result.success).toBe(false);
  });
});
