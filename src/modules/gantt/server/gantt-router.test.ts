import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./gantt-service", () => ({
  addDependency: vi.fn(),
  removeDependency: vi.fn(),
  getGanttData: vi.fn(),
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

import * as ganttService from "./gantt-service";
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

describe("ganttRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());
      await expect(
        trpc.gantt.getData({ projectId: "proj-1" }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects requests without organizationId", async () => {
      const trpc = caller(
        createAuthenticatedContext({ organizationId: null }),
      );
      await expect(
        trpc.gantt.getData({ projectId: "proj-1" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("addDependency", () => {
    it("calls addDependency with correct args", async () => {
      const mockResult = { id: "dep-1", sourceIssueId: "issue-1" };
      vi.mocked(ganttService.addDependency).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.gantt.addDependency({
        sourceIssueId: "issue-1",
        targetIssueId: "issue-2",
        dependencyType: "FS",
        lag: 0,
      });

      expect(result).toEqual(mockResult);
      expect(ganttService.addDependency).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({
          sourceIssueId: "issue-1",
          targetIssueId: "issue-2",
        }),
      );
    });
  });

  describe("removeDependency", () => {
    it("calls removeDependency with correct args", async () => {
      vi.mocked(ganttService.removeDependency).mockResolvedValue(
        undefined as never,
      );

      const trpc = caller(createAuthenticatedContext());
      await trpc.gantt.removeDependency({ id: "dep-1" });

      expect(ganttService.removeDependency).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "dep-1",
      );
    });
  });

  describe("getData", () => {
    it("calls getGanttData with correct args", async () => {
      const mockResult = { issues: [] };
      vi.mocked(ganttService.getGanttData).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.gantt.getData({ projectId: "proj-1" });

      expect(result).toEqual(mockResult);
      expect(ganttService.getGanttData).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ projectId: "proj-1" }),
      );
    });
  });
});
