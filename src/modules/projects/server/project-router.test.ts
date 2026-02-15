import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock the project service module
vi.mock("./project-service", () => ({
  createProject: vi.fn(),
  updateProject: vi.fn(),
  listProjects: vi.fn(),
  getProject: vi.fn(),
  archiveProject: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
}));

// Mock the auth module to avoid NextAuth initialization
vi.mock("@/server/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// Mock the db module
vi.mock("@/server/db", () => ({
  db: {},
}));

// Mock the logger module
vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Mock dev-auth module
vi.mock("@/server/trpc/dev-auth", () => ({
  createDevSession: vi.fn().mockResolvedValue(null),
  getOrganizationId: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/modules/permissions/server/permission-checker", () => ({
  checkGlobalPermission: vi.fn().mockResolvedValue(true),
  checkPermission: vi.fn().mockResolvedValue(true),
  checkIssueSecurityAccess: vi.fn().mockResolvedValue(true),
  resolveProjectPermissions: vi.fn().mockResolvedValue(new Set(["BROWSE_PROJECTS", "CREATE_ISSUES", "EDIT_ISSUES"])),
  invalidatePermissionCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/trpc/init", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/trpc/init")>();
  return {
    ...actual,
    requirePermission: vi.fn(() => actual.protectedProcedure),
    requireGlobalPermission: vi.fn(() => actual.protectedProcedure),
    adminProcedure: actual.protectedProcedure,
  };
});

import * as projectService from "./project-service";
import { appRouter } from "@/server/trpc/router";
import type { TRPCContext } from "@/server/trpc/init";

function createAuthenticatedContext(overrides: Partial<TRPCContext> = {}): TRPCContext {
  return {
    db: {} as TRPCContext["db"],
    session: {
      user: { id: "user-1", name: "Test User", email: "test@test.com" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    },
    organizationId: "org-1",
    requestId: "req-1",
    logger: { child: vi.fn().mockReturnThis(), info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as unknown as TRPCContext["logger"],
    ...overrides,
  };
}

function createUnauthenticatedContext(): TRPCContext {
  return {
    db: {} as TRPCContext["db"],
    session: null,
    organizationId: null,
    requestId: "req-1",
    logger: { child: vi.fn().mockReturnThis(), info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as unknown as TRPCContext["logger"],
  };
}

describe("projectRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());

      await expect(
        trpc.project.list({}),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects requests without organizationId", async () => {
      const trpc = caller(createAuthenticatedContext({ organizationId: null }));

      await expect(
        trpc.project.list({}),
      ).rejects.toThrow(TRPCError);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("calls createProject with correct args", async () => {
      const mockResult = { id: "proj-1", name: "New Project", key: "NEW" };
      vi.mocked(projectService.createProject).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.project.create({
        name: "New Project",
        key: "NEW",
        projectTypeKey: "software",
      });

      expect(result).toEqual(mockResult);
      expect(projectService.createProject).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        expect.objectContaining({
          name: "New Project",
          key: "NEW",
          projectTypeKey: "software",
        }),
      );
    });

    it("rejects invalid input (missing key)", async () => {
      const trpc = caller(createAuthenticatedContext());

      await expect(
        // @ts-expect-error - intentionally passing invalid input
        trpc.project.create({ name: "Test", projectTypeKey: "software" }),
      ).rejects.toThrow();
    });
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe("list", () => {
    it("calls listProjects with correct args", async () => {
      const mockResult = { items: [], total: 0 };
      vi.mocked(projectService.listProjects).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.project.list({});

      expect(result).toEqual(mockResult);
      expect(projectService.listProjects).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ limit: 50, isArchived: false }),
      );
    });
  });

  // ── getById ─────────────────────────────────────────────────────────────────

  describe("getById", () => {
    it("calls getProject with id", async () => {
      const mockResult = { id: "proj-1", key: "TEST" };
      vi.mocked(projectService.getProject).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.project.getById({ id: "proj-1" });

      expect(result).toEqual(mockResult);
      expect(projectService.getProject).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        { id: "proj-1" },
      );
    });
  });

  // ── getByKey ────────────────────────────────────────────────────────────────

  describe("getByKey", () => {
    it("calls getProject with key", async () => {
      const mockResult = { id: "proj-1", key: "TEST" };
      vi.mocked(projectService.getProject).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.project.getByKey({ key: "TEST" });

      expect(result).toEqual(mockResult);
      expect(projectService.getProject).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        { key: "TEST" },
      );
    });
  });

  // ── archive ─────────────────────────────────────────────────────────────────

  describe("archive", () => {
    it("calls archiveProject with correct args", async () => {
      const mockResult = { id: "proj-1", isArchived: true };
      vi.mocked(projectService.archiveProject).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      await trpc.project.archive({ id: "proj-1" });

      expect(projectService.archiveProject).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        "proj-1",
      );
    });
  });

  // ── addMember ───────────────────────────────────────────────────────────────

  describe("addMember", () => {
    it("calls addMember with correct args", async () => {
      const mockResult = { id: "pm-1", projectId: "proj-1", userId: "user-2" };
      vi.mocked(projectService.addMember).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      await trpc.project.addMember({
        projectId: "proj-1",
        userId: "user-2",
        roleId: "developer",
      });

      expect(projectService.addMember).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({
          projectId: "proj-1",
          userId: "user-2",
          roleId: "developer",
        }),
      );
    });
  });
});
