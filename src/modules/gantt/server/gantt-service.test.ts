import { describe, expect, it, vi, beforeEach } from "vitest";
import { addDependency, removeDependency, getGanttData } from "./gantt-service";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    issue: { findFirst: vi.fn(), findMany: vi.fn() },
    ganttDependency: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";

const mockSourceIssue = {
  id: "issue-1",
  organizationId: ORG_ID,
  projectId: "proj-1",
  key: "ORD-1",
  summary: "Source Issue",
  startDate: new Date("2026-01-01"),
  dueDate: new Date("2026-01-15"),
  deletedAt: null,
  status: { id: "status-1", name: "To Do", category: "TO_DO" },
};

const mockTargetIssue = {
  id: "issue-2",
  organizationId: ORG_ID,
  projectId: "proj-1",
  key: "ORD-2",
  summary: "Target Issue",
  startDate: new Date("2026-01-16"),
  dueDate: new Date("2026-01-31"),
  deletedAt: null,
  status: { id: "status-2", name: "In Progress", category: "IN_PROGRESS" },
};

const mockDependency = {
  id: "dep-1",
  organizationId: ORG_ID,
  sourceIssueId: "issue-1",
  targetIssueId: "issue-2",
  dependencyType: "FS",
  lag: 0,
  createdAt: new Date(),
};

// ── addDependency ────────────────────────────────────────────────────────────

describe("addDependency", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst
      .mockResolvedValueOnce(mockSourceIssue)
      .mockResolvedValueOnce(mockTargetIssue);
    db.ganttDependency.findFirst.mockResolvedValue(null);
    db.ganttDependency.create.mockResolvedValue(mockDependency);
  });

  it("creates dependency between two issues", async () => {
    const result = await addDependency(db, ORG_ID, {
      sourceIssueId: "issue-1",
      targetIssueId: "issue-2",
      dependencyType: "FS",
      lag: 0,
    });

    expect(result).toEqual(mockDependency);
    expect(db.ganttDependency.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_ID,
        sourceIssueId: "issue-1",
        targetIssueId: "issue-2",
        dependencyType: "FS",
        lag: 0,
      },
    });
  });

  it("rejects self-reference dependency", async () => {
    await expect(
      addDependency(db, ORG_ID, {
        sourceIssueId: "issue-1",
        targetIssueId: "issue-1",
        dependencyType: "FS",
        lag: 0,
      }),
    ).rejects.toThrow(ValidationError);

    await expect(
      addDependency(db, ORG_ID, {
        sourceIssueId: "issue-1",
        targetIssueId: "issue-1",
        dependencyType: "FS",
        lag: 0,
      }),
    ).rejects.toThrow("Cannot create dependency to self");
  });

  it("throws NotFoundError if source issue not found", async () => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValueOnce(null);

    await expect(
      addDependency(db, ORG_ID, {
        sourceIssueId: "missing-1",
        targetIssueId: "issue-2",
        dependencyType: "FS",
        lag: 0,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError if target issue not found", async () => {
    db = createMockDb();
    db.issue.findFirst
      .mockResolvedValueOnce(mockSourceIssue)
      .mockResolvedValueOnce(null);

    await expect(
      addDependency(db, ORG_ID, {
        sourceIssueId: "issue-1",
        targetIssueId: "missing-2",
        dependencyType: "FS",
        lag: 0,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError if dependency already exists", async () => {
    db = createMockDb();
    db.issue.findFirst
      .mockResolvedValueOnce(mockSourceIssue)
      .mockResolvedValueOnce(mockTargetIssue);
    db.ganttDependency.findFirst.mockResolvedValue(mockDependency);

    await expect(
      addDependency(db, ORG_ID, {
        sourceIssueId: "issue-1",
        targetIssueId: "issue-2",
        dependencyType: "FS",
        lag: 0,
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("scopes issue lookups to organization", async () => {
    await addDependency(db, ORG_ID, {
      sourceIssueId: "issue-1",
      targetIssueId: "issue-2",
      dependencyType: "FS",
      lag: 0,
    });

    expect(db.issue.findFirst).toHaveBeenCalledWith({
      where: { id: "issue-1", organizationId: ORG_ID, deletedAt: null },
    });
    expect(db.issue.findFirst).toHaveBeenCalledWith({
      where: { id: "issue-2", organizationId: ORG_ID, deletedAt: null },
    });
  });
});

// ── removeDependency ─────────────────────────────────────────────────────────

describe("removeDependency", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.ganttDependency.findFirst.mockResolvedValue(mockDependency);
    db.ganttDependency.delete.mockResolvedValue({});
  });

  it("removes dependency", async () => {
    await removeDependency(db, ORG_ID, "dep-1");

    expect(db.ganttDependency.delete).toHaveBeenCalledWith({
      where: { id: "dep-1" },
    });
  });

  it("throws NotFoundError when dependency not found", async () => {
    db.ganttDependency.findFirst.mockResolvedValue(null);

    await expect(
      removeDependency(db, ORG_ID, "nope"),
    ).rejects.toThrow(NotFoundError);
  });

  it("scopes lookup to organization", async () => {
    await removeDependency(db, "other-org", "dep-1");

    expect(db.ganttDependency.findFirst).toHaveBeenCalledWith({
      where: { id: "dep-1", organizationId: "other-org" },
    });
  });
});

// ── getGanttData ─────────────────────────────────────────────────────────────

describe("getGanttData", () => {
  let db: ReturnType<typeof createMockDb>;

  const mockIssuesWithDeps = [
    {
      ...mockSourceIssue,
      ganttDepsSource: [mockDependency],
      ganttDepsTarget: [],
    },
    {
      ...mockTargetIssue,
      ganttDepsSource: [],
      ganttDepsTarget: [mockDependency],
    },
  ];

  beforeEach(() => {
    db = createMockDb();
    db.issue.findMany.mockResolvedValue(mockIssuesWithDeps);
  });

  it("returns transformed issues with dependencies", async () => {
    const result = await getGanttData(db, ORG_ID, { projectId: "proj-1" });

    expect(result.issues).toHaveLength(2);
    expect(result.issues[0]!.issueKey).toBe("ORD-1");
    expect(result.issues[0]!.statusName).toBe("To Do");
    expect(result.issues[0]!.endDate).toBe(new Date("2026-01-15").toISOString());
    expect(result.dependencies).toHaveLength(1);
    expect(result.dependencies[0]!.sourceId).toBe("issue-1");
    expect(result.dependencies[0]!.targetId).toBe("issue-2");
  });

  it("returns empty for no issues", async () => {
    db.issue.findMany.mockResolvedValue([]);

    const result = await getGanttData(db, ORG_ID, { projectId: "proj-1" });

    expect(result.issues).toHaveLength(0);
    expect(result.dependencies).toHaveLength(0);
  });

  it("scopes query to organization and project", async () => {
    await getGanttData(db, ORG_ID, { projectId: "proj-1" });

    expect(db.issue.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        projectId: "proj-1",
        deletedAt: null,
      },
      include: {
        status: true,
        project: { select: { key: true, name: true } },
        ganttDepsSource: true,
        ganttDepsTarget: true,
      },
    });
  });
});
