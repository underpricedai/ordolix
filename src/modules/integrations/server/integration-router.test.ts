/**
 * Tests for integration router.
 * @module integrations/server/integration-router-test
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("@/integrations/github/github-service", () => ({
  getConfig: vi.fn(),
  upsertConfig: vi.fn(),
  deleteConfig: vi.fn(),
  regenerateWebhookSecret: vi.fn(),
  getLinksForIssue: vi.fn(),
  deleteLink: vi.fn(),
  getRecentLinks: vi.fn(),
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

vi.mock("@/server/trpc/init", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/trpc/init")>();
  return {
    ...actual,
    requirePermission: vi.fn(() => actual.protectedProcedure),
    requireGlobalPermission: vi.fn(() => actual.protectedProcedure),
    adminProcedure: actual.protectedProcedure,
  };
});

import * as githubService from "@/integrations/github/github-service";
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

describe("integrationRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());

      await expect(
        trpc.integration.getGitHubConfig(),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects requests without organizationId", async () => {
      const trpc = caller(createAuthenticatedContext({ organizationId: null }));

      await expect(
        trpc.integration.getGitHubConfig(),
      ).rejects.toThrow(TRPCError);
    });
  });

  // ── getGitHubConfig ─────────────────────────────────────────────────────────

  describe("getGitHubConfig", () => {
    it("returns config from service", async () => {
      const mockConfig = {
        id: "cfg-1",
        provider: "github",
        config: { owner: "acme", repo: "app" },
        isActive: true,
        webhookSecret: "secret-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(githubService.getConfig).mockResolvedValue(mockConfig);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.integration.getGitHubConfig();

      expect(result).toEqual(mockConfig);
      expect(githubService.getConfig).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
      );
    });
  });

  // ── upsertGitHubConfig ──────────────────────────────────────────────────────

  describe("upsertGitHubConfig", () => {
    it("calls upsertConfig with correct args", async () => {
      const mockResult = { id: "cfg-1", provider: "github" };
      vi.mocked(githubService.upsertConfig).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.integration.upsertGitHubConfig({
        owner: "acme",
        repo: "app",
        autoLink: true,
      });

      expect(result).toEqual(mockResult);
      expect(githubService.upsertConfig).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({ owner: "acme", repo: "app", autoLink: true }),
      );
    });
  });

  // ── deleteGitHubConfig ──────────────────────────────────────────────────────

  describe("deleteGitHubConfig", () => {
    it("calls deleteConfig with correct args", async () => {
      vi.mocked(githubService.deleteConfig).mockResolvedValue(undefined as never);

      const trpc = caller(createAuthenticatedContext());
      await trpc.integration.deleteGitHubConfig();

      expect(githubService.deleteConfig).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
      );
    });
  });

  // ── regenerateWebhookSecret ─────────────────────────────────────────────────

  describe("regenerateWebhookSecret", () => {
    it("calls regenerateWebhookSecret with correct args", async () => {
      const mockResult = { id: "cfg-1", webhookSecret: "new-secret" };
      vi.mocked(githubService.regenerateWebhookSecret).mockResolvedValue(mockResult as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.integration.regenerateWebhookSecret();

      expect(result).toEqual(mockResult);
      expect(githubService.regenerateWebhookSecret).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
      );
    });
  });

  // ── getLinksForIssue ────────────────────────────────────────────────────────

  describe("getLinksForIssue", () => {
    it("returns links for an issue", async () => {
      const mockLinks = [
        { id: "link-1", resourceType: "pull_request", owner: "acme", repo: "app", number: 42 },
        { id: "link-2", resourceType: "commit", owner: "acme", repo: "app", sha: "abc1234" },
      ];
      vi.mocked(githubService.getLinksForIssue).mockResolvedValue(mockLinks as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.integration.getLinksForIssue({ issueId: "issue-1" });

      expect(result).toEqual(mockLinks);
      expect(githubService.getLinksForIssue).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "issue-1",
      );
    });
  });

  // ── deleteLink ──────────────────────────────────────────────────────────────

  describe("deleteLink", () => {
    it("calls deleteLink with correct args", async () => {
      vi.mocked(githubService.deleteLink).mockResolvedValue(undefined as never);

      const trpc = caller(createAuthenticatedContext());
      await trpc.integration.deleteLink({ linkId: "link-1" });

      expect(githubService.deleteLink).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "link-1",
      );
    });
  });

  // ── getRecentLinks ──────────────────────────────────────────────────────────

  describe("getRecentLinks", () => {
    it("returns recent links with default limit", async () => {
      const mockLinks = [{ id: "link-1" }];
      vi.mocked(githubService.getRecentLinks).mockResolvedValue(mockLinks as never);

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.integration.getRecentLinks({});

      expect(result).toEqual(mockLinks);
      expect(githubService.getRecentLinks).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        undefined,
      );
    });

    it("passes custom limit to service", async () => {
      vi.mocked(githubService.getRecentLinks).mockResolvedValue([] as never);

      const trpc = caller(createAuthenticatedContext());
      await trpc.integration.getRecentLinks({ limit: 50 });

      expect(githubService.getRecentLinks).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        50,
      );
    });
  });
});
