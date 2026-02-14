import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./epic-rollup", () => ({
  getRollup: vi.fn(),
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

import * as epicRollup from "./epic-rollup";
import { createRouter } from "@/server/trpc/init";
import type { TRPCContext } from "@/server/trpc/init";
import { epicRollupRouter } from "./epic-rollup-router";

// Create a test-local router so we don't need to modify the main appRouter
const testRouter = createRouter({
  epicRollup: epicRollupRouter,
});

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

describe("epicRollupRouter", () => {
  const caller = testRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());
      await expect(
        trpc.epicRollup.getRollup({ issueId: "epic-1" }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects requests without organizationId", async () => {
      const trpc = caller(
        createAuthenticatedContext({ organizationId: null }),
      );
      await expect(
        trpc.epicRollup.getRollup({ issueId: "epic-1" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("getRollup", () => {
    it("calls epicRollup.getRollup with correct args", async () => {
      const mockResult = {
        storyPoints: 13,
        originalEstimate: 7200,
        remainingEstimate: 3600,
        timeSpent: 3600,
        childCount: 3,
        doneCount: 1,
        progress: 1 / 3,
      };
      vi.mocked(epicRollup.getRollup).mockResolvedValue(mockResult);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.epicRollup.getRollup({ issueId: "epic-1" });

      expect(result).toEqual(mockResult);
      expect(epicRollup.getRollup).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "epic-1",
      );
    });

    it("validates issueId is non-empty", async () => {
      const trpc = caller(createAuthenticatedContext());
      await expect(
        trpc.epicRollup.getRollup({ issueId: "" }),
      ).rejects.toThrow();
    });
  });
});
