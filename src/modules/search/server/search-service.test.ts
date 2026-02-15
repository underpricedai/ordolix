/**
 * Tests for the Search service.
 *
 * @module search-service-test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  search,
  quickSearch,
  suggest,
  saveFilter,
  updateFilter,
  listFilters,
  deleteFilter,
} from "./search-service";
import { NotFoundError, PermissionError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    issue: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    project: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    status: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    priority: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    filter: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      delete: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

// ── search ───────────────────────────────────────────────────────────────────

describe("search", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("uses AQL-generated where clause for valid AQL queries", async () => {
    const mockIssues = [{ id: "issue-1", key: "TEST-1" }];
    db.issue.findMany.mockResolvedValue(mockIssues);
    db.issue.count.mockResolvedValue(1);

    const result = await search(db, ORG_ID, USER_ID, {
      query: 'status = "Open"',
      limit: 50,
    });

    expect(result.items).toEqual(mockIssues);
    expect(result.total).toBe(1);

    // The where clause should include the AQL-generated status filter
    const callArgs = db.issue.findMany.mock.calls[0][0];
    expect(callArgs.where).toMatchObject({
      organizationId: ORG_ID,
      deletedAt: null,
      status: { name: "Open" },
    });
  });

  it("falls back to text search when AQL parsing fails", async () => {
    db.issue.findMany.mockResolvedValue([]);
    db.issue.count.mockResolvedValue(0);

    await search(db, ORG_ID, USER_ID, {
      query: "some random text that is not AQL",
      limit: 50,
    });

    const callArgs = db.issue.findMany.mock.calls[0][0];
    expect(callArgs.where.OR).toEqual([
      { summary: { contains: "some random text that is not AQL", mode: "insensitive" } },
      { description: { contains: "some random text that is not AQL", mode: "insensitive" } },
    ]);
  });

  it("applies AQL ORDER BY when present", async () => {
    db.issue.findMany.mockResolvedValue([]);
    db.issue.count.mockResolvedValue(0);

    await search(db, ORG_ID, USER_ID, {
      query: 'status = "Open" ORDER BY created DESC',
      limit: 50,
    });

    const callArgs = db.issue.findMany.mock.calls[0][0];
    expect(callArgs.orderBy).toEqual([{ createdAt: "desc" }]);
  });

  it("returns nextCursor when results fill the page", async () => {
    const mockIssues = Array.from({ length: 50 }, (_, i) => ({
      id: `issue-${i}`,
    }));
    db.issue.findMany.mockResolvedValue(mockIssues);
    db.issue.count.mockResolvedValue(100);

    const result = await search(db, ORG_ID, USER_ID, {
      query: "test",
      limit: 50,
    });

    expect(result.nextCursor).toBe("issue-49");
  });

  it("returns undefined nextCursor when results are fewer than limit", async () => {
    db.issue.findMany.mockResolvedValue([{ id: "issue-1" }]);
    db.issue.count.mockResolvedValue(1);

    const result = await search(db, ORG_ID, USER_ID, {
      query: "test",
      limit: 50,
    });

    expect(result.nextCursor).toBeUndefined();
  });

  it("applies cursor-based pagination when cursor is provided", async () => {
    db.issue.findMany.mockResolvedValue([]);
    db.issue.count.mockResolvedValue(0);

    await search(db, ORG_ID, USER_ID, {
      query: "test",
      cursor: "cursor-abc",
      limit: 50,
    });

    const callArgs = db.issue.findMany.mock.calls[0][0];
    expect(callArgs.skip).toBe(1);
    expect(callArgs.cursor).toEqual({ id: "cursor-abc" });
  });
});

// ── quickSearch ──────────────────────────────────────────────────────────────

describe("quickSearch", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns both issues and projects", async () => {
    const mockIssues = [{ id: "issue-1", summary: "Login bug" }];
    const mockProjects = [{ id: "proj-1", name: "Login Service" }];
    db.issue.findMany.mockResolvedValue(mockIssues);
    db.project.findMany.mockResolvedValue(mockProjects);

    const result = await quickSearch(db, ORG_ID, {
      term: "login",
      limit: 10,
    });

    expect(result.issues).toEqual(mockIssues);
    expect(result.projects).toEqual(mockProjects);
  });

  it("searches issues by summary and key", async () => {
    db.issue.findMany.mockResolvedValue([]);
    db.project.findMany.mockResolvedValue([]);

    await quickSearch(db, ORG_ID, { term: "TEST-1", limit: 10 });

    const issueCallArgs = db.issue.findMany.mock.calls[0][0];
    expect(issueCallArgs.where.OR).toEqual([
      { summary: { contains: "TEST-1", mode: "insensitive" } },
      { key: { contains: "TEST-1", mode: "insensitive" } },
    ]);
  });

  it("searches projects by name and key", async () => {
    db.issue.findMany.mockResolvedValue([]);
    db.project.findMany.mockResolvedValue([]);

    await quickSearch(db, ORG_ID, { term: "web", limit: 10 });

    const projectCallArgs = db.project.findMany.mock.calls[0][0];
    expect(projectCallArgs.where.OR).toEqual([
      { name: { contains: "web", mode: "insensitive" } },
      { key: { contains: "web", mode: "insensitive" } },
    ]);
  });

  it("respects the limit parameter", async () => {
    db.issue.findMany.mockResolvedValue([]);
    db.project.findMany.mockResolvedValue([]);

    await quickSearch(db, ORG_ID, { term: "x", limit: 5 });

    expect(db.issue.findMany.mock.calls[0][0].take).toBe(5);
    expect(db.project.findMany.mock.calls[0][0].take).toBe(5);
  });
});

// ── suggest ──────────────────────────────────────────────────────────────────

describe("suggest", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns only statuses when field = 'status'", async () => {
    const mockStatuses = [{ id: "s1", name: "Open" }];
    db.status.findMany.mockResolvedValue(mockStatuses);

    const result = await suggest(db, ORG_ID, {
      partial: "Op",
      field: "status",
    });

    expect(result.statuses).toEqual(mockStatuses);
    expect(result.users).toEqual([]);
    expect(result.priorities).toEqual([]);
    expect(result.projects).toEqual([]);
  });

  it("returns only users when field = 'assignee'", async () => {
    const mockUsers = [{ id: "u1", name: "Alice" }];
    db.user.findMany.mockResolvedValue(mockUsers);

    const result = await suggest(db, ORG_ID, {
      partial: "Ali",
      field: "assignee",
    });

    expect(result.users).toEqual(mockUsers);
    expect(result.statuses).toEqual([]);
  });

  it("returns only priorities when field = 'priority'", async () => {
    const mockPriorities = [{ id: "p1", name: "High" }];
    db.priority.findMany.mockResolvedValue(mockPriorities);

    const result = await suggest(db, ORG_ID, {
      partial: "Hi",
      field: "priority",
    });

    expect(result.priorities).toEqual(mockPriorities);
    expect(result.users).toEqual([]);
  });

  it("returns only projects when field = 'project'", async () => {
    const mockProjects = [{ id: "proj-1", name: "Website" }];
    db.project.findMany.mockResolvedValue(mockProjects);

    const result = await suggest(db, ORG_ID, {
      partial: "Web",
      field: "project",
    });

    expect(result.projects).toEqual(mockProjects);
    expect(result.statuses).toEqual([]);
  });

  it("returns a mix of all types when no field is specified", async () => {
    db.status.findMany.mockResolvedValue([{ id: "s1", name: "Open" }]);
    db.user.findMany.mockResolvedValue([{ id: "u1", name: "Alice" }]);
    db.priority.findMany.mockResolvedValue([{ id: "p1", name: "High" }]);
    db.project.findMany.mockResolvedValue([{ id: "proj-1", name: "Web" }]);

    const result = await suggest(db, ORG_ID, { partial: "o" });

    expect(result.statuses).toHaveLength(1);
    expect(result.users).toHaveLength(1);
    expect(result.priorities).toHaveLength(1);
    expect(result.projects).toHaveLength(1);
  });
});

// ── saveFilter ───────────────────────────────────────────────────────────────

describe("saveFilter", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("creates a filter with correct data", async () => {
    const mockFilter = { id: "filter-1", name: "My Filter" };
    db.filter.create.mockResolvedValue(mockFilter);

    const result = await saveFilter(db, ORG_ID, USER_ID, {
      name: "My Filter",
      query: 'status = "Open"',
      isShared: false,
    });

    expect(result).toEqual(mockFilter);
    expect(db.filter.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_ID,
        ownerId: USER_ID,
        name: "My Filter",
        aql: 'status = "Open"',
        sharedWith: [],
      },
    });
  });

  it("sets sharedWith when isShared is true", async () => {
    db.filter.create.mockResolvedValue({ id: "filter-1" });

    await saveFilter(db, ORG_ID, USER_ID, {
      name: "Shared",
      query: "test",
      isShared: true,
    });

    expect(db.filter.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sharedWith: ["organization"],
      }),
    });
  });
});

// ── updateFilter ─────────────────────────────────────────────────────────────

describe("updateFilter", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("updates a filter the user owns", async () => {
    db.filter.findFirst.mockResolvedValue({
      id: "filter-1",
      ownerId: USER_ID,
      organizationId: ORG_ID,
    });
    db.filter.update.mockResolvedValue({ id: "filter-1", name: "Updated" });

    const result = await updateFilter(db, ORG_ID, USER_ID, {
      id: "filter-1",
      name: "Updated",
    });

    expect(result.name).toBe("Updated");
    expect(db.filter.update).toHaveBeenCalledWith({
      where: { id: "filter-1" },
      data: { name: "Updated" },
    });
  });

  it("throws NotFoundError when filter does not exist", async () => {
    db.filter.findFirst.mockResolvedValue(null);

    await expect(
      updateFilter(db, ORG_ID, USER_ID, { id: "nope", name: "x" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws PermissionError when user does not own the filter", async () => {
    db.filter.findFirst.mockResolvedValue({
      id: "filter-1",
      ownerId: "other-user",
      organizationId: ORG_ID,
    });

    await expect(
      updateFilter(db, ORG_ID, USER_ID, { id: "filter-1", name: "x" }),
    ).rejects.toThrow(PermissionError);
  });
});

// ── listFilters ──────────────────────────────────────────────────────────────

describe("listFilters", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns only user's filters by default", async () => {
    const mockFilters = [{ id: "f1", ownerId: USER_ID }];
    db.filter.findMany.mockResolvedValue(mockFilters);

    const result = await listFilters(db, ORG_ID, USER_ID, {
      includeShared: false,
    });

    expect(result).toEqual(mockFilters);
    expect(db.filter.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, ownerId: USER_ID },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("includes shared filters when includeShared is true", async () => {
    db.filter.findMany.mockResolvedValue([]);

    await listFilters(db, ORG_ID, USER_ID, { includeShared: true });

    const callArgs = db.filter.findMany.mock.calls[0][0];
    expect(callArgs.where.OR).toEqual([
      { ownerId: USER_ID },
      { sharedWith: { not: "[]" } },
    ]);
  });
});

// ── deleteFilter ─────────────────────────────────────────────────────────────

describe("deleteFilter", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("deletes a filter the user owns", async () => {
    db.filter.findFirst.mockResolvedValue({
      id: "filter-1",
      ownerId: USER_ID,
      organizationId: ORG_ID,
    });
    db.filter.delete.mockResolvedValue({});

    await deleteFilter(db, ORG_ID, USER_ID, "filter-1");

    expect(db.filter.delete).toHaveBeenCalledWith({
      where: { id: "filter-1" },
    });
  });

  it("throws NotFoundError when filter does not exist", async () => {
    db.filter.findFirst.mockResolvedValue(null);

    await expect(
      deleteFilter(db, ORG_ID, USER_ID, "nope"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws PermissionError when user does not own the filter", async () => {
    db.filter.findFirst.mockResolvedValue({
      id: "filter-1",
      ownerId: "other-user",
      organizationId: ORG_ID,
    });

    await expect(
      deleteFilter(db, ORG_ID, USER_ID, "filter-1"),
    ).rejects.toThrow(PermissionError);
  });
});
