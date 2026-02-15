/**
 * Unit tests for the permission checker service.
 *
 * @module permission-checker-test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the cache provider before importing
vi.mock("@/server/providers/cache", () => ({
  cacheProvider: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    invalidatePattern: vi.fn().mockResolvedValue(undefined),
  },
}));

import {
  resolveProjectPermissions,
  checkPermission,
  checkGlobalPermission,
  checkIssueSecurityAccess,
  invalidatePermissionCache,
} from "../server/permission-checker";
import { cacheProvider } from "@/server/providers/cache";

function createMockDb() {
  return {
    project: {
      findUnique: vi.fn(),
    },
    permissionScheme: {
      findFirst: vi.fn(),
      findUnique: vi.fn().mockResolvedValue({ parentId: null }),
    },
    projectMember: {
      findUnique: vi.fn(),
    },
    groupMember: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    permissionGrant: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    globalPermission: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    issue: {
      findUnique: vi.fn(),
    },
    issueSecurityLevelMember: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  } as unknown as Parameters<typeof resolveProjectPermissions>[0];
}

describe("resolveProjectPermissions", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("returns cached permissions if available", async () => {
    vi.mocked(cacheProvider.get).mockResolvedValueOnce(["CREATE_ISSUES", "BROWSE_PROJECTS"]);

    const result = await resolveProjectPermissions(db, "user-1", "project-1", "org-1");

    expect(result).toEqual(new Set(["CREATE_ISSUES", "BROWSE_PROJECTS"]));
    expect(db.project.findUnique).not.toHaveBeenCalled();
  });

  it("returns empty set when no permission scheme exists", async () => {
    (db.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ permissionSchemeId: null });
    (db.permissionScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await resolveProjectPermissions(db, "user-1", "project-1", "org-1");

    expect(result.size).toBe(0);
  });

  it("resolves permissions from project role grants", async () => {
    (db.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ permissionSchemeId: "scheme-1" });
    (db.projectMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ projectRoleId: "role-dev" });
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.permissionGrant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { permissionKey: "CREATE_ISSUES", holderType: "projectRole", projectRoleId: "role-dev", groupId: null, userId: null },
      { permissionKey: "DELETE_ISSUES", holderType: "projectRole", projectRoleId: "role-admin", groupId: null, userId: null },
    ]);

    const result = await resolveProjectPermissions(db, "user-1", "project-1", "org-1");

    expect(result.has("CREATE_ISSUES")).toBe(true);
    expect(result.has("DELETE_ISSUES")).toBe(false);
  });

  it("resolves permissions from group grants", async () => {
    (db.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ permissionSchemeId: "scheme-1" });
    (db.projectMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ groupId: "grp-devs" }]);
    (db.permissionGrant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { permissionKey: "BROWSE_PROJECTS", holderType: "group", projectRoleId: null, groupId: "grp-devs", userId: null },
    ]);

    const result = await resolveProjectPermissions(db, "user-1", "project-1", "org-1");

    expect(result.has("BROWSE_PROJECTS")).toBe(true);
  });

  it("resolves permissions from 'anyone' grants", async () => {
    (db.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ permissionSchemeId: "scheme-1" });
    (db.projectMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.permissionGrant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { permissionKey: "BROWSE_PROJECTS", holderType: "anyone", projectRoleId: null, groupId: null, userId: null },
    ]);

    const result = await resolveProjectPermissions(db, "user-1", "project-1", "org-1");

    expect(result.has("BROWSE_PROJECTS")).toBe(true);
  });

  it("resolves permissions from user-specific grants", async () => {
    (db.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ permissionSchemeId: "scheme-1" });
    (db.projectMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.permissionGrant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { permissionKey: "ADMINISTER_PROJECTS", holderType: "user", projectRoleId: null, groupId: null, userId: "user-1" },
      { permissionKey: "DELETE_ISSUES", holderType: "user", projectRoleId: null, groupId: null, userId: "other-user" },
    ]);

    const result = await resolveProjectPermissions(db, "user-1", "project-1", "org-1");

    expect(result.has("ADMINISTER_PROJECTS")).toBe(true);
    expect(result.has("DELETE_ISSUES")).toBe(false);
  });

  it("falls back to org default scheme when project has none", async () => {
    (db.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ permissionSchemeId: null });
    (db.permissionScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "default-scheme" });
    (db.projectMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.permissionGrant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { permissionKey: "BROWSE_PROJECTS", holderType: "anyone", projectRoleId: null, groupId: null, userId: null },
    ]);

    const result = await resolveProjectPermissions(db, "user-1", "project-1", "org-1");

    expect(result.has("BROWSE_PROJECTS")).toBe(true);
    expect(db.permissionScheme.findFirst).toHaveBeenCalledWith({
      where: { organizationId: "org-1", isDefault: true },
      select: { id: true },
    });
  });

  it("merges permissions from parent scheme via inheritance chain", async () => {
    (db.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ permissionSchemeId: "child-scheme" });
    (db.projectMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    // Child scheme inherits from parent
    (db.permissionScheme.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ parentId: "parent-scheme" })   // child -> parent
      .mockResolvedValueOnce({ parentId: null });               // parent -> no parent
    // Grants from both schemes
    (db.permissionGrant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { permissionKey: "CREATE_ISSUES", holderType: "anyone", projectRoleId: null, groupId: null, userId: null },
      { permissionKey: "BROWSE_PROJECTS", holderType: "anyone", projectRoleId: null, groupId: null, userId: null },
    ]);

    const result = await resolveProjectPermissions(db, "user-1", "project-1", "org-1");

    expect(result.has("CREATE_ISSUES")).toBe(true);
    expect(result.has("BROWSE_PROJECTS")).toBe(true);
    // Should query grants with both scheme IDs
    expect(db.permissionGrant.findMany).toHaveBeenCalledWith({
      where: { permissionSchemeId: { in: ["child-scheme", "parent-scheme"] } },
      select: expect.any(Object),
    });
  });

  it("stops inheritance chain at max depth", async () => {
    (db.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ permissionSchemeId: "scheme-1" });
    (db.projectMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    // Create a deep chain: scheme-1 -> scheme-2 -> ... -> scheme-7 (exceeds max depth of 5)
    (db.permissionScheme.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ parentId: "scheme-2" })
      .mockResolvedValueOnce({ parentId: "scheme-3" })
      .mockResolvedValueOnce({ parentId: "scheme-4" })
      .mockResolvedValueOnce({ parentId: "scheme-5" })
      .mockResolvedValueOnce({ parentId: "scheme-6" })
      .mockResolvedValueOnce({ parentId: "scheme-7" }); // should not be reached
    (db.permissionGrant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await resolveProjectPermissions(db, "user-1", "project-1", "org-1");

    // Should include max 6 schemes (original + 5 parents)
    expect(db.permissionGrant.findMany).toHaveBeenCalledWith({
      where: { permissionSchemeId: { in: ["scheme-1", "scheme-2", "scheme-3", "scheme-4", "scheme-5", "scheme-6"] } },
      select: expect.any(Object),
    });
  });

  it("prevents circular inheritance", async () => {
    (db.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ permissionSchemeId: "scheme-a" });
    (db.projectMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    // Circular: scheme-a -> scheme-b -> scheme-a
    (db.permissionScheme.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ parentId: "scheme-b" })
      .mockResolvedValueOnce({ parentId: "scheme-a" }); // cycle! already in list
    (db.permissionGrant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await resolveProjectPermissions(db, "user-1", "project-1", "org-1");

    // Should stop at cycle detection: only scheme-a and scheme-b
    expect(db.permissionGrant.findMany).toHaveBeenCalledWith({
      where: { permissionSchemeId: { in: ["scheme-a", "scheme-b"] } },
      select: expect.any(Object),
    });
  });

  it("caches resolved permissions", async () => {
    (db.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ permissionSchemeId: "scheme-1" });
    (db.projectMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.permissionGrant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { permissionKey: "BROWSE_PROJECTS", holderType: "anyone", projectRoleId: null, groupId: null, userId: null },
    ]);

    await resolveProjectPermissions(db, "user-1", "project-1", "org-1");

    expect(cacheProvider.set).toHaveBeenCalledWith(
      "perms:org-1:project-1:user-1",
      ["BROWSE_PROJECTS"],
      300,
    );
  });
});

describe("checkPermission", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("returns true for global admins regardless of project permission", async () => {
    // Set up global admin
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ groupId: "admins-group" }]);
    (db.globalPermission.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { permissionKey: "ADMINISTER", holderType: "group", groupId: "admins-group", userId: null },
    ]);

    const result = await checkPermission(db, "user-1", "project-1", "org-1", "DELETE_ISSUES");

    expect(result).toBe(true);
  });
});

describe("checkGlobalPermission", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("returns true when user has global permission via group", async () => {
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ groupId: "admins-grp" }]);
    (db.globalPermission.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { permissionKey: "ADMINISTER", holderType: "group", groupId: "admins-grp", userId: null },
    ]);

    const result = await checkGlobalPermission(db, "user-1", "org-1", "ADMINISTER");

    expect(result).toBe(true);
  });

  it("returns true when user has global permission directly", async () => {
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.globalPermission.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { permissionKey: "CREATE_PROJECT", holderType: "user", groupId: null, userId: "user-1" },
    ]);

    const result = await checkGlobalPermission(db, "user-1", "org-1", "CREATE_PROJECT");

    expect(result).toBe(true);
  });

  it("returns false when user lacks global permission", async () => {
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.globalPermission.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { permissionKey: "ADMINISTER", holderType: "user", groupId: null, userId: "other-user" },
    ]);

    const result = await checkGlobalPermission(db, "user-1", "org-1", "ADMINISTER");

    expect(result).toBe(false);
  });
});

describe("checkIssueSecurityAccess", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("returns true when issue has no security level", async () => {
    (db.issue.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      securityLevelId: null,
      reporterId: "user-1",
      assigneeId: null,
      projectId: "project-1",
    });

    const result = await checkIssueSecurityAccess(db, "user-1", "issue-1", "org-1");

    expect(result).toBe(true);
  });

  it("returns false when issue not found", async () => {
    (db.issue.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await checkIssueSecurityAccess(db, "user-1", "issue-1", "org-1");

    expect(result).toBe(false);
  });

  it("returns true when user matches reporter holder type", async () => {
    (db.issue.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      securityLevelId: "level-1",
      reporterId: "user-1",
      assigneeId: null,
      projectId: "project-1",
    });
    (db.issueSecurityLevelMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { holderType: "reporter", projectRoleId: null, groupId: null, userId: null },
    ]);
    (db.projectMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await checkIssueSecurityAccess(db, "user-1", "issue-1", "org-1");

    expect(result).toBe(true);
  });

  it("returns true when user matches assignee holder type", async () => {
    (db.issue.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      securityLevelId: "level-1",
      reporterId: "other",
      assigneeId: "user-1",
      projectId: "project-1",
    });
    (db.issueSecurityLevelMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { holderType: "assignee", projectRoleId: null, groupId: null, userId: null },
    ]);
    (db.projectMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await checkIssueSecurityAccess(db, "user-1", "issue-1", "org-1");

    expect(result).toBe(true);
  });

  it("returns true when user matches group holder type", async () => {
    (db.issue.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      securityLevelId: "level-1",
      reporterId: "other",
      assigneeId: null,
      projectId: "project-1",
    });
    (db.issueSecurityLevelMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { holderType: "group", projectRoleId: null, groupId: "grp-1", userId: null },
    ]);
    (db.projectMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ groupId: "grp-1" }]);

    const result = await checkIssueSecurityAccess(db, "user-1", "issue-1", "org-1");

    expect(result).toBe(true);
  });

  it("returns false when user matches no holders", async () => {
    (db.issue.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      securityLevelId: "level-1",
      reporterId: "other",
      assigneeId: null,
      projectId: "project-1",
    });
    (db.issueSecurityLevelMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { holderType: "group", projectRoleId: null, groupId: "secret-grp", userId: null },
    ]);
    (db.projectMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await checkIssueSecurityAccess(db, "user-1", "issue-1", "org-1");

    expect(result).toBe(false);
  });
});

describe("invalidatePermissionCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates all org permissions when no userId given", async () => {
    await invalidatePermissionCache("org-1");

    expect(cacheProvider.invalidatePattern).toHaveBeenCalledWith("perms:org-1:*");
    expect(cacheProvider.invalidatePattern).toHaveBeenCalledWith("gperms:org-1:*");
  });

  it("invalidates specific user cache when userId given", async () => {
    await invalidatePermissionCache("org-1", "user-1");

    expect(cacheProvider.del).toHaveBeenCalledWith("perms:org-1:*:user-1");
    expect(cacheProvider.del).toHaveBeenCalledWith("gperms:org-1:user-1");
  });
});
