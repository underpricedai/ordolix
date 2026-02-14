import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createReport,
  getReport,
  listReports,
  updateReport,
  deleteReport,
  runReport,
} from "./report-service";
import { NotFoundError, PermissionError } from "@/server/lib/errors";

function createMockDb() {
  return {
    savedReport: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockReport = {
  id: "report-1",
  organizationId: ORG_ID,
  createdBy: USER_ID,
  name: "Sprint Velocity",
  reportType: "velocity",
  query: { project: "ORD" },
  description: null,
  visualization: null,
  isShared: false,
  schedule: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

// ── createReport ────────────────────────────────────────────────────────────

describe("createReport", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.savedReport.create.mockResolvedValue(mockReport);
  });

  it("creates a report with correct data", async () => {
    const result = await createReport(db, ORG_ID, USER_ID, {
      name: "Sprint Velocity",
      reportType: "velocity",
      query: { project: "ORD" },
      isShared: false,
    });

    expect(result.id).toBe("report-1");
    expect(db.savedReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        createdBy: USER_ID,
        name: "Sprint Velocity",
        reportType: "velocity",
      }),
    });
  });

  it("creates a shared report with visualization", async () => {
    const sharedReport = { ...mockReport, isShared: true };
    db.savedReport.create.mockResolvedValue(sharedReport);

    const result = await createReport(db, ORG_ID, USER_ID, {
      name: "Sprint Velocity",
      reportType: "velocity",
      query: { project: "ORD" },
      isShared: true,
      visualization: { type: "bar_chart", config: {} },
    });

    expect(result.isShared).toBe(true);
    expect(db.savedReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isShared: true,
        visualization: { type: "bar_chart", config: {} },
      }),
    });
  });
});

// ── getReport ───────────────────────────────────────────────────────────────

describe("getReport", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.savedReport.findFirst.mockResolvedValue(mockReport);
  });

  it("returns a report by id", async () => {
    const result = await getReport(db, ORG_ID, "report-1");

    expect(result.id).toBe("report-1");
    expect(db.savedReport.findFirst).toHaveBeenCalledWith({
      where: { id: "report-1", organizationId: ORG_ID },
    });
  });

  it("throws NotFoundError if report not found", async () => {
    db.savedReport.findFirst.mockResolvedValue(null);

    await expect(getReport(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });
});

// ── listReports ─────────────────────────────────────────────────────────────

describe("listReports", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.savedReport.findMany.mockResolvedValue([mockReport]);
  });

  it("returns reports for user (owned or shared)", async () => {
    const result = await listReports(db, ORG_ID, USER_ID, {});

    expect(result).toHaveLength(1);
    expect(db.savedReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: ORG_ID,
          OR: [{ createdBy: USER_ID }, { isShared: true }],
        }),
      }),
    );
  });

  it("filters by reportType", async () => {
    await listReports(db, ORG_ID, USER_ID, { reportType: "velocity" });

    expect(db.savedReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ reportType: "velocity" }),
      }),
    );
  });

  it("filters by isShared", async () => {
    await listReports(db, ORG_ID, USER_ID, { isShared: true });

    expect(db.savedReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isShared: true }),
      }),
    );
  });
});

// ── updateReport ────────────────────────────────────────────────────────────

describe("updateReport", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.savedReport.findFirst.mockResolvedValue(mockReport);
    db.savedReport.update.mockResolvedValue({
      ...mockReport,
      name: "Updated Name",
    });
  });

  it("updates a report owned by user", async () => {
    const result = await updateReport(db, ORG_ID, USER_ID, "report-1", {
      name: "Updated Name",
    });

    expect(result.name).toBe("Updated Name");
    expect(db.savedReport.update).toHaveBeenCalledWith({
      where: { id: "report-1" },
      data: expect.objectContaining({ name: "Updated Name" }),
    });
  });

  it("allows update of shared report by non-owner", async () => {
    db.savedReport.findFirst.mockResolvedValue({
      ...mockReport,
      isShared: true,
    });

    await updateReport(db, ORG_ID, "other-user", "report-1", {
      name: "Updated",
    });

    expect(db.savedReport.update).toHaveBeenCalled();
  });

  it("throws NotFoundError if report not found", async () => {
    db.savedReport.findFirst.mockResolvedValue(null);

    await expect(
      updateReport(db, ORG_ID, USER_ID, "nope", { name: "Updated" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws PermissionError if non-owner on private report", async () => {
    await expect(
      updateReport(db, ORG_ID, "other-user", "report-1", {
        name: "Updated",
      }),
    ).rejects.toThrow(PermissionError);
  });
});

// ── deleteReport ────────────────────────────────────────────────────────────

describe("deleteReport", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.savedReport.findFirst.mockResolvedValue(mockReport);
    db.savedReport.delete.mockResolvedValue(mockReport);
  });

  it("deletes a report owned by user", async () => {
    await deleteReport(db, ORG_ID, USER_ID, "report-1");

    expect(db.savedReport.delete).toHaveBeenCalledWith({
      where: { id: "report-1" },
    });
  });

  it("throws NotFoundError if report not found", async () => {
    db.savedReport.findFirst.mockResolvedValue(null);

    await expect(
      deleteReport(db, ORG_ID, USER_ID, "nope"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws PermissionError if non-owner tries to delete", async () => {
    await expect(
      deleteReport(db, ORG_ID, "other-user", "report-1"),
    ).rejects.toThrow(PermissionError);
  });
});

// ── runReport ───────────────────────────────────────────────────────────────

describe("runReport", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.savedReport.findFirst.mockResolvedValue(mockReport);
  });

  it("returns stub report result", async () => {
    const result = await runReport(db, ORG_ID, "report-1");

    expect(result.reportId).toBe("report-1");
    expect(result.data).toEqual([]);
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it("throws NotFoundError if report not found", async () => {
    db.savedReport.findFirst.mockResolvedValue(null);

    await expect(runReport(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });
});
