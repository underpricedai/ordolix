import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createQueue,
  updateQueue,
  listQueues,
  getQueue,
  getQueueIssues,
  deleteQueue,
  assignFromQueue,
} from "./queue-service";
import { NotFoundError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    project: { findFirst: vi.fn() },
    queue: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    issue: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockProject = {
  id: "proj-1",
  organizationId: ORG_ID,
  name: "Test Project",
};

const mockQueue = {
  id: "queue-1",
  organizationId: ORG_ID,
  projectId: "proj-1",
  name: "Support Queue",
  filterQuery: JSON.stringify({
    priorityIds: ["pri-high"],
    statusIds: ["status-open"],
  }),
  sortBy: "priority_desc",
  assignmentRule: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockIssue = {
  id: "issue-1",
  organizationId: ORG_ID,
  projectId: "proj-1",
  assigneeId: null,
  summary: "Fix login bug",
};

// ── createQueue ──────────────────────────────────────────────────────────────

describe("createQueue", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.project.findFirst.mockResolvedValue(mockProject);
    db.queue.create.mockResolvedValue(mockQueue);
    db.auditLog.create.mockResolvedValue({});
  });

  it("creates a queue and logs audit", async () => {
    const input = {
      projectId: "proj-1",
      name: "Support Queue",
      filter: { priorityIds: ["pri-high"] },
    };
    const result = await createQueue(db, ORG_ID, USER_ID, input);

    expect(result).toEqual(mockQueue);
    expect(db.queue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        projectId: "proj-1",
        name: "Support Queue",
        filterQuery: JSON.stringify({ priorityIds: ["pri-high"] }),
      }),
    });
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "Queue",
        action: "create",
      }),
    });
  });

  it("throws NotFoundError if project not in org", async () => {
    db.project.findFirst.mockResolvedValue(null);

    await expect(
      createQueue(db, ORG_ID, USER_ID, {
        projectId: "nope",
        name: "Q",
        filter: {},
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("stores description in assignmentRule JSON", async () => {
    await createQueue(db, ORG_ID, USER_ID, {
      projectId: "proj-1",
      name: "Q",
      description: "Handles support tickets",
      filter: {},
    });

    expect(db.queue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assignmentRule: { description: "Handles support tickets" },
      }),
    });
  });
});

// ── updateQueue ──────────────────────────────────────────────────────────────

describe("updateQueue", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.queue.findFirst.mockResolvedValue(mockQueue);
    db.queue.update.mockResolvedValue({ ...mockQueue, name: "Renamed" });
  });

  it("updates queue name", async () => {
    const result = await updateQueue(db, ORG_ID, {
      id: "queue-1",
      name: "Renamed",
    });

    expect(result.name).toBe("Renamed");
    expect(db.queue.update).toHaveBeenCalledWith({
      where: { id: "queue-1" },
      data: expect.objectContaining({ name: "Renamed" }),
    });
  });

  it("updates filter as JSON string", async () => {
    await updateQueue(db, ORG_ID, {
      id: "queue-1",
      filter: { statusIds: ["status-done"] },
    });

    expect(db.queue.update).toHaveBeenCalledWith({
      where: { id: "queue-1" },
      data: expect.objectContaining({
        filterQuery: JSON.stringify({ statusIds: ["status-done"] }),
      }),
    });
  });

  it("throws NotFoundError when queue not found", async () => {
    db.queue.findFirst.mockResolvedValue(null);

    await expect(
      updateQueue(db, ORG_ID, { id: "nope", name: "X" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── listQueues ───────────────────────────────────────────────────────────────

describe("listQueues", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.queue.findMany.mockResolvedValue([mockQueue]);
    db.issue.count.mockResolvedValue(5);
  });

  it("returns queues with issue counts", async () => {
    const results = await listQueues(db, ORG_ID, { projectId: "proj-1" });

    expect(results).toHaveLength(1);
    expect(results[0]!._count.issues).toBe(5);
    expect(db.queue.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, projectId: "proj-1" },
      orderBy: { createdAt: "asc" },
    });
  });

  it("returns empty array when no queues exist", async () => {
    db.queue.findMany.mockResolvedValue([]);
    const results = await listQueues(db, ORG_ID, { projectId: "proj-1" });
    expect(results).toEqual([]);
  });
});

