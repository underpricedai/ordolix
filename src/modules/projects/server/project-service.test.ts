import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createProject,
  updateProject,
  listProjects,
  getProject,
  archiveProject,
  addMember,
  removeMember,
} from "./project-service";
import { NotFoundError, ConflictError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockTx() {
  return {
    project: { create: vi.fn(), update: vi.fn() },
    workflow: { findFirst: vi.fn() },
    board: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
}

function createMockDb(overrides: Record<string, unknown> = {}) {
  const mockTx = createMockTx();
  return {
    project: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    projectMember: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    workflow: { findFirst: vi.fn() },
    board: { create: vi.fn() },
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
  name: "Test Project",
  key: "TEST",
  description: null,
  projectType: "software",
  templateKey: "kanban",
  lead: null,
  isArchived: false,
  issueCounter: 0,
  members: [],
  _count: { issues: 0, members: 0 },
};

const validInput = {
  name: "New Project",
  key: "NEW",
  projectTypeKey: "software" as const,
};

// ── createProject ────────────────────────────────────────────────────────────

describe("createProject", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.project.findFirst.mockResolvedValue(null); // no existing key conflict
    db._tx.project.create.mockResolvedValue({
      ...mockProject,
      name: validInput.name,
      key: validInput.key,
    });
    db._tx.auditLog.create.mockResolvedValue({});
  });

  it("creates a project with correct fields", async () => {
    const result = await createProject(db, ORG_ID, USER_ID, validInput);

    expect(result.key).toBe("NEW");
    expect(result.name).toBe("New Project");
    expect(db._tx.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: ORG_ID,
          name: "New Project",
          key: "NEW",
          projectType: "software",
        }),
      }),
    );
  });

  it("creates an audit log entry", async () => {
    await createProject(db, ORG_ID, USER_ID, validInput);

    expect(db._tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        userId: USER_ID,
        entityType: "Project",
        action: "CREATED",
        diff: { name: "New Project", key: "NEW" },
      }),
    });
  });

  it("throws ConflictError if key already exists in org", async () => {
    db.project.findFirst.mockResolvedValue(mockProject);

    await expect(
      createProject(db, ORG_ID, USER_ID, validInput),
    ).rejects.toThrow(ConflictError);
  });

  it("links default workflow and creates board when templateKey provided", async () => {
    const defaultWorkflow = { id: "wf-1", isDefault: true };
    db._tx.workflow.findFirst.mockResolvedValue(defaultWorkflow);
    db._tx.project.update.mockResolvedValue(mockProject);
    db._tx.board.create.mockResolvedValue({});

    await createProject(db, ORG_ID, USER_ID, {
      ...validInput,
      templateKey: "scrum",
    });

    expect(db._tx.workflow.findFirst).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, isDefault: true },
    });
    expect(db._tx.board.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        name: "New Project Board",
        boardType: "scrum",
      }),
    });
  });

  it("defaults templateKey to kanban when not provided", async () => {
    await createProject(db, ORG_ID, USER_ID, validInput);

    expect(db._tx.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          templateKey: "kanban",
        }),
      }),
    );
  });
});

// ── updateProject ────────────────────────────────────────────────────────────

describe("updateProject", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.project.findFirst.mockResolvedValue(mockProject);
    db._tx.project.update.mockResolvedValue({
      ...mockProject,
      name: "Updated Project",
    });
    db._tx.auditLog.create.mockResolvedValue({});
  });

  it("updates the project name", async () => {
    const result = await updateProject(db, ORG_ID, USER_ID, {
      id: "proj-1",
      name: "Updated Project",
    });

    expect(result.name).toBe("Updated Project");
    expect(db._tx.project.update).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      data: { name: "Updated Project" },
      include: expect.any(Object),
    });
  });

  it("creates audit log on update", async () => {
    await updateProject(db, ORG_ID, USER_ID, {
      id: "proj-1",
      name: "Updated Project",
    });

    expect(db._tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATED",
        entityType: "Project",
        entityId: "proj-1",
      }),
    });
  });

  it("throws NotFoundError if project not found", async () => {
    db.project.findFirst.mockResolvedValue(null);

    await expect(
      updateProject(db, ORG_ID, USER_ID, { id: "nope", name: "x" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── listProjects ─────────────────────────────────────────────────────────────

describe("listProjects", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.project.findMany.mockResolvedValue([]);
    db.project.count.mockResolvedValue(0);
  });

  it("returns items and total", async () => {
    const mockItems = [mockProject];
    db.project.findMany.mockResolvedValue(mockItems);
    db.project.count.mockResolvedValue(1);

    const result = await listProjects(db, ORG_ID, {
      limit: 50,
      isArchived: false,
    });

    expect(result.items).toEqual(mockItems);
    expect(result.total).toBe(1);
  });

  it("filters by isArchived", async () => {
    await listProjects(db, ORG_ID, { limit: 50, isArchived: true });

    expect(db.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isArchived: true }),
      }),
    );
  });

  it("applies search on name and key", async () => {
    await listProjects(db, ORG_ID, {
      limit: 50,
      isArchived: false,
      search: "web",
    });

    expect(db.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: "web", mode: "insensitive" } },
            { key: { contains: "web", mode: "insensitive" } },
          ],
        }),
      }),
    );
  });

  it("applies cursor-based pagination", async () => {
    await listProjects(db, ORG_ID, {
      cursor: "cursor-abc",
      limit: 50,
      isArchived: false,
    });

    expect(db.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        cursor: { id: "cursor-abc" },
      }),
    );
  });

  it("respects limit parameter", async () => {
    await listProjects(db, ORG_ID, { limit: 10, isArchived: false });

    expect(db.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });
});

