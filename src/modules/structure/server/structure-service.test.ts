import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  saveView,
  getView,
  listViews,
  updateView,
  deleteView,
  getTree,
} from "./structure-service";
import { NotFoundError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    structureView: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    issue: {
      findMany: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockView = {
  id: "view-1",
  organizationId: ORG_ID,
  ownerId: USER_ID,
  name: "My View",
  projectId: null,
  groupBy: "epic",
  columns: [],
  sortBy: "rank",
  filterQuery: null,
  isShared: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockStatus = (category: string) => ({
  id: `status-${category}`,
  name: category === "DONE" ? "Done" : "To Do",
  category,
});

const mockPriority = { id: "pri-1", name: "Medium" };
const mockIssueType = { id: "it-1", name: "Story" };
const mockAssignee = { id: "user-1", name: "Alice", image: null };

function createMockIssue(overrides: Record<string, unknown> = {}) {
  return {
    id: "issue-1",
    organizationId: ORG_ID,
    projectId: "proj-1",
    key: "ORD-1",
    summary: "Test Issue",
    parentId: null,
    sprintId: null,
    storyPoints: 5,
    deletedAt: null,
    createdAt: new Date("2026-01-01"),
    issueType: mockIssueType,
    status: mockStatus("TO_DO"),
    priority: mockPriority,
    assignee: mockAssignee,
    parent: null,
    ...overrides,
  };
}

// ── saveView ─────────────────────────────────────────────────────────────────

describe("saveView", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.structureView.create.mockResolvedValue(mockView);
  });

  it("creates a view with provided values", async () => {
    const result = await saveView(db, ORG_ID, USER_ID, {
      name: "My View",
    });

    expect(result).toEqual(mockView);
    expect(db.structureView.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_ID,
        ownerId: USER_ID,
        name: "My View",
        projectId: undefined,
        groupBy: "epic",
        columns: [],
        sortBy: "rank",
        filterQuery: undefined,
        isShared: false,
      },
    });
  });

  it("passes custom groupBy and columns when provided", async () => {
    await saveView(db, ORG_ID, USER_ID, {
      name: "Custom",
      groupBy: "assignee",
      columns: [{ field: "summary" }],
      sortBy: "priority",
      projectId: "proj-1",
      filterQuery: "status = Done",
      isShared: true,
    });

    expect(db.structureView.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_ID,
        ownerId: USER_ID,
        name: "Custom",
        projectId: "proj-1",
        groupBy: "assignee",
        columns: [{ field: "summary" }],
        sortBy: "priority",
        filterQuery: "status = Done",
        isShared: true,
      },
    });
  });
});

// ── getView ──────────────────────────────────────────────────────────────────

