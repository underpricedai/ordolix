import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./sprint-service", () => ({
  createSprint: vi.fn(),
  updateSprint: vi.fn(),
  listSprints: vi.fn(),
  getSprint: vi.fn(),
  startSprint: vi.fn(),
  completeSprint: vi.fn(),
  addIssuesToSprint: vi.fn(),
  removeIssuesFromSprint: vi.fn(),
  getVelocity: vi.fn(),
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

import * as sprintService from "./sprint-service";
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

describe("sprintRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());
      await expect(
        trpc.sprint.getById({ id: "sprint-1" }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects requests without organizationId", async () => {
      const trpc = caller(
        createAuthenticatedContext({ organizationId: null }),
      );
      await expect(
        trpc.sprint.getById({ id: "sprint-1" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("create", () => {
    it("calls createSprint with correct args", async () => {
      const mockResult = { id: "sprint-1", name: "Sprint 1" };
      vi.mocked(sprintService.createSprint).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.sprint.create({
        projectId: "proj-1",
        name: "Sprint 1",
      });

      expect(result).toEqual(mockResult);
      expect(sprintService.createSprint).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        expect.objectContaining({ projectId: "proj-1", name: "Sprint 1" }),
      );
    });
  });

  describe("list", () => {
    it("calls listSprints with correct args", async () => {
      const mockResult = [{ id: "s-1", _count: { issues: 5 } }];
      vi.mocked(sprintService.listSprints).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.sprint.list({ projectId: "proj-1" });

      expect(result).toEqual(mockResult);
      expect(sprintService.listSprints).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ projectId: "proj-1" }),
      );
    });
  });

  describe("start", () => {
    it("calls startSprint with correct args", async () => {
      const mockResult = { id: "sprint-1", status: "active" };
      vi.mocked(sprintService.startSprint).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const endDate = new Date("2026-03-14");
      const result = await trpc.sprint.start({
        id: "sprint-1",
        endDate,
      });

      expect(result).toEqual(mockResult);
      expect(sprintService.startSprint).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        expect.objectContaining({ id: "sprint-1" }),
      );
    });
  });

  describe("complete", () => {
    it("calls completeSprint with correct args", async () => {
      const mockResult = { completedCount: 5, movedCount: 2 };
      vi.mocked(sprintService.completeSprint).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.sprint.complete({ id: "sprint-1" });

      expect(result).toEqual(mockResult);
      expect(sprintService.completeSprint).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        expect.objectContaining({ id: "sprint-1" }),
      );
    });
  });

  describe("addIssues", () => {
    it("calls addIssuesToSprint with correct args", async () => {
      const mockResult = { count: 2 };
      vi.mocked(sprintService.addIssuesToSprint).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.sprint.addIssues({
        sprintId: "sprint-1",
        issueIds: ["issue-1", "issue-2"],
      });

      expect(result).toEqual(mockResult);
      expect(sprintService.addIssuesToSprint).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({
          sprintId: "sprint-1",
          issueIds: ["issue-1", "issue-2"],
        }),
      );
    });
  });

  describe("velocity", () => {
    it("calls getVelocity with correct args", async () => {
      const mockResult = [
        { sprintName: "Sprint 1", completedPoints: 21, completedCount: 8 },
      ];
      vi.mocked(sprintService.getVelocity).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.sprint.velocity({
        projectId: "proj-1",
        sprintCount: 5,
      });

      expect(result).toEqual(mockResult);
      expect(sprintService.getVelocity).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ projectId: "proj-1", sprintCount: 5 }),
      );
    });
  });
});
