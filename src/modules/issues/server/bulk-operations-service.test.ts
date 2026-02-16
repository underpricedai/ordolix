import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  bulkUpdateIssues,
  bulkDeleteIssues,
  bulkMoveToSprint,
  cloneIssue,
} from "./bulk-operations-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockTx() {
  return {
    issue: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    project: {
      update: vi.fn(),
    },
    issueHistory: { createMany: vi.fn() },
    auditLog: { create: vi.fn(), createMany: vi.fn() },
  };
}

function createMockDb(overrides: Record<string, unknown> = {}) {
  const mockTx = createMockTx();
  return {
    issue: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    issueType: { findFirst: vi.fn() },
    priority: { findFirst: vi.fn() },
    status: { findFirst: vi.fn() },
    sprint: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
    auditLog: { create: vi.fn(), createMany: vi.fn() },
    issueHistory: { createMany: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    _tx: mockTx,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

// ── bulkUpdateIssues ─────────────────────────────────────────────────────────

describe("bulkUpdateIssues", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("updates multiple issues with status change", async () => {
    const issues = [
      { id: "i1", organizationId: ORG_ID, statusId: "s1", priorityId: "p1", assigneeId: null, sprintId: null, labels: [], deletedAt: null },
      { id: "i2", organizationId: ORG_ID, statusId: "s1", priorityId: "p1", assigneeId: null, sprintId: null, labels: [], deletedAt: null },
    ];
    db.issue.findMany.mockResolvedValue(issues);
    db._tx.issue.updateMany.mockResolvedValue({ count: 2 });
    db._tx.issueHistory.createMany.mockResolvedValue({});
    db._tx.auditLog.createMany.mockResolvedValue({});

    const result = await bulkUpdateIssues(db, ORG_ID, USER_ID, ["i1", "i2"], {
      statusId: "s2",
    });

    expect(result.updated).toBe(2);
    expect(result.failed).toEqual([]);
  });

  it("updates priority for multiple issues", async () => {
    const issues = [
      { id: "i1", organizationId: ORG_ID, statusId: "s1", priorityId: "p1", assigneeId: null, sprintId: null, labels: [], deletedAt: null },
    ];
    db.issue.findMany.mockResolvedValue(issues);
    db._tx.issue.updateMany.mockResolvedValue({ count: 1 });
    db._tx.issueHistory.createMany.mockResolvedValue({});
    db._tx.auditLog.createMany.mockResolvedValue({});

    const result = await bulkUpdateIssues(db, ORG_ID, USER_ID, ["i1"], {
      priorityId: "p2",
    });

    expect(result.updated).toBe(1);
  });

  it("updates assignee for multiple issues", async () => {
    const issues = [
      { id: "i1", organizationId: ORG_ID, statusId: "s1", priorityId: "p1", assigneeId: null, sprintId: null, labels: [], deletedAt: null },
    ];
    db.issue.findMany.mockResolvedValue(issues);
    db._tx.issue.updateMany.mockResolvedValue({ count: 1 });
    db._tx.issueHistory.createMany.mockResolvedValue({});
    db._tx.auditLog.createMany.mockResolvedValue({});

    const result = await bulkUpdateIssues(db, ORG_ID, USER_ID, ["i1"], {
      assigneeId: "user-2",
    });

    expect(result.updated).toBe(1);
  });

  it("reports failed IDs for issues not found in org", async () => {
    db.issue.findMany.mockResolvedValue([
      { id: "i1", organizationId: ORG_ID, statusId: "s1", priorityId: "p1", assigneeId: null, sprintId: null, labels: [], deletedAt: null },
    ]);
    db._tx.issue.updateMany.mockResolvedValue({ count: 1 });
    db._tx.issueHistory.createMany.mockResolvedValue({});
    db._tx.auditLog.createMany.mockResolvedValue({});

    const result = await bulkUpdateIssues(db, ORG_ID, USER_ID, ["i1", "i-missing"], {
      statusId: "s2",
    });

    expect(result.updated).toBe(1);
    expect(result.failed).toEqual(["i-missing"]);
  });

  it("returns 0 updated when no issues found", async () => {
    db.issue.findMany.mockResolvedValue([]);

    const result = await bulkUpdateIssues(db, ORG_ID, USER_ID, ["i1"], {
      statusId: "s2",
    });

    expect(result.updated).toBe(0);
    expect(result.failed).toEqual(["i1"]);
  });

  it("enforces organizationId isolation", async () => {
    db.issue.findMany.mockResolvedValue([]);

    await bulkUpdateIssues(db, "other-org", USER_ID, ["i1"], { statusId: "s2" });

    expect(db.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "other-org" }),
      }),
    );
  });
});

// ── bulkDeleteIssues ─────────────────────────────────────────────────────────

