import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createIssue,
  getIssueByKey,
  listIssues,
  updateIssue,
  deleteIssue,
  getIssueHistory,
  toggleWatch,
  addWatcher,
  removeWatcher,
  listWatchers,
  toggleVote,
  getVoteStatus,
  listComments,
  addComment,
  editComment,
  deleteComment,
  getChildren,
  createLink,
  deleteLink,
  getLinks,
  listAttachments,
  deleteAttachment,
} from "./issue-service";
import { NotFoundError, PermissionError, ValidationError } from "@/server/lib/errors";

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
    issueHistory: { createMany: vi.fn(), findMany: vi.fn() },
    issueWatcher: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
    vote: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    comment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    issueLink: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    attachment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
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

// ── getIssueHistory ────────────────────────────────────────────────────────

describe("getIssueHistory", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue({ id: "issue-1" });
  });

  it("returns paginated history with user info", async () => {
    const mockHistory = [
      { id: "h1", field: "summary", oldValue: "Old", newValue: "New", user: { id: "u1", name: "User", image: null } },
    ];
    db.issueHistory.findMany.mockResolvedValue(mockHistory);

    const result = await getIssueHistory(db, ORG_ID, "issue-1", { issueId: "issue-1", limit: 50 });
    expect(result.items).toEqual(mockHistory);
  });

  it("returns nextCursor when at limit", async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: `h${i}` }));
    db.issueHistory.findMany.mockResolvedValue(items);

    const result = await getIssueHistory(db, ORG_ID, "issue-1", { issueId: "issue-1", limit: 10 });
    expect(result.nextCursor).toBe("h9");
  });

  it("returns no nextCursor when under limit", async () => {
    db.issueHistory.findMany.mockResolvedValue([{ id: "h1" }]);

    const result = await getIssueHistory(db, ORG_ID, "issue-1", { issueId: "issue-1", limit: 50 });
    expect(result.nextCursor).toBeUndefined();
  });

  it("throws NotFoundError for invalid issue", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await expect(
      getIssueHistory(db, ORG_ID, "bad-id", { issueId: "bad-id", limit: 50 }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── toggleWatch ────────────────────────────────────────────────────────────

describe("toggleWatch", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue({ id: "issue-1" });
  });

  it("creates watch when not watching", async () => {
    db.issueWatcher.findUnique.mockResolvedValue(null);
    db.issueWatcher.create.mockResolvedValue({ id: "w1" });

    const result = await toggleWatch(db, ORG_ID, USER_ID, "issue-1");
    expect(result.watching).toBe(true);
    expect(db.issueWatcher.create).toHaveBeenCalled();
  });

  it("deletes watch when already watching", async () => {
    db.issueWatcher.findUnique.mockResolvedValue({ id: "w1", issueId: "issue-1", userId: USER_ID });

    const result = await toggleWatch(db, ORG_ID, USER_ID, "issue-1");
    expect(result.watching).toBe(false);
    expect(db.issueWatcher.delete).toHaveBeenCalledWith({ where: { id: "w1" } });
  });

  it("throws NotFoundError for invalid issue", async () => {
    db.issue.findFirst.mockResolvedValue(null);
    await expect(toggleWatch(db, ORG_ID, USER_ID, "bad")).rejects.toThrow(NotFoundError);
  });
});

// ── addWatcher / removeWatcher / listWatchers ──────────────────────────────

describe("addWatcher", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue({ id: "issue-1" });
  });

  it("upserts a watcher", async () => {
    db.issueWatcher.upsert.mockResolvedValue({ id: "w1" });

    await addWatcher(db, ORG_ID, "issue-1", "user-2");
    expect(db.issueWatcher.upsert).toHaveBeenCalledWith({
      where: { issueId_userId: { issueId: "issue-1", userId: "user-2" } },
      create: { issueId: "issue-1", userId: "user-2" },
      update: {},
    });
  });
});

describe("removeWatcher", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue({ id: "issue-1" });
  });

  it("removes an existing watcher", async () => {
    db.issueWatcher.findUnique.mockResolvedValue({ id: "w1" });

    await removeWatcher(db, ORG_ID, "issue-1", "user-2");
    expect(db.issueWatcher.delete).toHaveBeenCalledWith({ where: { id: "w1" } });
  });

  it("throws NotFoundError for non-existent watcher", async () => {
    db.issueWatcher.findUnique.mockResolvedValue(null);
    await expect(removeWatcher(db, ORG_ID, "issue-1", "user-2")).rejects.toThrow(NotFoundError);
  });
});

