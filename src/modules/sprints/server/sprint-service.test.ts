import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createSprint,
  updateSprint,
  listSprints,
  getSprint,
  startSprint,
  completeSprint,
  addIssuesToSprint,
  removeIssuesFromSprint,
  getVelocity,
} from "./sprint-service";
import { NotFoundError, ValidationError, ConflictError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    project: {
      findFirst: vi.fn(),
    },
    sprint: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    issue: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockProject = {
  id: "proj-1",
  organizationId: ORG_ID,
  key: "TEST",
};

const mockSprint = {
  id: "sprint-1",
  organizationId: ORG_ID,
  projectId: "proj-1",
  name: "Sprint 1",
  goal: null,
  status: "planning",
  startDate: null,
  endDate: null,
  completedAt: null,
};

// ── createSprint ─────────────────────────────────────────────────────────────

describe("createSprint", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.project.findFirst.mockResolvedValue(mockProject);
    db.sprint.count.mockResolvedValue(0);
    db.sprint.create.mockResolvedValue({ ...mockSprint });
    db.auditLog.create.mockResolvedValue({});
  });

  it("creates a sprint with provided name", async () => {
    const result = await createSprint(db, ORG_ID, USER_ID, {
      projectId: "proj-1",
      name: "Sprint 1",
    });

    expect(result.name).toBe("Sprint 1");
    expect(db.sprint.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        projectId: "proj-1",
        name: "Sprint 1",
        status: "planning",
      }),
    });
  });

  it("auto-generates sprint name when not provided", async () => {
    db.sprint.count.mockResolvedValue(3);
    db.sprint.create.mockResolvedValue({ ...mockSprint, name: "Sprint 4" });

    const result = await createSprint(db, ORG_ID, USER_ID, {
      projectId: "proj-1",
    });

    expect(result.name).toBe("Sprint 4");
    expect(db.sprint.count).toHaveBeenCalledWith({
      where: { projectId: "proj-1" },
    });
  });

  it("creates an audit log entry", async () => {
    await createSprint(db, ORG_ID, USER_ID, {
      projectId: "proj-1",
      name: "Sprint 1",
    });

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        userId: USER_ID,
        entityType: "Sprint",
        action: "CREATED",
      }),
    });
  });

  it("throws NotFoundError if project not in org", async () => {
    db.project.findFirst.mockResolvedValue(null);

    await expect(
      createSprint(db, ORG_ID, USER_ID, { projectId: "proj-missing" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── updateSprint ─────────────────────────────────────────────────────────────

describe("updateSprint", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.sprint.findFirst.mockResolvedValue({ ...mockSprint });
    db.sprint.update.mockResolvedValue({
      ...mockSprint,
      name: "Sprint 1 Updated",
    });
  });

  it("updates sprint name", async () => {
    const result = await updateSprint(db, ORG_ID, {
      id: "sprint-1",
      name: "Sprint 1 Updated",
    });

    expect(result.name).toBe("Sprint 1 Updated");
    expect(db.sprint.update).toHaveBeenCalledWith({
      where: { id: "sprint-1" },
      data: { name: "Sprint 1 Updated" },
    });
  });

  it("throws NotFoundError if sprint not found", async () => {
    db.sprint.findFirst.mockResolvedValue(null);

    await expect(
      updateSprint(db, ORG_ID, { id: "nope", name: "x" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError if sprint is not in planning status", async () => {
    db.sprint.findFirst.mockResolvedValue({
      ...mockSprint,
      status: "active",
    });

    await expect(
      updateSprint(db, ORG_ID, { id: "sprint-1", name: "x" }),
    ).rejects.toThrow(ValidationError);
  });
});

// ── listSprints ──────────────────────────────────────────────────────────────

describe("listSprints", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.sprint.findMany.mockResolvedValue([]);
  });

  it("returns sprints for a project", async () => {
    const mockSprints = [
      { id: "s-1", name: "Sprint 1", _count: { issues: 5 } },
      { id: "s-2", name: "Sprint 2", _count: { issues: 3 } },
    ];
    db.sprint.findMany.mockResolvedValue(mockSprints);

    const result = await listSprints(db, ORG_ID, { projectId: "proj-1" });

    expect(result).toEqual(mockSprints);
    expect(db.sprint.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        projectId: "proj-1",
        project: { organizationId: ORG_ID },
      }),
      include: { _count: { select: { issues: true } } },
      orderBy: { startDate: "desc" },
    });
  });

  it("filters by status when provided", async () => {
    await listSprints(db, ORG_ID, { projectId: "proj-1", status: "active" });

    expect(db.sprint.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ status: "active" }),
      include: expect.any(Object),
      orderBy: expect.any(Object),
    });
  });
});

// ── getSprint ────────────────────────────────────────────────────────────────

