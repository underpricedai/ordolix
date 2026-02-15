import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  logTime,
  getTimeLog,
  listTimeLogs,
  updateTimeLog,
  deleteTimeLog,
  getIssueTotalTime,
  getOrCreateTimesheet,
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
  listPendingTimesheets,
  myLoggedHours,
  teamLoggedHours,
} from "./time-tracking-service";
import { NotFoundError, PermissionError, ValidationError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    issue: { findFirst: vi.fn() },
    timeLog: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    timesheet: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockIssue = {
  id: "issue-1",
  organizationId: ORG_ID,
  summary: "Test Issue",
};

const mockTimeLog = {
  id: "tl-1",
  organizationId: ORG_ID,
  issueId: "issue-1",
  userId: USER_ID,
  date: new Date("2026-02-14"),
  duration: 3600,
  description: "Worked on feature",
  billable: true,
  approvalStatus: "pending",
};

// ── logTime ──────────────────────────────────────────────────────────────────

describe("logTime", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue(mockIssue);
    db.timeLog.create.mockResolvedValue(mockTimeLog);
  });

  it("creates a time log for a valid issue", async () => {
    await logTime(db, ORG_ID, USER_ID, {
      issueId: "issue-1",
      date: new Date("2026-02-14"),
      duration: 3600,
      description: "Worked on feature",
      billable: true,
    });

    expect(db.timeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        issueId: "issue-1",
        userId: USER_ID,
        duration: 3600,
      }),
    });
  });

  it("throws NotFoundError if issue not in org", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await expect(
      logTime(db, ORG_ID, USER_ID, {
        issueId: "nope",
        date: new Date(),
        duration: 3600,
        billable: true,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("scopes issue lookup to organization", async () => {
    await logTime(db, ORG_ID, USER_ID, {
      issueId: "issue-1",
      date: new Date(),
      duration: 1800,
      billable: true,
    });

    expect(db.issue.findFirst).toHaveBeenCalledWith({
      where: { id: "issue-1", organizationId: ORG_ID },
    });
  });
});

// ── getTimeLog ───────────────────────────────────────────────────────────────

describe("getTimeLog", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns time log when found", async () => {
    db.timeLog.findFirst.mockResolvedValue(mockTimeLog);

    const result = await getTimeLog(db, ORG_ID, "tl-1");
    expect(result).toEqual(mockTimeLog);
  });

  it("throws NotFoundError when not found", async () => {
    db.timeLog.findFirst.mockResolvedValue(null);

    await expect(getTimeLog(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("scopes query to organization", async () => {
    db.timeLog.findFirst.mockResolvedValue(null);
    await getTimeLog(db, "other-org", "tl-1").catch(() => {});

    expect(db.timeLog.findFirst).toHaveBeenCalledWith({
      where: { id: "tl-1", organizationId: "other-org" },
    });
  });
});

// ── listTimeLogs ─────────────────────────────────────────────────────────────

describe("listTimeLogs", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.timeLog.findMany.mockResolvedValue([mockTimeLog]);
  });

  it("returns paginated time logs", async () => {
    const result = await listTimeLogs(db, ORG_ID, { limit: 50 });

    expect(result.items).toHaveLength(1);
    expect(db.timeLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG_ID }),
        take: 50,
      }),
    );
  });

  it("filters by issueId", async () => {
    await listTimeLogs(db, ORG_ID, { issueId: "issue-1", limit: 50 });

    expect(db.timeLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ issueId: "issue-1" }),
      }),
    );
  });

  it("filters by date range", async () => {
    const startDate = new Date("2026-02-01");
    const endDate = new Date("2026-02-28");
    await listTimeLogs(db, ORG_ID, { startDate, endDate, limit: 50 });

    expect(db.timeLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: { gte: startDate, lte: endDate },
        }),
      }),
    );
  });

  it("returns nextCursor when results match limit", async () => {
    const logs = Array.from({ length: 50 }, (_, i) => ({
      ...mockTimeLog,
      id: `tl-${i}`,
    }));
    db.timeLog.findMany.mockResolvedValue(logs);

    const result = await listTimeLogs(db, ORG_ID, { limit: 50 });
    expect(result.nextCursor).toBe("tl-49");
  });
});

// ── updateTimeLog ────────────────────────────────────────────────────────────

