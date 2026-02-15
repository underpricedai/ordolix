/**
 * Import/Export Zod schema tests.
 *
 * @description Validates all import and export Zod schemas
 * for correct parsing, defaults, and error cases.
 *
 * @module import-schemas.test
 */

import { describe, expect, it } from "vitest";
import {
  startImportInput,
  validateImportPreviewInput,
  listImportJobsInput,
  exportAssetsInput,
  IMPORT_JOB_STATUSES,
} from "./schemas";

// ── IMPORT_JOB_STATUSES ──────────────────────────────────────────────────────

describe("IMPORT_JOB_STATUSES", () => {
  it("contains expected statuses", () => {
    expect(IMPORT_JOB_STATUSES).toEqual(["pending", "processing", "completed", "failed"]);
  });
});

// ── startImportInput ─────────────────────────────────────────────────────────

describe("startImportInput", () => {
  it("parses valid input", () => {
    const result = startImportInput.parse({
      assetTypeId: "at-1",
      fileName: "test.csv",
      csvContent: "Name\nFoo",
    });
    expect(result.assetTypeId).toBe("at-1");
    expect(result.fileName).toBe("test.csv");
    expect(result.csvContent).toBe("Name\nFoo");
    expect(result.columnMapping).toEqual({});
  });

  it("uses provided column mapping", () => {
    const result = startImportInput.parse({
      assetTypeId: "at-1",
      fileName: "test.csv",
      csvContent: "Name\nFoo",
      columnMapping: { Name: "__name" },
    });
    expect(result.columnMapping).toEqual({ Name: "__name" });
  });

  it("rejects empty assetTypeId", () => {
    expect(() =>
      startImportInput.parse({
        assetTypeId: "",
        fileName: "test.csv",
        csvContent: "Name\nFoo",
      }),
    ).toThrow();
  });

  it("rejects empty fileName", () => {
    expect(() =>
      startImportInput.parse({
        assetTypeId: "at-1",
        fileName: "",
        csvContent: "Name\nFoo",
      }),
    ).toThrow();
  });

  it("rejects empty csvContent", () => {
    expect(() =>
      startImportInput.parse({
        assetTypeId: "at-1",
        fileName: "test.csv",
        csvContent: "",
      }),
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => startImportInput.parse({})).toThrow();
  });
});

// ── validateImportPreviewInput ───────────────────────────────────────────────

describe("validateImportPreviewInput", () => {
  it("parses valid input with defaults", () => {
    const result = validateImportPreviewInput.parse({
      assetTypeId: "at-1",
      csvContent: "Name\nFoo",
    });
    expect(result.maxRows).toBe(10);
    expect(result.columnMapping).toEqual({});
  });

  it("accepts custom maxRows", () => {
    const result = validateImportPreviewInput.parse({
      assetTypeId: "at-1",
      csvContent: "Name\nFoo",
      maxRows: 50,
    });
    expect(result.maxRows).toBe(50);
  });

  it("rejects maxRows > 100", () => {
    expect(() =>
      validateImportPreviewInput.parse({
        assetTypeId: "at-1",
        csvContent: "Name\nFoo",
        maxRows: 101,
      }),
    ).toThrow();
  });

  it("rejects maxRows < 1", () => {
    expect(() =>
      validateImportPreviewInput.parse({
        assetTypeId: "at-1",
        csvContent: "Name\nFoo",
        maxRows: 0,
      }),
    ).toThrow();
  });

  it("rejects non-integer maxRows", () => {
    expect(() =>
      validateImportPreviewInput.parse({
        assetTypeId: "at-1",
        csvContent: "Name\nFoo",
        maxRows: 10.5,
      }),
    ).toThrow();
  });
});

// ── listImportJobsInput ──────────────────────────────────────────────────────

describe("listImportJobsInput", () => {
  it("parses with defaults", () => {
    const result = listImportJobsInput.parse({});
    expect(result.limit).toBe(50);
    expect(result.status).toBeUndefined();
    expect(result.cursor).toBeUndefined();
  });

  it("accepts valid status filter", () => {
    const result = listImportJobsInput.parse({ status: "completed" });
    expect(result.status).toBe("completed");
  });

  it("rejects invalid status", () => {
    expect(() => listImportJobsInput.parse({ status: "invalid" })).toThrow();
  });

  it("accepts cursor for pagination", () => {
    const result = listImportJobsInput.parse({ cursor: "abc123" });
    expect(result.cursor).toBe("abc123");
  });

  it("accepts custom limit", () => {
    const result = listImportJobsInput.parse({ limit: 25 });
    expect(result.limit).toBe(25);
  });

  it("rejects limit > 100", () => {
    expect(() => listImportJobsInput.parse({ limit: 101 })).toThrow();
  });

  it("rejects limit < 1", () => {
    expect(() => listImportJobsInput.parse({ limit: 0 })).toThrow();
  });
});

// ── exportAssetsInput ────────────────────────────────────────────────────────

describe("exportAssetsInput", () => {
  it("parses with required assetTypeId only", () => {
    const result = exportAssetsInput.parse({ assetTypeId: "at-1" });
    expect(result.assetTypeId).toBe("at-1");
    expect(result.status).toBeUndefined();
    expect(result.search).toBeUndefined();
  });

  it("accepts optional status filter", () => {
    const result = exportAssetsInput.parse({
      assetTypeId: "at-1",
      status: "deployed",
    });
    expect(result.status).toBe("deployed");
  });

  it("accepts optional search string", () => {
    const result = exportAssetsInput.parse({
      assetTypeId: "at-1",
      search: "server",
    });
    expect(result.search).toBe("server");
  });

  it("rejects invalid status", () => {
    expect(() =>
      exportAssetsInput.parse({
        assetTypeId: "at-1",
        status: "invalid",
      }),
    ).toThrow();
  });

  it("rejects empty assetTypeId", () => {
    expect(() => exportAssetsInput.parse({ assetTypeId: "" })).toThrow();
  });

  it("rejects missing assetTypeId", () => {
    expect(() => exportAssetsInput.parse({})).toThrow();
  });

  it("accepts all valid asset statuses", () => {
    const statuses = ["ordered", "received", "deployed", "in_use", "maintenance", "retired", "disposed"];
    for (const status of statuses) {
      const result = exportAssetsInput.parse({ assetTypeId: "at-1", status });
      expect(result.status).toBe(status);
    }
  });
});
