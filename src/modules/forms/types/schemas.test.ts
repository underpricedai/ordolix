import { describe, expect, it } from "vitest";
import {
  formFieldSchema,
  createFormTemplateInput,
  updateFormTemplateInput,
  submitFormInput,
  updateSubmissionStatusInput,
  listSubmissionsInput,
  listFormTemplatesInput,
} from "./schemas";

// ── formFieldSchema ─────────────────────────────────────────────────────────

describe("formFieldSchema", () => {
  it("accepts a valid text field", () => {
    const result = formFieldSchema.safeParse({
      id: "field-1",
      label: "Name",
      type: "text",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a select field with options", () => {
    const result = formFieldSchema.safeParse({
      id: "field-2",
      label: "Priority",
      type: "select",
      required: true,
      options: ["Low", "Medium", "High"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.required).toBe(true);
      expect(result.data.options).toEqual(["Low", "Medium", "High"]);
    }
  });

  it("defaults required to false", () => {
    const result = formFieldSchema.safeParse({
      id: "field-3",
      label: "Notes",
      type: "textarea",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.required).toBe(false);
    }
  });

  it("rejects invalid type", () => {
    const result = formFieldSchema.safeParse({
      id: "field-4",
      label: "Bad",
      type: "color",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing label", () => {
    const result = formFieldSchema.safeParse({
      id: "field-5",
      type: "text",
    });
    expect(result.success).toBe(false);
  });
});

// ── createFormTemplateInput ─────────────────────────────────────────────────

describe("createFormTemplateInput", () => {
  const validField = { id: "f1", label: "Name", type: "text" as const };

  it("accepts valid input with defaults", () => {
    const result = createFormTemplateInput.safeParse({
      name: "Bug Report",
      schema: [validField],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });

  it("rejects empty name", () => {
    const result = createFormTemplateInput.safeParse({
      name: "",
      schema: [validField],
    });
    expect(result.success).toBe(false);
  });

  it("rejects name over 255 characters", () => {
    const result = createFormTemplateInput.safeParse({
      name: "x".repeat(256),
      schema: [validField],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty schema array", () => {
    const result = createFormTemplateInput.safeParse({
      name: "Empty",
      schema: [],
    });
    expect(result.success).toBe(false);
  });
});

// ── updateFormTemplateInput ─────────────────────────────────────────────────

describe("updateFormTemplateInput", () => {
  it("accepts partial update with only name", () => {
    const result = updateFormTemplateInput.safeParse({
      id: "tpl-1",
      name: "Updated Name",
    });
    expect(result.success).toBe(true);
  });
});

// ── submitFormInput ─────────────────────────────────────────────────────────

describe("submitFormInput", () => {
  it("accepts valid submission", () => {
    const result = submitFormInput.safeParse({
      formTemplateId: "tpl-1",
      data: { name: "John", age: 30 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing formTemplateId", () => {
    const result = submitFormInput.safeParse({
      data: { name: "John" },
    });
    expect(result.success).toBe(false);
  });
});

// ── updateSubmissionStatusInput ─────────────────────────────────────────────

describe("updateSubmissionStatusInput", () => {
  it("accepts approved status", () => {
    const result = updateSubmissionStatusInput.safeParse({
      id: "sub-1",
      status: "approved",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = updateSubmissionStatusInput.safeParse({
      id: "sub-1",
      status: "submitted",
    });
    expect(result.success).toBe(false);
  });
});

// ── listSubmissionsInput ────────────────────────────────────────────────────

describe("listSubmissionsInput", () => {
  it("defaults limit to 50", () => {
    const result = listSubmissionsInput.safeParse({
      formTemplateId: "tpl-1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });
});

// ── listFormTemplatesInput ──────────────────────────────────────────────────

describe("listFormTemplatesInput", () => {
  it("accepts empty object", () => {
    const result = listFormTemplatesInput.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts isActive filter", () => {
    const result = listFormTemplatesInput.safeParse({ isActive: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });
});
