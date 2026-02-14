import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./time-tracking-service", () => ({
  logTime: vi.fn(),
  getTimeLog: vi.fn(),
  listTimeLogs: vi.fn(),
  updateTimeLog: vi.fn(),
  deleteTimeLog: vi.fn(),
  getIssueTotalTime: vi.fn(),
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

import * as timeTrackingService from "./time-tracking-service";
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

describe("timeTrackingRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());
      await expect(
        trpc.timeTracking.getById({ id: "tl-1" }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects requests without organizationId", async () => {
      const trpc = caller(
        createAuthenticatedContext({ organizationId: null }),
      );
      await expect(
        trpc.timeTracking.getById({ id: "tl-1" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("log", () => {
    it("calls logTime with correct args including userId", async () => {
      const mockResult = { id: "tl-1", duration: 3600 };
      vi.mocked(timeTrackingService.logTime).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.timeTracking.log({
        issueId: "issue-1",
        date: "2026-02-14",
        duration: 3600,
      });

      expect(result).toEqual(mockResult);
      expect(timeTrackingService.logTime).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        expect.objectContaining({ issueId: "issue-1", duration: 3600 }),
      );
    });
  });

  describe("list", () => {
    it("calls listTimeLogs with correct args", async () => {
      const mockResult = { items: [], nextCursor: undefined };
      vi.mocked(timeTrackingService.listTimeLogs).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.timeTracking.list({ issueId: "issue-1" });

      expect(result).toEqual(mockResult);
      expect(timeTrackingService.listTimeLogs).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ issueId: "issue-1" }),
      );
    });
  });

  describe("update", () => {
    it("calls updateTimeLog separating id from updates with userId", async () => {
      const mockResult = { id: "tl-1", duration: 7200 };
      vi.mocked(timeTrackingService.updateTimeLog).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      await trpc.timeTracking.update({ id: "tl-1", duration: 7200 });

      expect(timeTrackingService.updateTimeLog).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        "tl-1",
        { duration: 7200 },
      );
    });
  });

  describe("delete", () => {
    it("calls deleteTimeLog with correct args including userId", async () => {
      vi.mocked(timeTrackingService.deleteTimeLog).mockResolvedValue(
        undefined as never,
      );

      const trpc = caller(createAuthenticatedContext());
      await trpc.timeTracking.delete({ id: "tl-1" });

      expect(timeTrackingService.deleteTimeLog).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        "tl-1",
      );
    });
  });

  describe("issueTotalTime", () => {
    it("calls getIssueTotalTime with correct args", async () => {
      vi.mocked(timeTrackingService.getIssueTotalTime).mockResolvedValue(
        7200 as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.timeTracking.issueTotalTime({
        issueId: "issue-1",
      });

      expect(result).toBe(7200);
      expect(timeTrackingService.getIssueTotalTime).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "issue-1",
      );
    });
  });
});
