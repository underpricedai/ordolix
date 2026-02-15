import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock the issue service module
vi.mock("./issue-service", () => ({
  createIssue: vi.fn(),
  getIssueByKey: vi.fn(),
  listIssues: vi.fn(),
  updateIssue: vi.fn(),
  deleteIssue: vi.fn(),
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

import * as issueService from "./issue-service";
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

describe("issueRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());

      await expect(
        trpc.issue.list({ projectId: "proj-1" }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects requests without organizationId", async () => {
      const trpc = caller(createAuthenticatedContext({ organizationId: null }));

      await expect(
        trpc.issue.list({ projectId: "proj-1" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("calls createIssue with correct args", async () => {
      const mockResult = { id: "issue-1", key: "TEST-1", summary: "New issue" };
      vi.mocked(issueService.createIssue).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.issue.create({
        projectId: "proj-1",
        summary: "New issue",
        issueTypeId: "type-1",
      });

      expect(result).toEqual(mockResult);
      expect(issueService.createIssue).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        expect.objectContaining({
          projectId: "proj-1",
          summary: "New issue",
          issueTypeId: "type-1",
        }),
      );
    });

    it("rejects invalid input", async () => {
      const trpc = caller(createAuthenticatedContext());

      await expect(
        // @ts-expect-error - intentionally passing invalid input
        trpc.issue.create({ summary: "Missing fields" }),
      ).rejects.toThrow();
    });
  });

  // ── getByKey ────────────────────────────────────────────────────────────────

  describe("getByKey", () => {
    it("calls getIssueByKey with correct args", async () => {
      const mockResult = { id: "issue-1", key: "TEST-1" };
      vi.mocked(issueService.getIssueByKey).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.issue.getByKey({ key: "TEST-1" });

      expect(result).toEqual(mockResult);
      expect(issueService.getIssueByKey).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "TEST-1",
      );
    });
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe("list", () => {
    it("calls listIssues with correct args", async () => {
      const mockResult = { items: [], total: 0 };
      vi.mocked(issueService.listIssues).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.issue.list({ projectId: "proj-1" });

      expect(result).toEqual(mockResult);
      expect(issueService.listIssues).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ projectId: "proj-1" }),
      );
    });

    it("passes filter params through", async () => {
      vi.mocked(issueService.listIssues).mockResolvedValue({ items: [], total: 0 } as never);

      const trpc = caller(createAuthenticatedContext());
      await trpc.issue.list({
        projectId: "proj-1",
        statusId: "status-1",
        limit: 25,
        sortBy: "updatedAt",
        sortOrder: "asc",
      });

      expect(issueService.listIssues).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({
          statusId: "status-1",
          limit: 25,
          sortBy: "updatedAt",
          sortOrder: "asc",
        }),
      );
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("calls updateIssue, separating id from updates", async () => {
      const mockResult = { id: "issue-1", summary: "Updated" };
      vi.mocked(issueService.updateIssue).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.issue.update({
        id: "issue-1",
        summary: "Updated",
      });

      expect(result).toEqual(mockResult);
      expect(issueService.updateIssue).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        "issue-1",
        { summary: "Updated" },
      );
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("calls deleteIssue with correct args", async () => {
      vi.mocked(issueService.deleteIssue).mockResolvedValue(undefined as never);

      const trpc = caller(createAuthenticatedContext());
      await trpc.issue.delete({ id: "issue-1" });

      expect(issueService.deleteIssue).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        "issue-1",
      );
    });
  });
});
