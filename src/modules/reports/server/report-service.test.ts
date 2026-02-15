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
    issue: {
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    timeLog: {
      groupBy: vi.fn().mockResolvedValue([]),
    },
    sprint: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    sLAInstance: {
      groupBy: vi.fn().mockResolvedValue([]),
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

  it("throws NotFoundError if report not found", async () => {
    db.savedReport.findFirst.mockResolvedValue(null);

    await expect(runReport(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });

  it("runs issue_summary report with groupBy results", async () => {
    db.savedReport.findFirst.mockResolvedValue({
      ...mockReport,
      reportType: "issue_summary",
      query: { projectId: "proj-1" },
    });
    db.issue.count.mockResolvedValue(5);
    db.issue.groupBy.mockResolvedValueOnce([
      { statusId: "s1", _count: 3 },
    ]);
    db.issue.groupBy.mockResolvedValueOnce([
      { priorityId: "p1", _count: 2 },
    ]);

    const result = await runReport(db, ORG_ID, "report-1");

    expect(result.reportId).toBe("report-1");
    expect(result.data).toEqual([
      { metric: "total_issues", value: 5 },
      { metric: "by_status", statusId: "s1", count: 3 },
      { metric: "by_priority", priorityId: "p1", count: 2 },
    ]);
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it("runs time_tracking report with groupBy results", async () => {
    db.savedReport.findFirst.mockResolvedValue({
      ...mockReport,
      reportType: "time_tracking",
    });
    db.timeLog.groupBy.mockResolvedValue([
      { userId: "u1", _sum: { duration: 3600 }, _count: 2 },
    ]);

    const result = await runReport(db, ORG_ID, "report-1");

    expect(result.data).toEqual([
      { metric: "time_by_user", userId: "u1", totalSeconds: 3600, entryCount: 2 },
    ]);
  });

  it("runs velocity report from completed sprints", async () => {
    db.savedReport.findFirst.mockResolvedValue({
      ...mockReport,
      reportType: "velocity",
    });
    db.sprint.findMany.mockResolvedValue([
      {
        name: "Sprint 1",
        issues: [
          { storyPoints: 5, status: { category: "DONE" } },
          { storyPoints: 3, status: { category: "IN_PROGRESS" } },
        ],
      },
    ]);

    const result = await runReport(db, ORG_ID, "report-1");

    expect(result.data).toEqual([
      {
        metric: "velocity",
        sprintName: "Sprint 1",
        completedPoints: 5,
        completedCount: 1,
        totalCount: 2,
      },
    ]);
  });

  it("runs sla_compliance report", async () => {
    db.savedReport.findFirst.mockResolvedValue({
      ...mockReport,
      reportType: "sla_compliance",
    });
    db.sLAInstance.groupBy.mockResolvedValue([
      { status: "met", _count: 10 },
      { status: "breached", _count: 2 },
    ]);

    const result = await runReport(db, ORG_ID, "report-1");

    expect(result.data).toEqual([
      { metric: "sla_by_status", status: "met", count: 10 },
      { metric: "sla_by_status", status: "breached", count: 2 },
    ]);
  });

  it("returns empty data for custom report type", async () => {
    db.savedReport.findFirst.mockResolvedValue({
      ...mockReport,
      reportType: "custom",
    });

    const result = await runReport(db, ORG_ID, "report-1");

    expect(result.data).toEqual([]);
  });
});
