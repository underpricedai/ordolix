import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock the workflow engine module
vi.mock("./workflow-engine", () => ({
  getWorkflowForProject: vi.fn(),
  getAvailableTransitions: vi.fn(),
  transitionIssue: vi.fn(),
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

import * as workflowEngine from "./workflow-engine";
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

describe("workflowRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());

      await expect(
        trpc.workflow.getAvailableTransitions({ issueId: "issue-1" }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects requests without organizationId", async () => {
      const trpc = caller(
        createAuthenticatedContext({ organizationId: null }),
      );

      await expect(
        trpc.workflow.getAvailableTransitions({ issueId: "issue-1" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  // ── transition ────────────────────────────────────────────────────────────

  describe("transition", () => {
    it("calls transitionIssue with correct args", async () => {
      const mockResult = { id: "issue-1", statusId: "status-ip" };
      vi.mocked(workflowEngine.transitionIssue).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.workflow.transition({
        issueId: "issue-1",
        transitionId: "trans-1",
      });

      expect(result).toEqual(mockResult);
      expect(workflowEngine.transitionIssue).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        "issue-1",
        "trans-1",
      );
    });

    it("rejects invalid input", async () => {
      const trpc = caller(createAuthenticatedContext());

      await expect(
        // @ts-expect-error - intentionally passing invalid input
        trpc.workflow.transition({ issueId: "issue-1" }),
      ).rejects.toThrow();
    });
  });

  // ── getAvailableTransitions ───────────────────────────────────────────────

  describe("getAvailableTransitions", () => {
    it("calls service with correct args", async () => {
      const mockResult = [{ id: "trans-1", name: "Start", toStatus: {} }];
      vi.mocked(workflowEngine.getAvailableTransitions).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.workflow.getAvailableTransitions({
        issueId: "issue-1",
      });

      expect(result).toEqual(mockResult);
      expect(workflowEngine.getAvailableTransitions).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "issue-1",
      );
    });
  });

  // ── getWorkflowForProject ─────────────────────────────────────────────────

  describe("getWorkflowForProject", () => {
    it("calls service with correct args", async () => {
      const mockResult = { id: "wf-1", name: "Default" };
      vi.mocked(workflowEngine.getWorkflowForProject).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.workflow.getWorkflowForProject({
        projectId: "proj-1",
      });

      expect(result).toEqual(mockResult);
      expect(workflowEngine.getWorkflowForProject).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "proj-1",
      );
    });
  });
});