describe("getSprint", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns sprint with issues", async () => {
    const sprintWithIssues = {
      ...mockSprint,
      issues: [{ id: "issue-1", summary: "Test issue" }],
    };
    db.sprint.findFirst.mockResolvedValue(sprintWithIssues);

    const result = await getSprint(db, ORG_ID, "sprint-1");

    expect(result.issues).toHaveLength(1);
    expect(db.sprint.findFirst).toHaveBeenCalledWith({
      where: {
        id: "sprint-1",
        project: { organizationId: ORG_ID },
      },
      include: {
        issues: {
          include: expect.any(Object),
          where: { deletedAt: null },
        },
      },
    });
  });

  it("throws NotFoundError if sprint not found", async () => {
    db.sprint.findFirst.mockResolvedValue(null);

    await expect(getSprint(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });
});

// ── startSprint ──────────────────────────────────────────────────────────────

describe("startSprint", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.sprint.findFirst.mockResolvedValue({ ...mockSprint });
    db.sprint.update.mockResolvedValue({ ...mockSprint, status: "active" });
    db.auditLog.create.mockResolvedValue({});
  });

  it("starts a sprint in planning status", async () => {
    // First call: find the sprint. Second call: check for active sprint.
    db.sprint.findFirst
      .mockResolvedValueOnce({ ...mockSprint })
      .mockResolvedValueOnce(null);

    const endDate = new Date("2026-03-14");
    await startSprint(db, ORG_ID, USER_ID, {
      id: "sprint-1",
      endDate,
    });

    expect(db.sprint.update).toHaveBeenCalledWith({
      where: { id: "sprint-1" },
      data: expect.objectContaining({
        status: "active",
        endDate,
      }),
    });
  });

  it("creates audit log entry on start", async () => {
    db.sprint.findFirst
      .mockResolvedValueOnce({ ...mockSprint })
      .mockResolvedValueOnce(null);

    await startSprint(db, ORG_ID, USER_ID, {
      id: "sprint-1",
      endDate: new Date("2026-03-14"),
    });

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "Sprint",
        action: "UPDATED",
        diff: expect.objectContaining({ action: "started" }),
      }),
    });
  });

  it("throws NotFoundError if sprint not found", async () => {
    db.sprint.findFirst.mockResolvedValue(null);

    await expect(
      startSprint(db, ORG_ID, USER_ID, {
        id: "nope",
        endDate: new Date(),
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError if sprint is not in planning status", async () => {
    db.sprint.findFirst.mockResolvedValue({
      ...mockSprint,
      status: "completed",
    });

    await expect(
      startSprint(db, ORG_ID, USER_ID, {
        id: "sprint-1",
        endDate: new Date(),
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ConflictError if project already has an active sprint", async () => {
    db.sprint.findFirst
      .mockResolvedValueOnce({ ...mockSprint })
      .mockResolvedValueOnce({ id: "sprint-other", name: "Active Sprint" });

    await expect(
      startSprint(db, ORG_ID, USER_ID, {
        id: "sprint-1",
        endDate: new Date(),
      }),
    ).rejects.toThrow(ConflictError);
  });
});

// ── completeSprint ───────────────────────────────────────────────────────────

describe("completeSprint", () => {
  let db: ReturnType<typeof createMockDb>;

  const doneStatus = { id: "status-done", category: "DONE" };
  const inProgressStatus = { id: "status-ip", category: "IN_PROGRESS" };

  const mockActiveSprint = {
    ...mockSprint,
    status: "active",
    issues: [
      { id: "issue-1", status: doneStatus, deletedAt: null },
      { id: "issue-2", status: inProgressStatus, deletedAt: null },
      { id: "issue-3", status: inProgressStatus, deletedAt: null },
    ],
  };

  beforeEach(() => {
    db = createMockDb();
    db.sprint.findFirst.mockResolvedValue({ ...mockActiveSprint });
    db.issue.updateMany.mockResolvedValue({ count: 2 });
    db.sprint.update.mockResolvedValue({
      ...mockSprint,
      status: "completed",
    });
    db.auditLog.create.mockResolvedValue({});
  });

  it("completes sprint and returns counts", async () => {
    const result = await completeSprint(db, ORG_ID, USER_ID, {
      id: "sprint-1",
    });

    expect(result.completedCount).toBe(1);
    expect(result.movedCount).toBe(2);
  });

  it("moves incomplete issues to backlog when no moveToSprintId", async () => {
    await completeSprint(db, ORG_ID, USER_ID, { id: "sprint-1" });

    expect(db.issue.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["issue-2", "issue-3"] } },
      data: { sprintId: null },
    });
  });

  it("moves incomplete issues to target sprint when moveToSprintId provided", async () => {
    await completeSprint(db, ORG_ID, USER_ID, {
      id: "sprint-1",
      moveToSprintId: "sprint-2",
    });

    expect(db.issue.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["issue-2", "issue-3"] } },
      data: { sprintId: "sprint-2" },
    });
  });

  it("sets sprint status to completed", async () => {
    await completeSprint(db, ORG_ID, USER_ID, { id: "sprint-1" });

    expect(db.sprint.update).toHaveBeenCalledWith({
      where: { id: "sprint-1" },
      data: {
        status: "completed",
      },
    });
  });

  it("throws NotFoundError if sprint not found", async () => {
    db.sprint.findFirst.mockResolvedValue(null);

    await expect(
      completeSprint(db, ORG_ID, USER_ID, { id: "nope" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError if sprint is not active", async () => {
    db.sprint.findFirst.mockResolvedValue({
      ...mockActiveSprint,
      status: "planning",
    });

    await expect(
      completeSprint(db, ORG_ID, USER_ID, { id: "sprint-1" }),
    ).rejects.toThrow(ValidationError);
  });
});

// ── addIssuesToSprint ────────────────────────────────────────────────────────

describe("addIssuesToSprint", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.sprint.findFirst.mockResolvedValue({ ...mockSprint });
    db.issue.updateMany.mockResolvedValue({ count: 2 });
  });

  it("adds issues to a planning sprint", async () => {
    const result = await addIssuesToSprint(db, ORG_ID, {
      sprintId: "sprint-1",
      issueIds: ["issue-1", "issue-2"],
    });

    expect(result.count).toBe(2);
    expect(db.issue.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["issue-1", "issue-2"] }, organizationId: ORG_ID },
      data: { sprintId: "sprint-1" },
    });
  });

  it("allows adding issues to an active sprint", async () => {
    db.sprint.findFirst.mockResolvedValue({
      ...mockSprint,
      status: "active",
    });

    const result = await addIssuesToSprint(db, ORG_ID, {
      sprintId: "sprint-1",
      issueIds: ["issue-1"],
    });

    expect(result.count).toBe(2);
  });

  it("throws NotFoundError if sprint not found", async () => {
    db.sprint.findFirst.mockResolvedValue(null);

    await expect(
      addIssuesToSprint(db, ORG_ID, {
        sprintId: "nope",
        issueIds: ["issue-1"],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError if sprint is completed", async () => {
    db.sprint.findFirst.mockResolvedValue({
      ...mockSprint,
      status: "completed",
    });

    await expect(
      addIssuesToSprint(db, ORG_ID, {
        sprintId: "sprint-1",
        issueIds: ["issue-1"],
      }),
    ).rejects.toThrow(ValidationError);
  });
});

// ── removeIssuesFromSprint ───────────────────────────────────────────────────

describe("removeIssuesFromSprint", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.updateMany.mockResolvedValue({ count: 1 });
  });

  it("removes issues from sprint", async () => {
    const result = await removeIssuesFromSprint(db, ORG_ID, {
      sprintId: "sprint-1",
      issueIds: ["issue-1"],
    });

    expect(result.count).toBe(1);
    expect(db.issue.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["issue-1"] },
        sprintId: "sprint-1",
        organizationId: ORG_ID,
      },
      data: { sprintId: null },
    });
  });
});

