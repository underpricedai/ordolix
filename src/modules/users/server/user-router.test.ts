import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock the user service module
vi.mock("./user-service", () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  updateNotificationPrefs: vi.fn(),
  createApiToken: vi.fn(),
  revokeToken: vi.fn(),
  listTokens: vi.fn(),
  listUsers: vi.fn(),
  inviteUser: vi.fn(),
  updateUserRole: vi.fn(),
  deactivateUser: vi.fn(),
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

import * as userService from "./user-service";
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

describe("userRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());

      await expect(trpc.user.getProfile()).rejects.toThrow(TRPCError);
    });

    it("rejects requests without organizationId", async () => {
      const trpc = caller(createAuthenticatedContext({ organizationId: null }));

      await expect(trpc.user.getProfile()).rejects.toThrow(TRPCError);
    });
  });

  // ── getProfile ──────────────────────────────────────────────────────────────

  describe("getProfile", () => {
    it("calls getProfile with session user id", async () => {
      const mockResult = { id: "user-1", name: "Test User" };
      vi.mocked(userService.getProfile).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.user.getProfile();

      expect(result).toEqual(mockResult);
      expect(userService.getProfile).toHaveBeenCalledWith(
        expect.anything(),
        "user-1",
      );
    });
  });

  // ── updateProfile ───────────────────────────────────────────────────────────

  describe("updateProfile", () => {
    it("calls updateProfile with correct args", async () => {
      const mockResult = { id: "user-1", name: "Updated" };
      vi.mocked(userService.updateProfile).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.user.updateProfile({ name: "Updated" });

      expect(result).toEqual(mockResult);
      expect(userService.updateProfile).toHaveBeenCalledWith(
        expect.anything(),
        "user-1",
        { name: "Updated" },
      );
    });
  });

  // ── createApiToken ──────────────────────────────────────────────────────────

  describe("createApiToken", () => {
    it("calls createApiToken with correct args", async () => {
      const mockResult = { id: "token-1", plainToken: "oxt_abc123" };
      vi.mocked(userService.createApiToken).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.user.createApiToken({ name: "CI Token" });

      expect(result).toEqual(mockResult);
      expect(userService.createApiToken).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        { name: "CI Token" },
      );
    });

    it("rejects invalid input", async () => {
      const trpc = caller(createAuthenticatedContext());

      await expect(
        trpc.user.createApiToken({ name: "" }),
      ).rejects.toThrow();
    });
  });

  // ── listUsers ───────────────────────────────────────────────────────────────

  describe("listUsers", () => {
    it("calls listUsers with correct args", async () => {
      const mockResult = { items: [], total: 0 };
      vi.mocked(userService.listUsers).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.user.listUsers({});

      expect(result).toEqual(mockResult);
      expect(userService.listUsers).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ limit: 50 }),
      );
    });
  });

  // ── inviteUser ──────────────────────────────────────────────────────────────

  describe("inviteUser", () => {
    it("calls inviteUser with correct args", async () => {
      const mockResult = { id: "member-1", userId: "new-user" };
      vi.mocked(userService.inviteUser).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.user.inviteUser({ email: "new@example.com" });

      expect(result).toEqual(mockResult);
      expect(userService.inviteUser).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        { email: "new@example.com" },
      );
    });
  });

  // ── deactivateUser ──────────────────────────────────────────────────────────

  describe("deactivateUser", () => {
    it("calls deactivateUser with correct args", async () => {
      vi.mocked(userService.deactivateUser).mockResolvedValue(undefined as never);

      const trpc = caller(createAuthenticatedContext());
      await trpc.user.deactivateUser({ userId: "target-user" });

      expect(userService.deactivateUser).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        { userId: "target-user" },
      );
    });
  });
});
