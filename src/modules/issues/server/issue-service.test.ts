import { describe, expect, it, vi, beforeEach } from "vitest";
import { createIssue, getIssueByKey, listIssues, updateIssue, deleteIssue } from "./issue-service";
import { NotFoundError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockTx() {
  return {
    project: { update: vi.fn() },
    issue: { create: vi.fn(), update: vi.fn() },
    issueHistory: { createMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
}

function createMockDb(overrides: Record<string, unknown> = {}) {
  const mockTx = createMockTx();
  return {
    project: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    issueType: { findFirst: vi.fn() },
    priority: { findFirst: vi.fn() },
    workflow: { findFirst: vi.fn() },
    issue: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    issueHistory: { createMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    _tx: mockTx,
    ...overrides,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockProject = {
  id: "proj-1",
  organizationId: ORG_ID,
  key: "TEST",
  issueCounter: 0,
};

const mockIssueType = {
  id: "type-1",
  organizationId: ORG_ID,
  name: "Task",
};

const mockPriority = {
  id: "pri-3",
  organizationId: ORG_ID,
  name: "Medium",
  rank: 3,
};

const mockStatus = {
  id: "status-1",
  organizationId: ORG_ID,
  name: "To Do",
  category: "TO_DO",
};

const mockWorkflow = {
  id: "wf-1",
  workflowStatuses: [
    { status: mockStatus, statusId: mockStatus.id },
  ],
};

const validInput = {
  projectId: "proj-1",
  summary: "Test issue",
  issueTypeId: "type-1",
  labels: [] as string[],
  customFieldValues: {},
};

// ── createIssue ──────────────────────────────────────────────────────────────

describe("createIssue", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.project.findFirst.mockResolvedValue(mockProject);
    db.issueType.findFirst.mockResolvedValue(mockIssueType);
    db.priority.findFirst.mockResolvedValue(mockPriority);
    db.workflow.findFirst.mockResolvedValue(mockWorkflow);
    db._tx.project.update.mockResolvedValue({ ...mockProject, issueCounter: 1 });
    db._tx.issue.create.mockResolvedValue({
      id: "issue-1",
      key: "TEST-1",
      ...validInput,
      statusId: mockStatus.id,
      priorityId: mockPriority.id,
      reporterId: USER_ID,
      issueType: mockIssueType,
      status: mockStatus,
      priority: mockPriority,
      assignee: null,
      reporter: { id: USER_ID, name: "Test User" },
      parent: null,
    });
    db._tx.auditLog.create.mockResolvedValue({});
  });

  it("creates an issue with auto-generated key", async () => {
    const result = await createIssue(db, ORG_ID, USER_ID, validInput);

    expect(result.key).toBe("TEST-1");
    expect(db._tx.project.update).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      data: { issueCounter: { increment: 1 } },
    });
  });

  it("increments project counter sequentially", async () => {
    db._tx.project.update.mockResolvedValue({ ...mockProject, issueCounter: 5 });
    db._tx.issue.create.mockResolvedValue({
      id: "issue-5",
      key: "TEST-5",
      ...validInput,
      statusId: mockStatus.id,
      priorityId: mockPriority.id,
      reporterId: USER_ID,
      issueType: mockIssueType,
      status: mockStatus,
      priority: mockPriority,
      assignee: null,
      reporter: { id: USER_ID },
      parent: null,
    });

    const result = await createIssue(db, ORG_ID, USER_ID, validInput);
    expect(result.key).toBe("TEST-5");
  });

  it("defaults to Medium priority when none provided", async () => {
    await createIssue(db, ORG_ID, USER_ID, validInput);

    expect(db.priority.findFirst).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, name: "Medium" },
    });
    expect(db._tx.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ priorityId: mockPriority.id }),
      }),
    );
  });

  it("uses provided priorityId when given", async () => {
    await createIssue(db, ORG_ID, USER_ID, {
      ...validInput,
      priorityId: "pri-1",
    });

    expect(db.priority.findFirst).not.toHaveBeenCalled();
    expect(db._tx.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ priorityId: "pri-1" }),
      }),
    );
  });

  it("sets reporter to current user", async () => {
    await createIssue(db, ORG_ID, USER_ID, validInput);

    expect(db._tx.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reporterId: USER_ID }),
      }),
    );
  });

  it("creates an audit log entry", async () => {
    await createIssue(db, ORG_ID, USER_ID, validInput);

    expect(db._tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        userId: USER_ID,
        entityType: "Issue",
        action: "CREATED",
      }),
    });
  });

  it("throws NotFoundError if project not in org", async () => {
    db.project.findFirst.mockResolvedValue(null);

    await expect(
      createIssue(db, ORG_ID, USER_ID, validInput),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError if issue type not in org", async () => {
    db.issueType.findFirst.mockResolvedValue(null);

    await expect(
      createIssue(db, ORG_ID, USER_ID, validInput),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError if no initial status found", async () => {
    db.workflow.findFirst.mockResolvedValue({
      id: "wf-1",
      workflowStatuses: [],
    });

    await expect(
      createIssue(db, ORG_ID, USER_ID, validInput),
    ).rejects.toThrow(NotFoundError);
  });

  it("uses initial TO_DO status from workflow", async () => {
    await createIssue(db, ORG_ID, USER_ID, validInput);

    expect(db._tx.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statusId: mockStatus.id }),
      }),
    );
  });
});

