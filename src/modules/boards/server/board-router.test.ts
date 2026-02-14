import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./board-service", () => ({
  createBoard: vi.fn(),
  getBoard: vi.fn(),
  getBoardData: vi.fn(),
  updateBoard: vi.fn(),
  deleteBoard: vi.fn(),
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

import * as boardService from "./board-service";
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

describe("boardRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());
      await expect(
        trpc.board.getById({ id: "board-1" }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects requests without organizationId", async () => {
      const trpc = caller(
        createAuthenticatedContext({ organizationId: null }),
      );
      await expect(
        trpc.board.getById({ id: "board-1" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("create", () => {
    it("calls createBoard with correct args", async () => {
      const mockResult = { id: "board-1", name: "My Board" };
      vi.mocked(boardService.createBoard).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.board.create({
        projectId: "proj-1",
        name: "My Board",
      });

      expect(result).toEqual(mockResult);
      expect(boardService.createBoard).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ projectId: "proj-1", name: "My Board" }),
      );
    });
  });

  describe("getData", () => {
    it("calls getBoardData with correct args", async () => {
      const mockResult = { board: {}, columns: [] };
      vi.mocked(boardService.getBoardData).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.board.getData({ id: "board-1" });

      expect(result).toEqual(mockResult);
      expect(boardService.getBoardData).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ id: "board-1" }),
      );
    });
  });

  describe("update", () => {
    it("calls updateBoard separating id from updates", async () => {
      const mockResult = { id: "board-1", name: "Renamed" };
      vi.mocked(boardService.updateBoard).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      await trpc.board.update({ id: "board-1", name: "Renamed" });

      expect(boardService.updateBoard).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "board-1",
        { name: "Renamed" },
      );
    });
  });

  describe("delete", () => {
    it("calls deleteBoard with correct args", async () => {
      vi.mocked(boardService.deleteBoard).mockResolvedValue(undefined as never);

      const trpc = caller(createAuthenticatedContext());
      await trpc.board.delete({ id: "board-1" });

      expect(boardService.deleteBoard).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "board-1",
      );
    });
  });
});
