import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  listIssueTypes,
  createIssueType,
  updateIssueType,
  deleteIssueType,
} from "./issue-type-service";
import { NotFoundError, ConflictError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    issueType: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    issue: {
      count: vi.fn(),
    },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";

// ── listIssueTypes ───────────────────────────────────────────────────────────

describe("listIssueTypes", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns issue types ordered by name", async () => {
    const mockTypes = [
      { id: "t1", name: "Bug", icon: "bug" },
      { id: "t2", name: "Story", icon: "book" },
      { id: "t3", name: "Task", icon: "check" },
    ];
    db.issueType.findMany.mockResolvedValue(mockTypes);

    const result = await listIssueTypes(db, ORG_ID);

    expect(result).toEqual(mockTypes);
    expect(db.issueType.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID },
      orderBy: { name: "asc" },
    });
  });
});

// ── createIssueType ──────────────────────────────────────────────────────────

describe("createIssueType", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("creates an issue type with provided values", async () => {
    const created = {
      id: "t1", organizationId: ORG_ID, name: "Bug", icon: "bug",
      color: "#ff0000", isSubtask: false, hierarchyLevel: 0, category: "software",
    };
    db.issueType.create.mockResolvedValue(created);

    const result = await createIssueType(db, ORG_ID, {
      name: "Bug",
      icon: "bug",
      color: "#ff0000",
    });

    expect(result).toEqual(created);
    expect(db.issueType.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_ID,
        name: "Bug",
        icon: "bug",
        color: "#ff0000",
        isSubtask: false,
        hierarchyLevel: 0,
        category: "software",
      },
    });
  });

  it("uses provided optional values when given", async () => {
    db.issueType.create.mockResolvedValue({ id: "t1" });

    await createIssueType(db, ORG_ID, {
      name: "Sub-task",
      icon: "subtask",
      color: "#00ff00",
      isSubtask: true,
      hierarchyLevel: -1,
      category: "service_management",
    });

    expect(db.issueType.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isSubtask: true,
        hierarchyLevel: -1,
        category: "service_management",
      }),
    });
  });
});

// ── updateIssueType ──────────────────────────────────────────────────────────

describe("updateIssueType", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("updates an existing issue type", async () => {
    db.issueType.findFirst.mockResolvedValue({ id: "t1", organizationId: ORG_ID, name: "Bug" });
    db.issueType.update.mockResolvedValue({ id: "t1", name: "Defect", icon: "warning" });

    const result = await updateIssueType(db, ORG_ID, "t1", { name: "Defect", icon: "warning" });

    expect(result.name).toBe("Defect");
    expect(db.issueType.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { name: "Defect", icon: "warning" },
    });
  });

  it("throws NotFoundError when issue type does not exist", async () => {
    db.issueType.findFirst.mockResolvedValue(null);

    await expect(
      updateIssueType(db, ORG_ID, "nonexistent", { name: "New" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteIssueType ──────────────────────────────────────────────────────────

describe("deleteIssueType", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("deletes an issue type with no issues", async () => {
    db.issueType.findFirst.mockResolvedValue({ id: "t1", organizationId: ORG_ID });
    db.issue.count.mockResolvedValue(0);

    await deleteIssueType(db, ORG_ID, "t1");

    expect(db.issueType.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
  });

  it("throws NotFoundError when issue type does not exist", async () => {
    db.issueType.findFirst.mockResolvedValue(null);

    await expect(
      deleteIssueType(db, ORG_ID, "nonexistent"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError when issue type is in use by issues", async () => {
    db.issueType.findFirst.mockResolvedValue({ id: "t1", organizationId: ORG_ID });
    db.issue.count.mockResolvedValue(10);

    await expect(
      deleteIssueType(db, ORG_ID, "t1"),
    ).rejects.toThrow(ConflictError);
  });
});