describe("listWatchers", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue({ id: "issue-1" });
  });

  it("returns watchers with user info", async () => {
    const watchers = [{ id: "w1", user: { id: "u1", name: "User", image: null } }];
    db.issueWatcher.findMany.mockResolvedValue(watchers);

    const result = await listWatchers(db, ORG_ID, "issue-1");
    expect(result).toEqual(watchers);
  });
});

// ── toggleVote / getVoteStatus ─────────────────────────────────────────────

describe("toggleVote", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue({ id: "issue-1" });
  });

  it("creates vote when not voted and returns count", async () => {
    db.vote.findUnique.mockResolvedValue(null);
    db.vote.create.mockResolvedValue({ id: "v1" });
    db.vote.count.mockResolvedValue(1);

    const result = await toggleVote(db, ORG_ID, USER_ID, "issue-1");
    expect(result.voted).toBe(true);
    expect(result.count).toBe(1);
  });

  it("removes vote when already voted", async () => {
    db.vote.findUnique.mockResolvedValue({ id: "v1" });
    db.vote.count.mockResolvedValue(0);

    const result = await toggleVote(db, ORG_ID, USER_ID, "issue-1");
    expect(result.voted).toBe(false);
    expect(result.count).toBe(0);
    expect(db.vote.delete).toHaveBeenCalledWith({ where: { id: "v1" } });
  });
});

describe("getVoteStatus", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue({ id: "issue-1" });
  });

  it("returns voted=true and count when voted", async () => {
    db.vote.findUnique.mockResolvedValue({ id: "v1" });
    db.vote.count.mockResolvedValue(3);

    const result = await getVoteStatus(db, ORG_ID, USER_ID, "issue-1");
    expect(result).toEqual({ voted: true, count: 3 });
  });

  it("returns voted=false when not voted", async () => {
    db.vote.findUnique.mockResolvedValue(null);
    db.vote.count.mockResolvedValue(2);

    const result = await getVoteStatus(db, ORG_ID, USER_ID, "issue-1");
    expect(result).toEqual({ voted: false, count: 2 });
  });
});

// ── Comments ───────────────────────────────────────────────────────────────

describe("listComments", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns comments with author info", async () => {
    const comments = [{ id: "c1", body: "Test", author: { id: "u1", name: "User", image: null } }];
    db.comment.findMany.mockResolvedValue(comments);

    const result = await listComments(db, ORG_ID, { issueId: "issue-1", limit: 50 });
    expect(result.items).toEqual(comments);
  });
});

describe("addComment", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue({ id: "issue-1" });
  });

  it("creates a comment", async () => {
    const created = { id: "c1", body: "Hello", authorId: USER_ID, author: { id: USER_ID, name: "User", image: null } };
    db.comment.create.mockResolvedValue(created);

    const result = await addComment(db, ORG_ID, USER_ID, { issueId: "issue-1", body: "Hello" });
    expect(result.body).toBe("Hello");
  });

  it("throws NotFoundError for invalid issue", async () => {
    db.issue.findFirst.mockResolvedValue(null);
    await expect(addComment(db, ORG_ID, USER_ID, { issueId: "bad", body: "Hello" })).rejects.toThrow(NotFoundError);
  });
});

describe("editComment", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("updates own comment", async () => {
    db.comment.findFirst.mockResolvedValue({ id: "c1", authorId: USER_ID });
    db.comment.update.mockResolvedValue({ id: "c1", body: "Updated", author: { id: USER_ID } });

    const result = await editComment(db, ORG_ID, USER_ID, { id: "c1", body: "Updated" });
    expect(result.body).toBe("Updated");
  });

  it("throws PermissionError for other user's comment", async () => {
    db.comment.findFirst.mockResolvedValue({ id: "c1", authorId: "other-user" });
    await expect(editComment(db, ORG_ID, USER_ID, { id: "c1", body: "Nope" })).rejects.toThrow(PermissionError);
  });

  it("throws NotFoundError for missing comment", async () => {
    db.comment.findFirst.mockResolvedValue(null);
    await expect(editComment(db, ORG_ID, USER_ID, { id: "bad", body: "x" })).rejects.toThrow(NotFoundError);
  });
});

describe("deleteComment", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("deletes own comment", async () => {
    db.comment.findFirst.mockResolvedValue({ id: "c1", authorId: USER_ID });

    await deleteComment(db, ORG_ID, USER_ID, "c1");
    expect(db.comment.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
  });

  it("throws PermissionError for other user's comment", async () => {
    db.comment.findFirst.mockResolvedValue({ id: "c1", authorId: "other-user" });
    await expect(deleteComment(db, ORG_ID, USER_ID, "c1")).rejects.toThrow(PermissionError);
  });
});