// ── getIssueByKey ────────────────────────────────────────────────────────────

describe("getIssueByKey", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns issue when found", async () => {
    const mockIssue = {
      id: "issue-1",
      key: "TEST-1",
      organizationId: ORG_ID,
      summary: "Found issue",
    };
    db.issue.findFirst.mockResolvedValue(mockIssue);

    const result = await getIssueByKey(db, ORG_ID, "TEST-1");
    expect(result).toEqual(mockIssue);
  });

  it("throws NotFoundError when issue not found", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await expect(
      getIssueByKey(db, ORG_ID, "NOPE-1"),
    ).rejects.toThrow(NotFoundError);
  });

  it("excludes soft-deleted issues", async () => {
    await getIssueByKey(db, ORG_ID, "TEST-1").catch(() => {});

    expect(db.issue.findFirst).toHaveBeenCalledWith({
      where: { key: "TEST-1", organizationId: ORG_ID, deletedAt: null },
      include: expect.any(Object),
    });
  });

  it("scopes query to organization", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await getIssueByKey(db, "other-org", "TEST-1").catch(() => {});

    expect(db.issue.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "other-org" }),
      }),
    );
  });
});

// ── listIssues ───────────────────────────────────────────────────────────────

describe("listIssues", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findMany.mockResolvedValue([]);
    db.issue.count.mockResolvedValue(0);
  });

  it("returns items and total", async () => {
    const mockItems = [{ id: "1" }, { id: "2" }];
    db.issue.findMany.mockResolvedValue(mockItems);
    db.issue.count.mockResolvedValue(2);

    const result = await listIssues(db, ORG_ID, {
      projectId: "proj-1",
      limit: 50,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(result.items).toEqual(mockItems);
    expect(result.total).toBe(2);
  });

  it("filters by statusId when provided", async () => {
    await listIssues(db, ORG_ID, {
      projectId: "proj-1",
      statusId: "status-1",
      limit: 50,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(db.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ statusId: "status-1" }),
      }),
    );
  });

  it("filters by assigneeId when provided", async () => {
    await listIssues(db, ORG_ID, {
      projectId: "proj-1",
      assigneeId: "user-1",
      limit: 50,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(db.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assigneeId: "user-1" }),
      }),
    );
  });

  it("applies case-insensitive search on summary", async () => {
    await listIssues(db, ORG_ID, {
      projectId: "proj-1",
      search: "login bug",
      limit: 50,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(db.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          summary: { contains: "login bug", mode: "insensitive" },
        }),
      }),
    );
  });

  it("excludes soft-deleted issues", async () => {
    await listIssues(db, ORG_ID, {
      projectId: "proj-1",
      limit: 50,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(db.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it("respects limit parameter", async () => {
    await listIssues(db, ORG_ID, {
      projectId: "proj-1",
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(db.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });

  it("applies cursor-based pagination", async () => {
    await listIssues(db, ORG_ID, {
      projectId: "proj-1",
      cursor: "cursor-abc",
      limit: 50,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(db.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        cursor: { id: "cursor-abc" },
      }),
    );
  });
});

// ── updateIssue ──────────────────────────────────────────────────────────────

describe("updateIssue", () => {
  let db: ReturnType<typeof createMockDb>;

  const existingIssue = {
    id: "issue-1",
    organizationId: ORG_ID,
    key: "TEST-1",
    summary: "Original summary",
    description: null,
    issueTypeId: "type-1",
    priorityId: "pri-3",
    assigneeId: null,
    parentId: null,
    sprintId: null,
    storyPoints: null,
    dueDate: null,
    startDate: null,
    labels: [],
  };

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue(existingIssue);
    db._tx.issue.update.mockResolvedValue({
      ...existingIssue,
      summary: "Updated summary",
    });
    db._tx.issueHistory.createMany.mockResolvedValue({});
    db._tx.auditLog.create.mockResolvedValue({});
  });

  it("updates the issue", async () => {
    const result = await updateIssue(db, ORG_ID, USER_ID, "issue-1", {
      summary: "Updated summary",
    });

    expect(result.summary).toBe("Updated summary");
    expect(db._tx.issue.update).toHaveBeenCalledWith({
      where: { id: "issue-1" },
      data: { summary: "Updated summary" },
      include: expect.any(Object),
    });
  });

  it("creates history records for changed fields", async () => {
    await updateIssue(db, ORG_ID, USER_ID, "issue-1", {
      summary: "Updated summary",
    });

    expect(db._tx.issueHistory.createMany).toHaveBeenCalledWith({
      data: [
        {
          organizationId: ORG_ID,
          issueId: "issue-1",
          userId: USER_ID,
          field: "summary",
          oldValue: "Original summary",
          newValue: "Updated summary",
        },
      ],
    });
  });

  it("skips history when field value unchanged", async () => {
    await updateIssue(db, ORG_ID, USER_ID, "issue-1", {
      summary: "Original summary",
    });

    expect(db._tx.issueHistory.createMany).not.toHaveBeenCalled();
  });

  it("creates audit log on update", async () => {
    await updateIssue(db, ORG_ID, USER_ID, "issue-1", {
      summary: "Updated summary",
    });

    expect(db._tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATED",
        entityType: "Issue",
        entityId: "issue-1",
      }),
    });
  });

  it("throws NotFoundError if issue not found", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await expect(
      updateIssue(db, ORG_ID, USER_ID, "nope", { summary: "x" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("tracks label changes", async () => {
    await updateIssue(db, ORG_ID, USER_ID, "issue-1", {
      labels: ["bug", "urgent"],
    });

    expect(db._tx.issueHistory.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          field: "labels",
          oldValue: "[]",
          newValue: '["bug","urgent"]',
        }),
      ]),
    });
  });

  it("uses connect/disconnect for relation fields", async () => {
    await updateIssue(db, ORG_ID, USER_ID, "issue-1", {
      assigneeId: "user-2",
    });

    expect(db._tx.issue.update).toHaveBeenCalledWith({
      where: { id: "issue-1" },
      data: { assignee: { connect: { id: "user-2" } } },
      include: expect.any(Object),
    });
  });

  it("disconnects nullable relations when set to null", async () => {
    db.issue.findFirst.mockResolvedValue({
      ...existingIssue,
      assigneeId: "user-2",
    });

    await updateIssue(db, ORG_ID, USER_ID, "issue-1", {
      assigneeId: null,
    });

    expect(db._tx.issue.update).toHaveBeenCalledWith({
      where: { id: "issue-1" },
      data: { assignee: { disconnect: true } },
      include: expect.any(Object),
    });
  });
});

// ── deleteIssue ──────────────────────────────────────────────────────────────

describe("deleteIssue", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue({
      id: "issue-1",
      key: "TEST-1",
      organizationId: ORG_ID,
      deletedAt: null,
    });
    db._tx.issue.update.mockResolvedValue({});
    db._tx.auditLog.create.mockResolvedValue({});
  });

  it("soft-deletes by setting deletedAt", async () => {
    await deleteIssue(db, ORG_ID, USER_ID, "issue-1");

    expect(db._tx.issue.update).toHaveBeenCalledWith({
      where: { id: "issue-1" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("creates audit log on delete", async () => {
    await deleteIssue(db, ORG_ID, USER_ID, "issue-1");

    expect(db._tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "DELETED",
        entityType: "Issue",
        diff: { key: "TEST-1" },
      }),
    });
  });

  it("throws NotFoundError if issue not found", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await expect(
      deleteIssue(db, ORG_ID, USER_ID, "nope"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError if already deleted", async () => {
    db.issue.findFirst.mockResolvedValue(null); // deletedAt filter excludes it

    await expect(
      deleteIssue(db, ORG_ID, USER_ID, "issue-1"),
    ).rejects.toThrow(NotFoundError);
  });
});
