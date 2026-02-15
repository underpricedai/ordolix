import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./queue-service", () => ({
  createQueue: vi.fn(),
  updateQueue: vi.fn(),
  listQueues: vi.fn(),
  getQueue: vi.fn(),
  getQueueIssues: vi.fn(),
  deleteQueue: vi.fn(),
  assignFromQueue: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/server/db", () => ({ db: {} }));

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

import * as queueService from "./queue-service";
import { appRouter } from "@/server/trpc/router";
import type { TRPCContext } from "@/server/trpc/init";

function createAuthenticatedContext(
  overrides: Partial<TRPCContext> = {},
): TRPCContext {
  return {
    db: {} as TRPCContext["db"],
    session: {
      user: { id: "user-1", name: "Test User", email: "test@test.com" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    },
    organizationId: "org-1",
    requestId: "req-1",
    logger: {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as TRPCContext["logger"],
    ...overrides,
  };
}

function createUnauthenticatedContext(): TRPCContext {
  return {
    db: {} as TRPCContext["db"],
    session: null,
    organizationId: null,
    requestId: "req-1",
    logger: {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as TRPCContext["logger"],
  };
}

describe("queueRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());
      await expect(
        trpc.queue.getById({ id: "queue-1" }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects requests without organizationId", async () => {
      const trpc = caller(
        createAuthenticatedContext({ organizationId: null }),
      );
      await expect(
        trpc.queue.getById({ id: "queue-1" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("create", () => {
    it("calls createQueue with correct args", async () => {
      const mockResult = { id: "queue-1", name: "Support Queue" };
      vi.mocked(queueService.createQueue).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.queue.create({
        projectId: "proj-1",
        name: "Support Queue",
        filter: { priorityIds: ["pri-high"] },
      });

      expect(result).toEqual(mockResult);
      expect(queueService.createQueue).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        expect.objectContaining({
          projectId: "proj-1",
          name: "Support Queue",
        }),
      );
    });
  });

  describe("list", () => {
    it("calls listQueues with correct args", async () => {
      const mockResult = [{ id: "queue-1", _count: { issues: 5 } }];
      vi.mocked(queueService.listQueues).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.queue.list({ projectId: "proj-1" });

      expect(result).toEqual(mockResult);
      expect(queueService.listQueues).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ projectId: "proj-1" }),
      );
    });
  });

  describe("getIssues", () => {
    it("calls getQueueIssues with correct args", async () => {
      const mockResult = { issues: [], nextCursor: undefined };
      vi.mocked(queueService.getQueueIssues).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.queue.getIssues({ queueId: "queue-1" });

      expect(result).toEqual(mockResult);
      expect(queueService.getQueueIssues).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ queueId: "queue-1" }),
      );
    });
  });

  describe("assign", () => {
    it("calls assignFromQueue with correct args", async () => {
      const mockResult = { id: "issue-1", assigneeId: "user-2" };
      vi.mocked(queueService.assignFromQueue).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.queue.assign({
        issueId: "issue-1",
        assigneeId: "user-2",
      });

      expect(result).toEqual(mockResult);
      expect(queueService.assignFromQueue).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        expect.objectContaining({
          issueId: "issue-1",
          assigneeId: "user-2",
        }),
      );
    });
  });

  describe("delete", () => {
    it("calls deleteQueue with correct args", async () => {
      vi.mocked(queueService.deleteQueue).mockResolvedValue(
        undefined as never,
      );

      const trpc = caller(createAuthenticatedContext());
      await trpc.queue.delete({ id: "queue-1" });

      expect(queueService.deleteQueue).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "queue-1",
      );
    });
  });
});