describe("getView", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns a view when found", async () => {
    db.structureView.findFirst.mockResolvedValue(mockView);

    const result = await getView(db, ORG_ID, "view-1");

    expect(result).toEqual(mockView);
    expect(db.structureView.findFirst).toHaveBeenCalledWith({
      where: { id: "view-1", organizationId: ORG_ID },
    });
  });

  it("throws NotFoundError when view does not exist", async () => {
    db.structureView.findFirst.mockResolvedValue(null);

    await expect(getView(db, ORG_ID, "missing")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── listViews ────────────────────────────────────────────────────────────────

describe("listViews", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.structureView.findMany.mockResolvedValue([mockView]);
  });

  it("returns views for the organization", async () => {
    const result = await listViews(db, ORG_ID);

    expect(result).toHaveLength(1);
    expect(db.structureView.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("filters by projectId when provided", async () => {
    await listViews(db, ORG_ID, "proj-1");

    expect(db.structureView.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, projectId: "proj-1" },
      orderBy: { updatedAt: "desc" },
    });
  });
});

// ── updateView ───────────────────────────────────────────────────────────────

describe("updateView", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.structureView.findFirst.mockResolvedValue(mockView);
    db.structureView.update.mockResolvedValue({
      ...mockView,
      name: "Updated",
    });
  });

  it("updates view when found", async () => {
    const result = await updateView(db, ORG_ID, "view-1", {
      name: "Updated",
    });

    expect(result.name).toBe("Updated");
    expect(db.structureView.update).toHaveBeenCalledWith({
      where: { id: "view-1" },
      data: { name: "Updated" },
    });
  });

  it("throws NotFoundError when view does not exist", async () => {
    db.structureView.findFirst.mockResolvedValue(null);

    await expect(
      updateView(db, ORG_ID, "missing", { name: "Updated" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteView ───────────────────────────────────────────────────────────────

describe("deleteView", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.structureView.findFirst.mockResolvedValue(mockView);
    db.structureView.delete.mockResolvedValue({});
  });

  it("deletes view when found", async () => {
    await deleteView(db, ORG_ID, "view-1");

    expect(db.structureView.delete).toHaveBeenCalledWith({
      where: { id: "view-1" },
    });
  });

  it("throws NotFoundError when view does not exist", async () => {
    db.structureView.findFirst.mockResolvedValue(null);

    await expect(deleteView(db, ORG_ID, "missing")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── getTree ──────────────────────────────────────────────────────────────────

describe("getTree", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("groups issues by epic (parent) by default", async () => {
    const issues = [
      createMockIssue({ id: "i-1", parentId: "epic-1" }),
      createMockIssue({ id: "i-2", parentId: "epic-1" }),
      createMockIssue({ id: "i-3", parentId: null }),
    ];
    db.issue.findMany.mockResolvedValue(issues);

    const result = await getTree(db, ORG_ID, { groupBy: "epic" });

    expect(result.totalCount).toBe(3);
    expect(result.groups["epic-1"]).toHaveLength(2);
    expect(result.groups["No Parent"]).toHaveLength(1);
  });

  it("groups issues by assignee", async () => {
    const issues = [
      createMockIssue({
        id: "i-1",
        assignee: { id: "u-1", name: "Alice", image: null },
      }),
      createMockIssue({ id: "i-2", assignee: null }),
    ];
    db.issue.findMany.mockResolvedValue(issues);

    const result = await getTree(db, ORG_ID, { groupBy: "assignee" });

    expect(result.groups["Alice"]).toHaveLength(1);
    expect(result.groups["Unassigned"]).toHaveLength(1);
  });

  it("groups issues by priority", async () => {
    const issues = [
      createMockIssue({ id: "i-1", priority: { id: "p-1", name: "High" } }),
      createMockIssue({ id: "i-2", priority: { id: "p-2", name: "Low" } }),
    ];
    db.issue.findMany.mockResolvedValue(issues);

    const result = await getTree(db, ORG_ID, { groupBy: "priority" });

    expect(result.groups["High"]).toHaveLength(1);
    expect(result.groups["Low"]).toHaveLength(1);
  });

  it("groups issues by status", async () => {
    const issues = [
      createMockIssue({ id: "i-1", status: mockStatus("TO_DO") }),
      createMockIssue({ id: "i-2", status: mockStatus("DONE") }),
    ];
    db.issue.findMany.mockResolvedValue(issues);

    const result = await getTree(db, ORG_ID, { groupBy: "status" });

    expect(Object.keys(result.groups)).toHaveLength(2);
  });

  it("groups issues by issueType", async () => {
    const issues = [
      createMockIssue({
        id: "i-1",
        issueType: { id: "t-1", name: "Bug" },
      }),
      createMockIssue({
        id: "i-2",
        issueType: { id: "t-2", name: "Story" },
      }),
    ];
    db.issue.findMany.mockResolvedValue(issues);

    const result = await getTree(db, ORG_ID, { groupBy: "issueType" });

    expect(result.groups["Bug"]).toHaveLength(1);
    expect(result.groups["Story"]).toHaveLength(1);
  });

  it("groups issues by sprint", async () => {
    const issues = [
      createMockIssue({ id: "i-1", sprintId: "sprint-1" }),
      createMockIssue({ id: "i-2", sprintId: null }),
    ];
    db.issue.findMany.mockResolvedValue(issues);

    const result = await getTree(db, ORG_ID, { groupBy: "sprint" });

    expect(result.groups["sprint-1"]).toHaveLength(1);
    expect(result.groups["No Sprint"]).toHaveLength(1);
  });

  it("computes aggregates correctly", async () => {
    const issues = [
      createMockIssue({
        id: "i-1",
        parentId: "epic-1",
        storyPoints: 3,
        status: mockStatus("DONE"),
      }),
      createMockIssue({
        id: "i-2",
        parentId: "epic-1",
        storyPoints: 5,
        status: mockStatus("TO_DO"),
      }),
    ];
    db.issue.findMany.mockResolvedValue(issues);

    const result = await getTree(db, ORG_ID, { groupBy: "epic" });

    const agg = result.aggregates["epic-1"]!;
    expect(agg.count).toBe(2);
    expect(agg.storyPoints).toBe(8);
    expect(agg.progress).toBe(50); // 1 out of 2 done
  });

  it("handles empty issue list", async () => {
    db.issue.findMany.mockResolvedValue([]);

    const result = await getTree(db, ORG_ID, { groupBy: "epic" });

    expect(result.totalCount).toBe(0);
    expect(Object.keys(result.groups)).toHaveLength(0);
    expect(Object.keys(result.aggregates)).toHaveLength(0);
  });

  it("scopes query to organization and project", async () => {
    db.issue.findMany.mockResolvedValue([]);

    await getTree(db, ORG_ID, { projectId: "proj-1", groupBy: "epic" });

    expect(db.issue.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        projectId: "proj-1",
        deletedAt: null,
      },
      include: {
        issueType: true,
        status: true,
        priority: true,
        assignee: { select: { id: true, name: true, image: true } },
        parent: { select: { id: true, key: true, summary: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  });

  it("omits projectId from query when not provided", async () => {
    db.issue.findMany.mockResolvedValue([]);

    await getTree(db, ORG_ID, { groupBy: "epic" });

    expect(db.issue.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
      },
      include: {
        issueType: true,
        status: true,
        priority: true,
        assignee: { select: { id: true, name: true, image: true } },
        parent: { select: { id: true, key: true, summary: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  });
});
