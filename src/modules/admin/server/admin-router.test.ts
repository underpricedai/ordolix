import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("@/modules/permissions/server/permission-checker", () => ({
  checkGlobalPermission: vi.fn().mockResolvedValue(true),
  checkPermission: vi.fn().mockResolvedValue(true),
  checkIssueSecurityAccess: vi.fn().mockResolvedValue(true),
  resolveProjectPermissions: vi.fn().mockResolvedValue(new Set(["BROWSE_PROJECTS", "CREATE_ISSUES", "EDIT_ISSUES"])),
  invalidatePermissionCache: vi.fn().mockResolvedValue(undefined),
}));

// Mock the admin service module
vi.mock("./admin-service", () => ({
  getDashboardStats: vi.fn(),
  listAuditLog: vi.fn(),
  listWebhooks: vi.fn(),
  createWebhook: vi.fn(),
  updateWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  getSystemHealth: vi.fn(),
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

import * as adminService from "./admin-service";
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

describe("adminRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());

      await expect(
        trpc.admin.getDashboardStats({}),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects requests without organizationId", async () => {
      const trpc = caller(createAuthenticatedContext({ organizationId: null }));

      await expect(
        trpc.admin.getDashboardStats({}),
      ).rejects.toThrow(TRPCError);
    });
  });

  // ── getDashboardStats ──────────────────────────────────────────────────────

  describe("getDashboardStats", () => {
    it("calls getDashboardStats with correct args", async () => {
      const mockResult = { userCount: 5, projectCount: 3, issueCount: 42, workflowCount: 2 };
      vi.mocked(adminService.getDashboardStats).mockResolvedValue(mockResult);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.admin.getDashboardStats({});

      expect(result).toEqual(mockResult);
      expect(adminService.getDashboardStats).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
      );
    });
  });

  // ── listAuditLog ──────────────────────────────────────────────────────────

  describe("listAuditLog", () => {
    it("calls listAuditLog with correct args", async () => {
      const mockResult = { items: [], nextCursor: undefined };
      vi.mocked(adminService.listAuditLog).mockResolvedValue(mockResult);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.admin.listAuditLog({ action: "CREATED" });

      expect(result).toEqual(mockResult);
      expect(adminService.listAuditLog).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ action: "CREATED" }),
      );
    });
  });

  // ── createWebhook ──────────────────────────────────────────────────────────

  describe("createWebhook", () => {
    it("calls createWebhook with correct args", async () => {
      const mockResult = { id: "wh-1", url: "https://example.com/hook" };
      vi.mocked(adminService.createWebhook).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.admin.createWebhook({
        url: "https://example.com/hook",
        events: ["issue.created"],
      });

      expect(result).toEqual(mockResult);
      expect(adminService.createWebhook).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        expect.objectContaining({
          url: "https://example.com/hook",
          events: ["issue.created"],
        }),
      );
    });
  });

  // ── deleteWebhook ──────────────────────────────────────────────────────────

  describe("deleteWebhook", () => {
    it("calls deleteWebhook with correct args", async () => {
      vi.mocked(adminService.deleteWebhook).mockResolvedValue(undefined as never);

      const trpc = caller(createAuthenticatedContext());
      await trpc.admin.deleteWebhook({ id: "wh-1" });

      expect(adminService.deleteWebhook).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "wh-1",
      );
    });
  });

  // ── getSystemHealth ────────────────────────────────────────────────────────

  describe("getSystemHealth", () => {
    it("calls getSystemHealth with correct args", async () => {
      const mockResult = { database: "healthy" as const, cache: "healthy" as const, queue: "healthy" as const, timestamp: new Date() };
      vi.mocked(adminService.getSystemHealth).mockResolvedValue(mockResult);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.admin.getSystemHealth({});

      expect(result).toEqual(mockResult);
      expect(adminService.getSystemHealth).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
      );
    });
  });
});
