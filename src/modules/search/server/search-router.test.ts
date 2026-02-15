/**
 * Tests for the Search tRPC router.
 *
 * @module search-router-test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock the search service module
vi.mock("./search-service", () => ({
  search: vi.fn(),
  quickSearch: vi.fn(),
  suggest: vi.fn(),
  saveFilter: vi.fn(),
  updateFilter: vi.fn(),
  listFilters: vi.fn(),
  deleteFilter: vi.fn(),
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

import * as searchService from "./search-service";
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

describe("searchRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());

      await expect(
        trpc.search.search({ query: "test" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  // ── search ────────────────────────────────────────────────────────────────

  describe("search", () => {
    it("calls searchService.search with correct args", async () => {
      const mockResult = { items: [], nextCursor: undefined, total: 0 };
      vi.mocked(searchService.search).mockResolvedValue(mockResult);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.search.search({
        query: 'status = "Open"',
      });

      expect(result).toEqual(mockResult);
      expect(searchService.search).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        expect.objectContaining({ query: 'status = "Open"' }),
      );
    });
  });

  // ── quickSearch ───────────────────────────────────────────────────────────

  describe("quickSearch", () => {
    it("calls searchService.quickSearch with correct args", async () => {
      const mockResult = { issues: [], projects: [] };
      vi.mocked(searchService.quickSearch).mockResolvedValue(mockResult);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.search.quickSearch({ term: "login" });

      expect(result).toEqual(mockResult);
      expect(searchService.quickSearch).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ term: "login" }),
      );
    });
  });

  // ── suggest ───────────────────────────────────────────────────────────────

  describe("suggest", () => {
    it("calls searchService.suggest with correct args", async () => {
      const mockResult = {
        statuses: [],
        users: [],
        priorities: [],
        projects: [],
      };
      vi.mocked(searchService.suggest).mockResolvedValue(mockResult);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.search.suggest({
        partial: "Op",
        field: "status",
      });

      expect(result).toEqual(mockResult);
      expect(searchService.suggest).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ partial: "Op", field: "status" }),
      );
    });
  });

  // ── saveFilter ────────────────────────────────────────────────────────────

  describe("saveFilter", () => {
    it("calls searchService.saveFilter with correct args", async () => {
      const mockFilter = { id: "f-1", name: "My Filter" };
      vi.mocked(searchService.saveFilter).mockResolvedValue(mockFilter as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.search.saveFilter({
        name: "My Filter",
        query: 'status = "Open"',
      });

      expect(result).toEqual(mockFilter);
      expect(searchService.saveFilter).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        expect.objectContaining({
          name: "My Filter",
          query: 'status = "Open"',
        }),
      );
    });
  });

  // ── deleteFilter ──────────────────────────────────────────────────────────

  describe("deleteFilter", () => {
    it("calls searchService.deleteFilter with correct args", async () => {
      vi.mocked(searchService.deleteFilter).mockResolvedValue(undefined);

      const trpc = caller(createAuthenticatedContext());
      await trpc.search.deleteFilter({ id: "filter-1" });

      expect(searchService.deleteFilter).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        "filter-1",
      );
    });
  });

  // ── listFilters ───────────────────────────────────────────────────────────

  describe("listFilters", () => {
    it("calls searchService.listFilters with correct args", async () => {
      const mockFilters = [{ id: "f1" }];
      vi.mocked(searchService.listFilters).mockResolvedValue(mockFilters as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.search.listFilters({
        includeShared: true,
      });

      expect(result).toEqual(mockFilters);
      expect(searchService.listFilters).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        expect.objectContaining({ includeShared: true }),
      );
    });
  });
});