// ── getProject ───────────────────────────────────────────────────────────────

describe("getProject", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns project by id", async () => {
    db.project.findFirst.mockResolvedValue(mockProject);

    const result = await getProject(db, ORG_ID, { id: "proj-1" });
    expect(result).toEqual(mockProject);
  });

  it("returns project by key", async () => {
    db.project.findFirst.mockResolvedValue(mockProject);

    const result = await getProject(db, ORG_ID, { key: "TEST" });
    expect(result).toEqual(mockProject);
    expect(db.project.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({ organizationId: ORG_ID, key: "TEST" }),
      include: expect.any(Object),
    });
  });

  it("throws NotFoundError when project not found", async () => {
    db.project.findFirst.mockResolvedValue(null);

    await expect(
      getProject(db, ORG_ID, { id: "nope" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("scopes query to organization", async () => {
    db.project.findFirst.mockResolvedValue(null);

    await getProject(db, "other-org", { id: "proj-1" }).catch(() => {});

    expect(db.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "other-org" }),
      }),
    );
  });
});

// ── archiveProject ───────────────────────────────────────────────────────────

describe("archiveProject", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.project.findFirst.mockResolvedValue(mockProject);
    db._tx.project.update.mockResolvedValue({
      ...mockProject,
      isArchived: true,
    });
    db._tx.auditLog.create.mockResolvedValue({});
  });

  it("sets isArchived to true", async () => {
    const result = await archiveProject(db, ORG_ID, USER_ID, "proj-1");

    expect(result.isArchived).toBe(true);
    expect(db._tx.project.update).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      data: { isArchived: true },
      include: expect.any(Object),
    });
  });

  it("creates audit log on archive", async () => {
    await archiveProject(db, ORG_ID, USER_ID, "proj-1");

    expect(db._tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATED",
        entityType: "Project",
        diff: expect.objectContaining({ isArchived: true }),
      }),
    });
  });

  it("throws NotFoundError if project not found", async () => {
    db.project.findFirst.mockResolvedValue(null);

    await expect(
      archiveProject(db, ORG_ID, USER_ID, "nope"),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── addMember ────────────────────────────────────────────────────────────────

describe("addMember", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.project.findFirst.mockResolvedValue(mockProject);
    db.user.findUnique.mockResolvedValue({ id: "user-2", name: "Test User" });
    db.projectMember.findFirst.mockResolvedValue(null); // no existing membership
    db.projectMember.create.mockResolvedValue({
      id: "pm-1",
      projectId: "proj-1",
      userId: "user-2",
      role: "developer",
      user: { id: "user-2", name: "Test User", email: "test@test.com" },
    });
  });

  it("creates a project member record", async () => {
    const result = await addMember(db, ORG_ID, {
      projectId: "proj-1",
      userId: "user-2",
      roleId: "developer",
    });

    expect(result.userId).toBe("user-2");
    expect(db.projectMember.create).toHaveBeenCalledWith({
      data: {
        projectId: "proj-1",
        userId: "user-2",
        role: "developer",
      },
      include: expect.any(Object),
    });
  });

  it("throws NotFoundError if project not found in org", async () => {
    db.project.findFirst.mockResolvedValue(null);

    await expect(
      addMember(db, ORG_ID, {
        projectId: "nope",
        userId: "user-2",
        roleId: "developer",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError if user not found", async () => {
    db.user.findUnique.mockResolvedValue(null);

    await expect(
      addMember(db, ORG_ID, {
        projectId: "proj-1",
        userId: "nope",
        roleId: "developer",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError if user already a member", async () => {
    db.projectMember.findFirst.mockResolvedValue({ id: "pm-existing" });

    await expect(
      addMember(db, ORG_ID, {
        projectId: "proj-1",
        userId: "user-2",
        roleId: "developer",
      }),
    ).rejects.toThrow(ConflictError);
  });
});

// ── removeMember ─────────────────────────────────────────────────────────────

describe("removeMember", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.project.findFirst.mockResolvedValue(mockProject);
    db.projectMember.findFirst.mockResolvedValue({
      id: "pm-1",
      projectId: "proj-1",
      userId: "user-2",
    });
    db.projectMember.delete.mockResolvedValue({});
  });

  it("deletes the project member record", async () => {
    await removeMember(db, ORG_ID, {
      projectId: "proj-1",
      userId: "user-2",
    });

    expect(db.projectMember.delete).toHaveBeenCalledWith({
      where: { id: "pm-1" },
    });
  });

  it("throws NotFoundError if project not found in org", async () => {
    db.project.findFirst.mockResolvedValue(null);

    await expect(
      removeMember(db, ORG_ID, { projectId: "nope", userId: "user-2" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError if user is not a member", async () => {
    db.projectMember.findFirst.mockResolvedValue(null);

    await expect(
      removeMember(db, ORG_ID, { projectId: "proj-1", userId: "nope" }),
    ).rejects.toThrow(NotFoundError);
  });
});