describe("updateTimeLog", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.timeLog.findFirst.mockResolvedValue(mockTimeLog);
    db.timeLog.update.mockResolvedValue({ ...mockTimeLog, duration: 7200 });
  });

  it("updates time log fields", async () => {
    const result = await updateTimeLog(db, ORG_ID, USER_ID, "tl-1", {
      duration: 7200,
    });

    expect(result.duration).toBe(7200);
    expect(db.timeLog.update).toHaveBeenCalledWith({
      where: { id: "tl-1" },
      data: { duration: 7200 },
    });
  });

  it("throws NotFoundError when not found", async () => {
    db.timeLog.findFirst.mockResolvedValue(null);

    await expect(
      updateTimeLog(db, ORG_ID, USER_ID, "nope", { duration: 7200 }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws PermissionError when user does not own the time log", async () => {
    await expect(
      updateTimeLog(db, ORG_ID, "other-user", "tl-1", { duration: 7200 }),
    ).rejects.toThrow(PermissionError);
  });
});

// ── deleteTimeLog ────────────────────────────────────────────────────────────

describe("deleteTimeLog", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.timeLog.findFirst.mockResolvedValue(mockTimeLog);
    db.timeLog.delete.mockResolvedValue({});
  });

  it("deletes time log", async () => {
    await deleteTimeLog(db, ORG_ID, USER_ID, "tl-1");

    expect(db.timeLog.delete).toHaveBeenCalledWith({
      where: { id: "tl-1" },
    });
  });

  it("throws NotFoundError when not found", async () => {
    db.timeLog.findFirst.mockResolvedValue(null);

    await expect(
      deleteTimeLog(db, ORG_ID, USER_ID, "nope"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws PermissionError when user does not own the time log", async () => {
    await expect(
      deleteTimeLog(db, ORG_ID, "other-user", "tl-1"),
    ).rejects.toThrow(PermissionError);
  });
});

// ── getIssueTotalTime ────────────────────────────────────────────────────────

describe("getIssueTotalTime", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns sum of durations for an issue", async () => {
    db.timeLog.aggregate.mockResolvedValue({ _sum: { duration: 7200 } });

    const result = await getIssueTotalTime(db, ORG_ID, "issue-1");
    expect(result).toBe(7200);
  });

  it("returns 0 when no time logs exist", async () => {
    db.timeLog.aggregate.mockResolvedValue({ _sum: { duration: null } });

    const result = await getIssueTotalTime(db, ORG_ID, "issue-1");
    expect(result).toBe(0);
  });
});

// ── Timesheet Approval Workflow ────────────────────────────────────────────

const mockTimesheet = {
  id: "ts-1",
  organizationId: ORG_ID,
  userId: USER_ID,
  periodStart: new Date("2026-02-10"),
  periodEnd: new Date("2026-02-16"),
  status: "draft",
  submittedAt: null,
  approvedAt: null,
  approvedBy: null,
  timeLogs: [],
};

describe("getOrCreateTimesheet", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns existing timesheet", async () => {
    db.timesheet.findUnique.mockResolvedValue(mockTimesheet);

    const result = await getOrCreateTimesheet(db, ORG_ID, USER_ID, {
      periodStart: mockTimesheet.periodStart,
      periodEnd: mockTimesheet.periodEnd,
    });
    expect(result.id).toBe("ts-1");
    expect(db.timesheet.create).not.toHaveBeenCalled();
  });

  it("creates new timesheet when none exists", async () => {
    db.timesheet.findUnique.mockResolvedValue(null);
    db.timesheet.create.mockResolvedValue(mockTimesheet);

    const result = await getOrCreateTimesheet(db, ORG_ID, USER_ID, {
      periodStart: mockTimesheet.periodStart,
      periodEnd: mockTimesheet.periodEnd,
    });
    expect(result.id).toBe("ts-1");
    expect(db.timesheet.create).toHaveBeenCalled();
  });
});