// ── getChildren ────────────────────────────────────────────────────────────

describe("getChildren", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue({ id: "issue-1" });
  });

  it("returns child issues", async () => {
    const children = [{ id: "child-1", key: "TEST-2", summary: "Child task" }];
    db.issue.findMany.mockResolvedValue(children);

    const result = await getChildren(db, ORG_ID, "issue-1");
    expect(result).toEqual(children);
  });

  it("returns empty array when no children", async () => {
    db.issue.findMany.mockResolvedValue([]);

    const result = await getChildren(db, ORG_ID, "issue-1");
    expect(result).toEqual([]);
  });

  it("throws NotFoundError for invalid issue", async () => {
    db.issue.findFirst.mockResolvedValue(null);
    await expect(getChildren(db, ORG_ID, "bad")).rejects.toThrow(NotFoundError);
  });
});

// ── Issue Linking ──────────────────────────────────────────────────────────

describe("createLink", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst
      .mockResolvedValueOnce({ id: "issue-1" })
      .mockResolvedValueOnce({ id: "issue-2" });
  });

  it("creates a link between two issues", async () => {
    const link = { id: "l1", linkType: "blocks", fromIssue: { id: "issue-1" }, toIssue: { id: "issue-2" } };
    db.issueLink.create.mockResolvedValue(link);

    const result = await createLink(db, ORG_ID, { linkType: "blocks", fromIssueId: "issue-1", toIssueId: "issue-2" });
    expect(result.linkType).toBe("blocks");
  });

  it("rejects self-linking", async () => {
    await expect(
      createLink(db, ORG_ID, { linkType: "blocks", fromIssueId: "issue-1", toIssueId: "issue-1" }),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects invalid link type", async () => {
    await expect(
      createLink(db, ORG_ID, { linkType: "invalid-type", fromIssueId: "issue-1", toIssueId: "issue-2" }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws NotFoundError if from issue not found", async () => {
    db.issue.findFirst.mockReset();
    db.issue.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "issue-2" });

    await expect(
      createLink(db, ORG_ID, { linkType: "blocks", fromIssueId: "bad", toIssueId: "issue-2" }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("deleteLink", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("deletes an existing link", async () => {
    db.issueLink.findFirst.mockResolvedValue({ id: "l1", fromIssue: { organizationId: ORG_ID } });

    await deleteLink(db, ORG_ID, "l1");
    expect(db.issueLink.delete).toHaveBeenCalledWith({ where: { id: "l1" } });
  });

  it("throws NotFoundError for missing link", async () => {
    db.issueLink.findFirst.mockResolvedValue(null);
    await expect(deleteLink(db, ORG_ID, "bad")).rejects.toThrow(NotFoundError);
  });
});

describe("getLinks", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue({ id: "issue-1" });
  });

  it("returns outbound and inbound links", async () => {
    db.issueLink.findMany
      .mockResolvedValueOnce([{ id: "l1", linkType: "blocks" }])
      .mockResolvedValueOnce([{ id: "l2", linkType: "relates-to" }]);

    const result = await getLinks(db, ORG_ID, "issue-1");
    expect(result.outbound).toHaveLength(1);
    expect(result.inbound).toHaveLength(1);
  });
});

// ── Attachments ────────────────────────────────────────────────────────────

describe("listAttachments", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue({ id: "issue-1" });
  });

  it("returns attachments with uploader info", async () => {
    const attachments = [{ id: "a1", filename: "doc.pdf", uploader: { id: "u1", name: "User", image: null } }];
    db.attachment.findMany.mockResolvedValue(attachments);

    const result = await listAttachments(db, ORG_ID, "issue-1");
    expect(result).toEqual(attachments);
  });
});

describe("deleteAttachment", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("deletes own attachment", async () => {
    db.attachment.findFirst.mockResolvedValue({ id: "a1", uploaderId: USER_ID, storageKey: "key" });

    const result = await deleteAttachment(db, ORG_ID, USER_ID, "a1");
    expect(result.id).toBe("a1");
    expect(db.attachment.delete).toHaveBeenCalledWith({ where: { id: "a1" } });
  });

  it("throws PermissionError for other user's attachment", async () => {
    db.attachment.findFirst.mockResolvedValue({ id: "a1", uploaderId: "other-user" });
    await expect(deleteAttachment(db, ORG_ID, USER_ID, "a1")).rejects.toThrow(PermissionError);
  });

  it("throws NotFoundError for missing attachment", async () => {
    db.attachment.findFirst.mockResolvedValue(null);
    await expect(deleteAttachment(db, ORG_ID, USER_ID, "bad")).rejects.toThrow(NotFoundError);
  });
});