describe("bulkDeleteIssues", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("soft-deletes multiple issues", async () => {
    db.issue.updateMany.mockResolvedValue({ count: 3 });

    const result = await bulkDeleteIssues(db, ORG_ID, ["i1", "i2", "i3"]);

    expect(result.deleted).toBe(3);
    expect(db.issue.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["i1", "i2", "i3"] },
        organizationId: ORG_ID,
        deletedAt: null,
      },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("returns 0 when no issues match", async () => {
    db.issue.updateMany.mockResolvedValue({ count: 0 });

    const result = await bulkDeleteIssues(db, ORG_ID, ["nonexistent"]);

    expect(result.deleted).toBe(0);
  });

  it("scopes delete to organization", async () => {
    db.issue.updateMany.mockResolvedValue({ count: 1 });

    await bulkDeleteIssues(db, "other-org", ["i1"]);

    expect(db.issue.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "other-org" }),
      }),
    );
  });
});

// ── bulkMoveToSprint ─────────────────────────────────────────────────────────

describe("bulkMoveToSprint", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("moves issues to a sprint", async () => {
    db.issue.updateMany.mockResolvedValue({ count: 2 });

    const result = await bulkMoveToSprint(db, ORG_ID, ["i1", "i2"], "sprint-1");

    expect(result.moved).toBe(2);
    expect(db.issue.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["i1", "i2"] },
        organizationId: ORG_ID,
        deletedAt: null,
      },
      data: { sprintId: "sprint-1" },
    });
  });

  it("removes issues from sprint when sprintId is null", async () => {
    db.issue.updateMany.mockResolvedValue({ count: 1 });

    const result = await bulkMoveToSprint(db, ORG_ID, ["i1"], null);

    expect(result.moved).toBe(1);
    expect(db.issue.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["i1"] },
        organizationId: ORG_ID,
        deletedAt: null,
      },
      data: { sprintId: null },
    });
  });
});

// ── cloneIssue ──────────────────────────────────────────────────────────────

describe("cloneIssue", () => {
  let db: ReturnType<typeof createMockDb>;

  const mockIssue = {
    id: "issue-1",
    organizationId: ORG_ID,
    projectId: "proj-1",
    key: "TEST-1",
    summary: "Original issue",
    description: "Description text",
    issueTypeId: "type-1",
    statusId: "status-1",
    priorityId: "pri-1",
    reporterId: "user-orig",
    assigneeId: "user-2",
    parentId: null,
    sprintId: "sprint-1",
    labels: ["bug"],
    storyPoints: 5,
    dueDate: null,
    startDate: null,
    customFieldValues: { field1: "value1" },
    deletedAt: null,
  };

  const mockProject = {
    id: "proj-1",
    organizationId: ORG_ID,
    key: "TEST",
    issueCounter: 10,
  };

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue(mockIssue);
    db.project.findFirst.mockResolvedValue(mockProject);
    db._tx.project.update.mockResolvedValue({ ...mockProject, issueCounter: 11 });
    db._tx.issue.create.mockResolvedValue({
      ...mockIssue,
      id: "issue-clone",
      key: "TEST-11",
      summary: "CLONE - Original issue",
    });
    db._tx.auditLog.create.mockResolvedValue({});
  });

  it("creates a clone with prefix in summary", async () => {
    const result = await cloneIssue(db, ORG_ID, USER_ID, "issue-1", {
      includeSummaryPrefix: true,
      includeSubtasks: false,
    });

    expect(result.key).toBe("TEST-11");
    expect(result.summary).toBe("CLONE - Original issue");
  });

  it("creates a clone without prefix when option is false", async () => {
    db._tx.issue.create.mockResolvedValue({
      ...mockIssue,
      id: "issue-clone",
      key: "TEST-11",
      summary: "Original issue",
    });

    const result = await cloneIssue(db, ORG_ID, USER_ID, "issue-1", {
      includeSummaryPrefix: false,
      includeSubtasks: false,
    });

    expect(result.summary).toBe("Original issue");
  });

  it("sets reporter to current user on clone", async () => {
    await cloneIssue(db, ORG_ID, USER_ID, "issue-1", {});

    expect(db._tx.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reporterId: USER_ID }),
      }),
    );
  });

  it("increments project counter for clone key", async () => {
    await cloneIssue(db, ORG_ID, USER_ID, "issue-1", {});

    expect(db._tx.project.update).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      data: { issueCounter: { increment: 1 } },
    });
  });

  it("creates audit log for clone", async () => {
    await cloneIssue(db, ORG_ID, USER_ID, "issue-1", {});

    expect(db._tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        userId: USER_ID,
        entityType: "Issue",
        action: "CREATED",
      }),
    });
  });

  it("throws NotFoundError if source issue not found", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await expect(
      cloneIssue(db, ORG_ID, USER_ID, "nonexistent", {}),
    ).rejects.toThrow(NotFoundError);
  });

  it("copies labels and custom field values", async () => {
    await cloneIssue(db, ORG_ID, USER_ID, "issue-1", {});

    expect(db._tx.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          labels: ["bug"],
          customFieldValues: { field1: "value1" },
        }),
      }),
    );
  });

  it("preserves assignee and sprint from original", async () => {
    await cloneIssue(db, ORG_ID, USER_ID, "issue-1", {});

    expect(db._tx.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assigneeId: "user-2",
          sprintId: "sprint-1",
        }),
      }),
    );
  });
});