describe("submitTimesheet", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("transitions draft to submitted", async () => {
    db.timesheet.findFirst.mockResolvedValue({ ...mockTimesheet, status: "draft" });
    db.timesheet.update.mockResolvedValue({ ...mockTimesheet, status: "submitted" });

    const result = await submitTimesheet(db, ORG_ID, USER_ID, "ts-1");
    expect(result.status).toBe("submitted");
  });

  it("throws ValidationError if not draft", async () => {
    db.timesheet.findFirst.mockResolvedValue({ ...mockTimesheet, status: "submitted" });

    await expect(submitTimesheet(db, ORG_ID, USER_ID, "ts-1")).rejects.toThrow(ValidationError);
  });

  it("throws PermissionError if not owner", async () => {
    db.timesheet.findFirst.mockResolvedValue({ ...mockTimesheet, userId: "other-user" });

    await expect(submitTimesheet(db, ORG_ID, USER_ID, "ts-1")).rejects.toThrow(PermissionError);
  });

  it("throws NotFoundError if missing", async () => {
    db.timesheet.findFirst.mockResolvedValue(null);

    await expect(submitTimesheet(db, ORG_ID, USER_ID, "bad")).rejects.toThrow(NotFoundError);
  });
});

describe("approveTimesheet", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("transitions submitted to approved", async () => {
    db.timesheet.findFirst.mockResolvedValue({ ...mockTimesheet, status: "submitted" });
    db.timesheet.update.mockResolvedValue({ ...mockTimesheet, status: "approved" });

    const result = await approveTimesheet(db, ORG_ID, "manager-1", "ts-1");
    expect(result.status).toBe("approved");
  });

  it("throws ValidationError if not submitted", async () => {
    db.timesheet.findFirst.mockResolvedValue({ ...mockTimesheet, status: "draft" });

    await expect(approveTimesheet(db, ORG_ID, "manager-1", "ts-1")).rejects.toThrow(ValidationError);
  });
});

describe("rejectTimesheet", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("transitions submitted back to draft", async () => {
    db.timesheet.findFirst.mockResolvedValue({ ...mockTimesheet, status: "submitted" });
    db.timesheet.update.mockResolvedValue({ ...mockTimesheet, status: "draft" });

    const result = await rejectTimesheet(db, ORG_ID, "manager-1", "ts-1");
    expect(result.status).toBe("draft");
  });

  it("throws ValidationError if not submitted", async () => {
    db.timesheet.findFirst.mockResolvedValue({ ...mockTimesheet, status: "draft" });

    await expect(rejectTimesheet(db, ORG_ID, "manager-1", "ts-1")).rejects.toThrow(ValidationError);
  });
});

describe("listPendingTimesheets", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns submitted timesheets", async () => {
    const items = [{ ...mockTimesheet, status: "submitted", user: { id: USER_ID, name: "User" } }];
    db.timesheet.findMany.mockResolvedValue(items);

    const result = await listPendingTimesheets(db, ORG_ID, { limit: 50 });
    expect(result.items).toHaveLength(1);
  });
});

// ── Time Reports ──────────────────────────────────────────────────────────

describe("myLoggedHours", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns time logs grouped by date", async () => {
    const timeLogs = [
      { ...mockTimeLog, date: new Date("2026-02-14"), duration: 3600, issue: { key: "T-1", summary: "S", projectId: "p1" } },
      { ...mockTimeLog, id: "tl-2", date: new Date("2026-02-14"), duration: 1800, issue: { key: "T-2", summary: "S2", projectId: "p1" } },
    ];
    db.timeLog.findMany.mockResolvedValue(timeLogs);

    const result = await myLoggedHours(db, ORG_ID, USER_ID, {
      startDate: new Date("2026-02-10"),
      endDate: new Date("2026-02-16"),
    });

    expect(result.totalSeconds).toBe(5400);
    expect(result.byDate["2026-02-14"]).toBe(5400);
  });
});

describe("teamLoggedHours", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns time logs grouped by user", async () => {
    const timeLogs = [
      { ...mockTimeLog, userId: "u1", duration: 3600, user: { id: "u1", name: "Alice" }, issue: { key: "T-1", summary: "S", projectId: "p1" } },
      { ...mockTimeLog, id: "tl-2", userId: "u2", duration: 1800, user: { id: "u2", name: "Bob" }, issue: { key: "T-2", summary: "S2", projectId: "p1" } },
    ];
    db.timeLog.findMany.mockResolvedValue(timeLogs);

    const result = await teamLoggedHours(db, ORG_ID, {
      startDate: new Date("2026-02-10"),
      endDate: new Date("2026-02-16"),
    });

    expect(result.totalSeconds).toBe(5400);
    expect(result.byUser["u1"]?.totalSeconds).toBe(3600);
    expect(result.byUser["u2"]?.totalSeconds).toBe(1800);
  });
});
