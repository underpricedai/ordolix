import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./checklist-service", () => ({
  createChecklist: vi.fn(),
  getChecklists: vi.fn(),
  updateChecklist: vi.fn(),
  deleteChecklist: vi.fn(),
  addItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
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

import * as checklistService from "./checklist-service";
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

describe("checklistRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());
      await expect(
        trpc.checklist.list({ issueId: "issue-1" }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects requests without organizationId", async () => {
      const trpc = caller(
        createAuthenticatedContext({ organizationId: null }),
      );
      await expect(
        trpc.checklist.list({ issueId: "issue-1" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("create", () => {
    it("calls createChecklist with correct args", async () => {
      const mockResult = { id: "cl-1", title: "Checklist" };
      vi.mocked(checklistService.createChecklist).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.checklist.create({
        issueId: "issue-1",
        title: "Release Checklist",
      });

      expect(result).toEqual(mockResult);
      expect(checklistService.createChecklist).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ issueId: "issue-1", title: "Release Checklist" }),
      );
    });
  });

  describe("list", () => {
    it("calls getChecklists with correct args", async () => {
      const mockResult = [{ id: "cl-1", items: [] }];
      vi.mocked(checklistService.getChecklists).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.checklist.list({ issueId: "issue-1" });

      expect(result).toEqual(mockResult);
      expect(checklistService.getChecklists).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "issue-1",
      );
    });
  });

  describe("update", () => {
    it("calls updateChecklist separating id from updates", async () => {
      const mockResult = { id: "cl-1", title: "Renamed" };
      vi.mocked(checklistService.updateChecklist).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      await trpc.checklist.update({ id: "cl-1", title: "Renamed" });

      expect(checklistService.updateChecklist).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "cl-1",
        { title: "Renamed" },
      );
    });
  });

  describe("delete", () => {
    it("calls deleteChecklist with correct args", async () => {
      vi.mocked(checklistService.deleteChecklist).mockResolvedValue(
        undefined as never,
      );

      const trpc = caller(createAuthenticatedContext());
      await trpc.checklist.delete({ id: "cl-1" });

      expect(checklistService.deleteChecklist).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "cl-1",
      );
    });
  });

  describe("addItem", () => {
    it("calls addItem with correct args", async () => {
      const mockResult = { id: "item-1", text: "Do something" };
      vi.mocked(checklistService.addItem).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.checklist.addItem({
        checklistId: "cl-1",
        text: "Do something",
      });

      expect(result).toEqual(mockResult);
      expect(checklistService.addItem).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ checklistId: "cl-1", text: "Do something" }),
      );
    });
  });

  describe("updateItem", () => {
    it("calls updateItem separating id from updates", async () => {
      const mockResult = { id: "item-1", isChecked: true };
      vi.mocked(checklistService.updateItem).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      await trpc.checklist.updateItem({ id: "item-1", isChecked: true });

      expect(checklistService.updateItem).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "item-1",
        { isChecked: true },
      );
    });
  });

  describe("deleteItem", () => {
    it("calls deleteItem with correct args", async () => {
      vi.mocked(checklistService.deleteItem).mockResolvedValue(
        undefined as never,
      );

      const trpc = caller(createAuthenticatedContext());
      await trpc.checklist.deleteItem({ id: "item-1" });

      expect(checklistService.deleteItem).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "item-1",
      );
    });
  });
});
