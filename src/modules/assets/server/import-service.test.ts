/**
 * Import service tests.
 *
 * @description Tests for CSV import: column auto-mapping, row validation,
 * import job lifecycle, and batch asset creation.
 *
 * @module import-service.test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  parseCsv,
  autoMapColumns,
  validateImportRow,
  startImport,
  getImportStatus,
  listImportJobs,
  cancelImport,
  validateImportPreview,
  processImport,
} from "./import-service";
import type { AttributeDef } from "./import-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

// Mock asset-attribute-service for processImport
vi.mock("./asset-attribute-service", () => ({
  generateAssetTag: vi.fn().mockResolvedValue("AST-00001"),
}));

const ORG_ID = "org-1";
const USER_ID = "user-1";
const ASSET_TYPE_ID = "at-1";

function createMockDb() {
  return {
    assetType: {
      findFirst: vi.fn(),
    },
    assetImportJob: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    asset: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    assetAttributeDefinition: {
      findMany: vi.fn(),
    },
  } as unknown as PrismaClient;
}

const sampleDefinitions: AttributeDef[] = [
  { name: "serialNumber", label: "Serial Number", fieldType: "text" },
  { name: "purchasePrice", label: "Purchase Price", fieldType: "number" },
  { name: "purchaseDate", label: "Purchase Date", fieldType: "date" },
  { name: "isActive", label: "Active", fieldType: "boolean" },
  { name: "location", label: "Location", fieldType: "select" },
];

// ── parseCsv ─────────────────────────────────────────────────────────────────

describe("parseCsv", () => {
  it("parses a simple CSV string", () => {
    const csv = 'Name,Status,Serial\nServer-1,ordered,SN001\nServer-2,deployed,SN002';
    const result = parseCsv(csv);
    expect(result.headers).toEqual(["Name", "Status", "Serial"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ Name: "Server-1", Status: "ordered", Serial: "SN001" });
  });

  it("strips quotes from values", () => {
    const csv = '"Name","Status"\n"Server-1","ordered"';
    const result = parseCsv(csv);
    expect(result.headers).toEqual(["Name", "Status"]);
    expect(result.rows[0]).toEqual({ Name: "Server-1", Status: "ordered" });
  });

  it("handles empty content", () => {
    const result = parseCsv("");
    expect(result.headers).toEqual([""]);
    expect(result.rows).toHaveLength(0);
  });

  it("handles header-only CSV", () => {
    const result = parseCsv("Name,Status");
    expect(result.headers).toEqual(["Name", "Status"]);
    expect(result.rows).toHaveLength(0);
  });
});

// ── autoMapColumns ───────────────────────────────────────────────────────────

describe("autoMapColumns", () => {
  it("maps 'Name' to __name", () => {
    const result = autoMapColumns(["Name"], sampleDefinitions);
    expect(result.Name).toBe("__name");
  });

  it("maps 'name' (lowercase) to __name", () => {
    const result = autoMapColumns(["name"], sampleDefinitions);
    expect(result.name).toBe("__name");
  });

  it("maps 'Status' to __status", () => {
    const result = autoMapColumns(["Status"], sampleDefinitions);
    expect(result.Status).toBe("__status");
  });

  it("maps exact match on definition name", () => {
    const result = autoMapColumns(["serialNumber"], sampleDefinitions);
    expect(result.serialNumber).toBe("serialNumber");
  });

  it("maps exact match on definition label (case-insensitive)", () => {
    const result = autoMapColumns(["serial number"], sampleDefinitions);
    expect(result["serial number"]).toBe("serialNumber");
  });

  it("maps fuzzy substring match", () => {
    const result = autoMapColumns(["Asset Purchase Price"], sampleDefinitions);
    expect(result["Asset Purchase Price"]).toBe("purchasePrice");
  });

  it("does not map unrecognized columns", () => {
    const result = autoMapColumns(["Unknown Column"], sampleDefinitions);
    expect(result["Unknown Column"]).toBeUndefined();
  });

  it("handles multiple columns", () => {
    const result = autoMapColumns(
      ["Name", "Status", "Serial Number", "Purchase Price"],
      sampleDefinitions,
    );
    expect(result).toEqual({
      Name: "__name",
      Status: "__status",
      "Serial Number": "serialNumber",
      "Purchase Price": "purchasePrice",
    });
  });
});

// ── validateImportRow ────────────────────────────────────────────────────────

describe("validateImportRow", () => {
  const mapping = {
    Name: "__name",
    Status: "__status",
    Serial: "serialNumber",
    Price: "purchasePrice",
    Date: "purchaseDate",
    Active: "isActive",
    Location: "location",
  };

  it("validates a fully valid row", () => {
    const row = {
      Name: "Server-1",
      Status: "deployed",
      Serial: "SN-001",
      Price: "1500",
      Date: "2024-01-15",
      Active: "true",
      Location: "DC-A",
    };
    const result = validateImportRow(row, sampleDefinitions, mapping);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.values.__name).toBe("Server-1");
    expect(result.values.__status).toBe("deployed");
    expect(result.values.purchasePrice).toBe(1500);
    expect(result.values.isActive).toBe(true);
  });

  it("returns error for missing required name", () => {
    const row = { Name: "", Status: "ordered", Serial: "", Price: "", Date: "", Active: "", Location: "" };
    const result = validateImportRow(row, sampleDefinitions, mapping);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({ field: "Name", message: "Name is required" });
  });

  it("returns error for invalid status", () => {
    const row = { Name: "Test", Status: "invalid_status", Serial: "", Price: "", Date: "", Active: "", Location: "" };
    const result = validateImportRow(row, sampleDefinitions, mapping);
    expect(result.valid).toBe(false);
    expect(result.errors[0]!.field).toBe("Status");
  });

  it("returns error for invalid number", () => {
    const row = { Name: "Test", Status: "", Serial: "", Price: "not-a-number", Date: "", Active: "", Location: "" };
    const result = validateImportRow(row, sampleDefinitions, mapping);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({ field: "Price", message: "Must be a valid number" });
  });

  it("returns error for invalid date", () => {
    const row = { Name: "Test", Status: "", Serial: "", Price: "", Date: "not-a-date", Active: "", Location: "" };
    const result = validateImportRow(row, sampleDefinitions, mapping);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({ field: "Date", message: "Must be a valid date" });
  });

  it("returns error for invalid boolean", () => {
    const row = { Name: "Test", Status: "", Serial: "", Price: "", Date: "", Active: "maybe", Location: "" };
    const result = validateImportRow(row, sampleDefinitions, mapping);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({ field: "Active", message: "Must be true/false, yes/no, or 1/0" });
  });

  it("accepts valid boolean variants", () => {
    for (const val of ["true", "false", "yes", "no", "1", "0"]) {
      const row = { Name: "Test", Status: "", Serial: "", Price: "", Date: "", Active: val, Location: "" };
      const result = validateImportRow(row, sampleDefinitions, mapping);
      expect(result.errors.filter(e => e.field === "Active")).toHaveLength(0);
    }
  });

  it("normalizes status with spaces to underscores", () => {
    const row = { Name: "Test", Status: "in use", Serial: "", Price: "", Date: "", Active: "", Location: "" };
    const result = validateImportRow(row, sampleDefinitions, mapping);
    expect(result.values.__status).toBe("in_use");
  });

  it("skips empty optional values without error", () => {
    const row = { Name: "Test", Status: "", Serial: "", Price: "", Date: "", Active: "", Location: "" };
    const result = validateImportRow(row, sampleDefinitions, mapping);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.values)).toEqual(["__name"]);
  });
});

// ── startImport ──────────────────────────────────────────────────────────────

describe("startImport", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("creates a job record in pending status", async () => {
    const mockType = { id: ASSET_TYPE_ID, organizationId: ORG_ID };
    (db.assetType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockType);
    (db.assetImportJob.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "job-1",
      status: "pending",
      totalRows: 2,
    });

    const result = await startImport(db as unknown as PrismaClient, ORG_ID, USER_ID, {
      assetTypeId: ASSET_TYPE_ID,
      fileName: "test.csv",
      csvContent: "Name,Status\nServer-1,ordered\nServer-2,deployed",
      columnMapping: {},
    });

    expect(result.status).toBe("pending");
    expect(db.assetImportJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: ORG_ID,
          userId: USER_ID,
          status: "pending",
          totalRows: 2,
        }),
      }),
    );
  });

  it("throws NotFoundError for invalid asset type", async () => {
    (db.assetType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      startImport(db as unknown as PrismaClient, ORG_ID, USER_ID, {
        assetTypeId: "nonexistent",
        fileName: "test.csv",
        csvContent: "Name\nFoo",
        columnMapping: {},
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── getImportStatus ──────────────────────────────────────────────────────────

describe("getImportStatus", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns the job record", async () => {
    const mockJob = { id: "job-1", status: "processing", organizationId: ORG_ID };
    (db.assetImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockJob);

    const result = await getImportStatus(db as unknown as PrismaClient, ORG_ID, "job-1");
    expect(result).toEqual(mockJob);
  });

  it("throws NotFoundError for missing job", async () => {
    (db.assetImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      getImportStatus(db as unknown as PrismaClient, ORG_ID, "missing"),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── listImportJobs ───────────────────────────────────────────────────────────

describe("listImportJobs", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns jobs for the organization", async () => {
    const mockJobs = [{ id: "job-1" }, { id: "job-2" }];
    (db.assetImportJob.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockJobs);

    const result = await listImportJobs(db as unknown as PrismaClient, ORG_ID, {
      limit: 50,
    });
    expect(result).toEqual(mockJobs);
  });

  it("filters by status", async () => {
    (db.assetImportJob.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await listImportJobs(db as unknown as PrismaClient, ORG_ID, {
      status: "completed",
      limit: 50,
    });

    expect(db.assetImportJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID, status: "completed" },
      }),
    );
  });
});

// ── cancelImport ─────────────────────────────────────────────────────────────

describe("cancelImport", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("sets status to failed with cancel message", async () => {
    const mockJob = { id: "job-1", status: "pending", organizationId: ORG_ID };
    (db.assetImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockJob);
    (db.assetImportJob.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockJob,
      status: "failed",
    });

    const result = await cancelImport(db as unknown as PrismaClient, ORG_ID, "job-1");
    expect(result.status).toBe("failed");
    expect(db.assetImportJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "failed",
        }),
      }),
    );
  });

  it("throws NotFoundError for missing job", async () => {
    (db.assetImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      cancelImport(db as unknown as PrismaClient, ORG_ID, "missing"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError for completed job", async () => {
    const mockJob = { id: "job-1", status: "completed", organizationId: ORG_ID };
    (db.assetImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockJob);

    await expect(
      cancelImport(db as unknown as PrismaClient, ORG_ID, "job-1"),
    ).rejects.toThrow(ValidationError);
  });
});

// ── validateImportPreview ────────────────────────────────────────────────────

describe("validateImportPreview", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns preview with validation results", async () => {
    (db.assetType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ASSET_TYPE_ID });
    (db.assetAttributeDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(sampleDefinitions);

    const csv = "Name,Serial Number\nServer-1,SN001\nServer-2,SN002";
    const result = await validateImportPreview(db as unknown as PrismaClient, ORG_ID, {
      assetTypeId: ASSET_TYPE_ID,
      csvContent: csv,
      columnMapping: {},
      maxRows: 10,
    });

    expect(result.headers).toEqual(["Name", "Serial Number"]);
    expect(result.totalRows).toBe(2);
    expect(result.previewRows).toHaveLength(2);
    expect(result.validCount).toBe(2);
    expect(result.mapping).toHaveProperty("Name", "__name");
    expect(result.mapping).toHaveProperty("Serial Number", "serialNumber");
  });

  it("uses provided mapping over auto-map", async () => {
    (db.assetType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ASSET_TYPE_ID });
    (db.assetAttributeDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(sampleDefinitions);

    const csv = "Col A\nServer-1";
    const result = await validateImportPreview(db as unknown as PrismaClient, ORG_ID, {
      assetTypeId: ASSET_TYPE_ID,
      csvContent: csv,
      columnMapping: { "Col A": "__name" },
      maxRows: 10,
    });

    expect(result.mapping).toEqual({ "Col A": "__name" });
  });

  it("throws NotFoundError for invalid asset type", async () => {
    (db.assetType.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      validateImportPreview(db as unknown as PrismaClient, ORG_ID, {
        assetTypeId: "nonexistent",
        csvContent: "Name\nFoo",
        columnMapping: {},
        maxRows: 10,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── processImport ────────────────────────────────────────────────────────────

describe("processImport", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("creates assets and updates progress counts", async () => {
    const mockJob = {
      id: "job-1",
      organizationId: ORG_ID,
      assetTypeId: ASSET_TYPE_ID,
      columnMapping: { Name: "__name", Status: "__status" },
      status: "pending",
    };
    (db.assetImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockJob);
    (db.assetImportJob.update as ReturnType<typeof vi.fn>).mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      ...mockJob,
      ...args.data,
    }));
    (db.assetAttributeDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.asset.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a-1" });

    const csv = "Name,Status\nServer-1,ordered\nServer-2,deployed";
    const result = await processImport(db as unknown as PrismaClient, ORG_ID, "job-1", csv);

    expect(result.status).toBe("completed");
    expect(result.successCount).toBe(2);
    expect(db.asset.create).toHaveBeenCalledTimes(2);
  });

  it("records errors for invalid rows", async () => {
    const mockJob = {
      id: "job-1",
      organizationId: ORG_ID,
      assetTypeId: ASSET_TYPE_ID,
      columnMapping: { Name: "__name", Price: "purchasePrice" },
      status: "pending",
    };
    (db.assetImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockJob);
    (db.assetImportJob.update as ReturnType<typeof vi.fn>).mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      ...mockJob,
      ...args.data,
    }));
    (db.assetAttributeDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: "purchasePrice", label: "Purchase Price", fieldType: "number" },
    ]);
    (db.asset.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a-1" });

    const csv = "Name,Price\nServer-1,not-a-number\nServer-2,1500";
    const result = await processImport(db as unknown as PrismaClient, ORG_ID, "job-1", csv);

    expect(result.status).toBe("completed");
    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(1);
  });

  it("marks job as failed when all rows fail", async () => {
    const mockJob = {
      id: "job-1",
      organizationId: ORG_ID,
      assetTypeId: ASSET_TYPE_ID,
      columnMapping: { Name: "__name" },
      status: "pending",
    };
    (db.assetImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockJob);
    (db.assetImportJob.update as ReturnType<typeof vi.fn>).mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      ...mockJob,
      ...args.data,
    }));
    (db.assetAttributeDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // Rows with empty mapped name trigger validation errors
    const csv = "Name\n,\n,";
    const result = await processImport(db as unknown as PrismaClient, ORG_ID, "job-1", csv);

    expect(result.status).toBe("failed");
    expect(result.successCount).toBe(0);
  });

  it("throws NotFoundError for missing job", async () => {
    (db.assetImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      processImport(db as unknown as PrismaClient, ORG_ID, "missing", "Name\nFoo"),
    ).rejects.toThrow(NotFoundError);
  });
});