// ── getVelocity ──────────────────────────────────────────────────────────────

describe("getVelocity", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns velocity data for completed sprints", async () => {
    const doneStatus = { id: "s-done", category: "DONE" };
    const ipStatus = { id: "s-ip", category: "IN_PROGRESS" };

    db.sprint.findMany.mockResolvedValue([
      {
        id: "s-1",
        name: "Sprint 1",
        issues: [
          { id: "i-1", status: doneStatus, storyPoints: 5, deletedAt: null },
          { id: "i-2", status: doneStatus, storyPoints: 3, deletedAt: null },
          { id: "i-3", status: ipStatus, storyPoints: 8, deletedAt: null },
        ],
      },
      {
        id: "s-2",
        name: "Sprint 2",
        issues: [
          { id: "i-4", status: doneStatus, storyPoints: null, deletedAt: null },
        ],
      },
    ]);

    const result = await getVelocity(db, ORG_ID, {
      projectId: "proj-1",
      sprintCount: 10,
    });

    expect(result).toEqual([
      { sprintName: "Sprint 1", committedPoints: 16, completedPoints: 8, committedCount: 3, completedCount: 2 },
      { sprintName: "Sprint 2", committedPoints: 0, completedPoints: 0, committedCount: 1, completedCount: 1 },
    ]);
  });

  it("queries with correct filters and ordering", async () => {
    db.sprint.findMany.mockResolvedValue([]);

    await getVelocity(db, ORG_ID, { projectId: "proj-1", sprintCount: 5 });

    expect(db.sprint.findMany).toHaveBeenCalledWith({
      where: {
        projectId: "proj-1",
        project: { organizationId: ORG_ID },
        status: "completed",
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        issues: {
          include: { status: true },
          where: { deletedAt: null },
        },
      },
    });
  });
});
