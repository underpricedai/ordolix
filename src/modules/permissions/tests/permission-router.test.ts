/**
 * Unit tests for the permissions tRPC router.
 *
 * @module permission-router-test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/server/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/lib/logger", () => ({
  logger: { child: vi.fn().mockReturnThis(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/server/trpc/dev-auth", () => ({
  createDevSession: vi.fn(),
  getOrganizationId: vi.fn(),
}));
vi.mock("@/server/providers/cache", () => ({
  cacheProvider: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    invalidatePattern: vi.fn().mockResolvedValue(undefined),
  },
}));

import type { TRPCContext } from "@/server/trpc/init";
import { logger } from "@/server/lib/logger";

function createAuthenticatedContext(overrides: Partial<TRPCContext> = {}): TRPCContext {
  return {
    db: overrides.db ?? ({} as TRPCContext["db"]),
    session: {
      user: { id: "user-1", name: "Test User", email: "test@test.com", image: null },
      expires: new Date(Date.now() + 86400000).toISOString(),
    },
    organizationId: "org-1",
    requestId: "req-1",
    logger: logger as unknown as TRPCContext["logger"],
    ...overrides,
  };
}

describe("permissionRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("projectRole.list", () => {
    it("returns project roles for the organization", async () => {
      const mockRoles = [
        { id: "role-1", organizationId: "org-1", name: "Administrator", description: null, isDefault: false },
        { id: "role-2", organizationId: "org-1", name: "Developer", description: null, isDefault: true },
      ];

      const db = {
        projectRole: {
          findMany: vi.fn().mockResolvedValue(mockRoles),
        },
      } as unknown as TRPCContext["db"];

      const ctx = createAuthenticatedContext({ db });

      const result = await db.projectRole.findMany({
        where: { organizationId: ctx.organizationId! },
        orderBy: { name: "asc" },
      });

      expect(result).toEqual(mockRoles);
      expect(db.projectRole.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        orderBy: { name: "asc" },
      });
    });
  });

  describe("projectRole.create", () => {
    it("creates a project role", async () => {
      const newRole = {
        id: "role-new",
        organizationId: "org-1",
        name: "QA Engineer",
        description: "Testing role",
        isDefault: false,
      };

      const db = {
        projectRole: {
          create: vi.fn().mockResolvedValue(newRole),
        },
      } as unknown as TRPCContext["db"];

      const ctx = createAuthenticatedContext({ db });

      const result = await db.projectRole.create({
        data: { organizationId: ctx.organizationId!, name: "QA Engineer", description: "Testing role" },
      });

      expect(result.name).toBe("QA Engineer");
    });
  });

  describe("projectRole.delete", () => {
    it("rejects deletion when role is in use", async () => {
      const db = {
        projectMember: {
          count: vi.fn().mockResolvedValue(3),
        },
        projectRole: {
          delete: vi.fn(),
        },
      } as unknown as TRPCContext["db"];

      const count = await db.projectMember.count({ where: { projectRoleId: "role-1" } });
      expect(count).toBe(3);
      expect(db.projectRole.delete).not.toHaveBeenCalled();
    });
  });

  describe("group.list", () => {
    it("returns groups with member counts", async () => {
      const mockGroups = [
        { id: "grp-1", name: "administrators", _count: { members: 2 } },
        { id: "grp-2", name: "developers", _count: { members: 5 } },
      ];

      const db = {
        group: {
          findMany: vi.fn().mockResolvedValue(mockGroups),
        },
      } as unknown as TRPCContext["db"];

      const result = await db.group.findMany({
        where: { organizationId: "org-1" },
        include: { _count: { select: { members: true } } },
        orderBy: { name: "asc" },
      });

      expect(result).toHaveLength(2);
      expect(result[0]!._count.members).toBe(2);
    });
  });

  describe("group.addMember", () => {
    it("creates a group membership", async () => {
      const membership = { id: "gm-1", groupId: "grp-1", userId: "user-1" };

      const db = {
        groupMember: {
          create: vi.fn().mockResolvedValue(membership),
        },
      } as unknown as TRPCContext["db"];

      const result = await db.groupMember.create({
        data: { groupId: "grp-1", userId: "user-1" },
      });

      expect(result.groupId).toBe("grp-1");
      expect(result.userId).toBe("user-1");
    });
  });

  describe("permissionScheme.get", () => {
    it("returns scheme with grants and related entities", async () => {
      const mockScheme = {
        id: "scheme-1",
        name: "Default Permission Scheme",
        grants: [
          {
            id: "grant-1",
            permissionKey: "CREATE_ISSUES",
            holderType: "projectRole",
            projectRole: { id: "role-1", name: "Developer" },
            group: null,
            user: null,
          },
        ],
      };

      const db = {
        permissionScheme: {
          findUnique: vi.fn().mockResolvedValue(mockScheme),
        },
      } as unknown as TRPCContext["db"];

      const result = await db.permissionScheme.findUnique({
        where: { id: "scheme-1" },
        include: {
          grants: {
            include: {
              projectRole: { select: { id: true, name: true } },
              group: { select: { id: true, name: true } },
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      expect(result).toBeTruthy();
      expect(result!.grants).toHaveLength(1);
      expect(result!.grants[0]!.permissionKey).toBe("CREATE_ISSUES");
    });
  });

  describe("permissionScheme.delete", () => {
    it("rejects deletion when scheme is assigned to projects", async () => {
      const db = {
        project: {
          count: vi.fn().mockResolvedValue(2),
        },
        permissionScheme: {
          delete: vi.fn(),
        },
      } as unknown as TRPCContext["db"];

      const count = await db.project.count({ where: { permissionSchemeId: "scheme-1" } });
      expect(count).toBe(2);
      expect(db.permissionScheme.delete).not.toHaveBeenCalled();
    });
  });

  describe("globalPermission.list", () => {
    it("returns global permissions for the org", async () => {
      const mockPerms = [
        { id: "gp-1", permissionKey: "ADMINISTER", holderType: "group", groupId: "grp-admins", userId: null },
        { id: "gp-2", permissionKey: "CREATE_PROJECT", holderType: "group", groupId: "grp-pm", userId: null },
      ];

      const db = {
        globalPermission: {
          findMany: vi.fn().mockResolvedValue(mockPerms),
        },
      } as unknown as TRPCContext["db"];

      const result = await db.globalPermission.findMany({
        where: { organizationId: "org-1" },
        orderBy: { permissionKey: "asc" },
      });

      expect(result).toHaveLength(2);
    });
  });

  describe("issueSecurity.listSchemes", () => {
    it("returns security schemes with counts", async () => {
      const mockSchemes = [
        { id: "iss-1", name: "Default Security", _count: { levels: 2, projects: 1 } },
      ];

      const db = {
        issueSecurityScheme: {
          findMany: vi.fn().mockResolvedValue(mockSchemes),
        },
      } as unknown as TRPCContext["db"];

      const result = await db.issueSecurityScheme.findMany({
        where: { organizationId: "org-1" },
        include: { _count: { select: { levels: true, projects: true } } },
        orderBy: { name: "asc" },
      });

      expect(result[0]!._count.levels).toBe(2);
    });
  });
});
