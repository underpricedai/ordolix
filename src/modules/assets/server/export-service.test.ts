/**
 * Export service tests.
 *
 * @description Tests for CSV export: CSV generation, template generation,
 * and row serialization.
 *
 * @module export-service.test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  toCsv,
  buildCsvRow,
  exportAssets,
  getExportTemplate,
} from "./export-service";
import { NotFoundError } from "@/server/lib/errors";

function createMockDb() {
  return {
    assetType: {
      findFirst: vi.fn(),
    },
    asset: {
      findMany: vi.fn(),
    },
    assetAttributeDefinition: {
      findMany: vi.fn(),
    },
  } as unknown as PrismaClient;
}

const ORG_ID = "org-1";
const ASSET_TYPE_ID = "at-1";

const sampleDefinitions = [
  { name: "serialNumber", label: "Serial Number", fieldType: "text" },
  { name: "purchasePrice", label: "Purchase Price", fieldType: "number" },
  { name: "isActive", label: "Active", fieldType: "boolean" },
];

// ── toCsv ────────────────────────────────────────────────────────────────────

describe("toCsv", () => {
  it("generates a CSV string from headers and rows", () => {
    const result = toCsv(
      ["Name", "Status"],
      [["Server-1", "ordered"], ["Server-2", "deployed"]],
    );
    expect(result).toBe("Name,Status\nServer-1,ordered\nServer-2,deployed");
  });

  it("escapes values containing commas", () => {
    const result = toCsv(["Name"], [["Server, Inc"]]);
    expect(result).toBe('Name\n"Server, Inc"');
  });

  it("escapes values containing quotes", () => {
    const result = toCsv(["Name"], [['My "Server"']]);
    expect(result).toBe('Name\n"My ""Server"""');
  });

  it("returns headers only when no rows", () => {
    const result = toCsv(["Name", "Status"], []);
    expect(result).toBe("Name,Status");
  });

  it("escapes values containing newlines", () => {
    const result = toCsv(["Notes"], [["Line 1\nLine 2"]]);
    expect(result).toBe('Notes\n"Line 1\nLine 2"');
  });
});

// ── buildCsvRow ──────────────────────────────────────────────────────────────

describe("buildCsvRow", () => {
  it("serializes an asset to a CSV row array", () => {
    const asset = {
      assetTag: "AST-00001",
      name: "Server-1",
      status: "deployed",
      attributes: {
        serialNumber: "SN-001",
        purchasePrice: 1500,
        isActive: true,
      },
    };

    const row = buildCsvRow(asset, sampleDefinitions);
    expect(row).toEqual(["AST-00001", "Server-1", "deployed", "SN-001", "1500", "true"]);
  });

  it("handles null and undefined attribute values", () => {
    const asset = {
      assetTag: "AST-00002",
      name: "Server-2",
      status: "ordered",
      attributes: {
        serialNumber: null,
        purchasePrice: undefined,
      },
    };

    const row = buildCsvRow(
      asset as unknown as { name: string; status: string; assetTag: string; attributes: Record<string, unknown> },
      sampleDefinitions,
    );
    expect(row).toEqual(["AST-00002", "Server-2", "ordered", "", "", ""]);
  });

  it("handles boolean false correctly", () => {
    const asset = {
      assetTag: "AST-00003",
      name: "Server-3",
      status: "ordered",
      attributes: { serialNumber: "SN", purchasePrice: 0, isActive: false },
    };

    const row = buildCsvRow(asset, sampleDefinitions);
    expect(row[5]).toBe("false");
  });

  it("handles empty attributes object", () => {
    const asset = {
      assetTag: "AST-00004",
      name: "Empty",
      status: "ordered",
      attributes: {},
    };

    const row = buildCsvRow(asset, sampleDefinitions);
    expect(row).toEqual(["AST-00004", "Empty", "ordered", "", "", ""]);
  });
});

// ── exportAssets ──────────────────────────────────────────────────────────────

describe("exportAssets", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("exports assets as CSV content", async () => {
    const mockType = { id: ASSET_TYPE_ID, name: "Server" };
    (db.assetType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockType);
    (db.assetAttributeDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(sampleDefinitions);
    (db.asset.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        name: "Server-1",
        status: "deployed",
        assetTag: "AST-00001",
        attributes: { serialNumber: "SN-001", purchasePrice: 1500, isActive: true },
      },
    ]);

    const result = await exportAssets(db as unknown as PrismaClient, ORG_ID, {
      assetTypeId: ASSET_TYPE_ID,
    });

    expect(result.csvContent).toContain("Asset Tag,Name,Status,Serial Number,Purchase Price,Active");
    expect(result.csvContent).toContain("AST-00001,Server-1,deployed,SN-001,1500,true");
    expect(result.fileName).toBe("server-export.csv");
    expect(result.rowCount).toBe(1);
  });

  it("throws NotFoundError for invalid asset type", async () => {
    (db.assetType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      exportAssets(db as unknown as PrismaClient, ORG_ID, {
        assetTypeId: "nonexistent",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("returns empty CSV for no matching assets", async () => {
    (db.assetType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ASSET_TYPE_ID, name: "Server" });
    (db.assetAttributeDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(sampleDefinitions);
    (db.asset.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await exportAssets(db as unknown as PrismaClient, ORG_ID, {
      assetTypeId: ASSET_TYPE_ID,
    });

    expect(result.rowCount).toBe(0);
    expect(result.csvContent).toBe("Asset Tag,Name,Status,Serial Number,Purchase Price,Active");
  });

  it("applies status filter", async () => {
    (db.assetType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ASSET_TYPE_ID, name: "Server" });
    (db.assetAttributeDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.asset.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await exportAssets(db as unknown as PrismaClient, ORG_ID, {
      assetTypeId: ASSET_TYPE_ID,
      status: "deployed",
    });

    expect(db.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "deployed" }),
      }),
    );
  });

  it("applies search filter", async () => {
    (db.assetType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ASSET_TYPE_ID, name: "Server" });
    (db.assetAttributeDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.asset.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await exportAssets(db as unknown as PrismaClient, ORG_ID, {
      assetTypeId: ASSET_TYPE_ID,
      search: "test",
    });

    expect(db.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: "test", mode: "insensitive" },
        }),
      }),
    );
  });
});

// ── getExportTemplate ────────────────────────────────────────────────────────

describe("getExportTemplate", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("generates an empty CSV template with headers", async () => {
    (db.assetType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ASSET_TYPE_ID, name: "Laptop" });
    (db.assetAttributeDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(sampleDefinitions);

    const result = await getExportTemplate(db as unknown as PrismaClient, ORG_ID, ASSET_TYPE_ID);

    expect(result.headers).toEqual(["Name", "Status", "Serial Number", "Purchase Price", "Active"]);
    expect(result.csvContent).toBe("Name,Status,Serial Number,Purchase Price,Active");
    expect(result.fileName).toBe("laptop-template.csv");
  });

  it("throws NotFoundError for invalid asset type", async () => {
    (db.assetType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      getExportTemplate(db as unknown as PrismaClient, ORG_ID, "nonexistent"),
    ).rejects.toThrow(NotFoundError);
  });

  it("generates template with only built-in columns when no definitions", async () => {
    (db.assetType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ASSET_TYPE_ID, name: "Other" });
    (db.assetAttributeDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getExportTemplate(db as unknown as PrismaClient, ORG_ID, ASSET_TYPE_ID);

    expect(result.headers).toEqual(["Name", "Status"]);
    expect(result.csvContent).toBe("Name,Status");
  });
});