// ── getQueue ─────────────────────────────────────────────────────────────────

describe("getQueue", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns queue when found", async () => {
    db.queue.findFirst.mockResolvedValue(mockQueue);
    const result = await getQueue(db, ORG_ID, "queue-1");
    expect(result).toEqual(mockQueue);
  });

  it("throws NotFoundError when not found", async () => {
    db.queue.findFirst.mockResolvedValue(null);
    await expect(getQueue(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });

  it("scopes query to organization", async () => {
    db.queue.findFirst.mockResolvedValue(null);
    await getQueue(db, "other-org", "queue-1").catch(() => {});

    expect(db.queue.findFirst).toHaveBeenCalledWith({
      where: { id: "queue-1", organizationId: "other-org" },
    });
  });
});

// ── getQueueIssues ───────────────────────────────────────────────────────────

describe("getQueueIssues", () => {
  let db: ReturnType<typeof createMockDb>;

  const mockIssues = [
    { id: "i-1", summary: "Issue 1" },
    { id: "i-2", summary: "Issue 2" },
  ];

  beforeEach(() => {
    db = createMockDb();
    db.queue.findFirst.mockResolvedValue(mockQueue);
    db.issue.findMany.mockResolvedValue(mockIssues);
  });

  it("returns issues matching queue filter", async () => {
    const result = await getQueueIssues(db, ORG_ID, {
      queueId: "queue-1",
      limit: 50,
      sortOrder: "desc",
    });

    expect(result.issues).toHaveLength(2);
    expect(result.nextCursor).toBeUndefined();
    expect(db.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: ORG_ID,
          projectId: "proj-1",
          priorityId: { in: ["pri-high"] },
          statusId: { in: ["status-open"] },
          deletedAt: null,
        }),
      }),
    );
  });

  it("returns nextCursor when more results exist", async () => {
    const manyIssues = Array.from({ length: 3 }, (_, i) => ({
      id: `i-${i}`,
      summary: `Issue ${i}`,
    }));
    db.issue.findMany.mockResolvedValue(manyIssues);

    const result = await getQueueIssues(db, ORG_ID, {
      queueId: "queue-1",
      limit: 2,
      sortOrder: "desc",
    });

    expect(result.issues).toHaveLength(2);
    expect(result.nextCursor).toBe("i-2");
  });

  it("throws NotFoundError when queue not found", async () => {
    db.queue.findFirst.mockResolvedValue(null);

    await expect(
      getQueueIssues(db, ORG_ID, {
        queueId: "nope",
        limit: 50,
        sortOrder: "desc",
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteQueue ──────────────────────────────────────────────────────────────

describe("deleteQueue", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.queue.findFirst.mockResolvedValue(mockQueue);
    db.queue.delete.mockResolvedValue({});
  });

  it("deletes queue", async () => {
    await deleteQueue(db, ORG_ID, "queue-1");

    expect(db.queue.delete).toHaveBeenCalledWith({
      where: { id: "queue-1" },
    });
  });

  it("throws NotFoundError when not found", async () => {
    db.queue.findFirst.mockResolvedValue(null);

    await expect(deleteQueue(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── assignFromQueue ──────────────────────────────────────────────────────────

describe("assignFromQueue", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue(mockIssue);
    db.issue.update.mockResolvedValue({
      ...mockIssue,
      assigneeId: "user-2",
    });
    db.auditLog.create.mockResolvedValue({});
  });

  it("assigns issue and creates audit log", async () => {
    const result = await assignFromQueue(db, ORG_ID, USER_ID, {
      issueId: "issue-1",
      assigneeId: "user-2",
    });

    expect(result.assigneeId).toBe("user-2");
    expect(db.issue.update).toHaveBeenCalledWith({
      where: { id: "issue-1" },
      data: { assigneeId: "user-2" },
      include: expect.objectContaining({
        issueType: true,
        status: true,
        priority: true,
        assignee: true,
      }),
    });
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "Issue",
        action: "update",
        diff: expect.objectContaining({
          field: "assigneeId",
          from: null,
          to: "user-2",
        }),
      }),
    });
  });

  it("throws NotFoundError when issue not found", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await expect(
      assignFromQueue(db, ORG_ID, USER_ID, {
        issueId: "nope",
        assigneeId: "user-2",
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
