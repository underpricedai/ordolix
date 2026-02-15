import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/shared/lib/scheme-sharing-service", () => ({
  isSchemeShared: vi.fn(),
  forkScheme: vi.fn(),
  cloneSchemeIndependent: vi.fn(),
  SCHEME_TYPES: [
    "permissionScheme",
    "workflow",
    "issueTypeScheme",
    "fieldConfigurationScheme",
    "notificationScheme",
    "issueSecurityScheme",
    "componentScheme",
  ] as const,
}));

vi.mock("@/modules/permissions/server/permission-scheme-adapter", () => ({
  permissionSchemeAdapter: { schemeType: "PermissionScheme" },
}));
vi.mock("@/modules/workflows/server/workflow-scheme-adapter", () => ({
  workflowSchemeAdapter: { schemeType: "Workflow" },
}));
vi.mock("@/modules/admin/server/issue-type-scheme-adapter", () => ({
  issueTypeSchemeAdapter: { schemeType: "IssueTypeScheme" },
}));
vi.mock("@/modules/custom-fields/server/field-config-scheme-adapter", () => ({
  fieldConfigSchemeAdapter: { schemeType: "FieldConfigurationScheme" },
}));
vi.mock("@/modules/notifications/server/notification-scheme-adapter", () => ({
  notificationSchemeAdapter: { schemeType: "NotificationScheme" },
}));
vi.mock("@/modules/permissions/server/issue-security-scheme-adapter", () => ({
  issueSecuritySchemeAdapter: { schemeType: "IssueSecurityScheme" },
}));
vi.mock("@/modules/projects/server/component-scheme-adapter", () => ({
  componentSchemeAdapter: { schemeType: "ComponentScheme" },
}));

vi.mock("@/modules/permissions/server/permission-checker", () => ({
  checkPermission: vi.fn().mockResolvedValue(true),
  checkGlobalPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/server/trpc/init", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/server/trpc/init")>();
  return {
    ...orig,
    adminProcedure: orig.protectedProcedure,
    requirePermission: () => orig.protectedProcedure,
    requireGlobalPermission: () => orig.protectedProcedure,
  };
});

vi.mock("@/server/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/server/db", () => ({ db: {} }));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(),
    }),
  },
}));

vi.mock("@/server/trpc/dev-auth", () => ({
  createDevSession: vi.fn().mockResolvedValue(null),
  getOrganizationId: vi.fn().mockResolvedValue(null),
}));

import * as schemeSvc from "@/shared/lib/scheme-sharing-service";
import { appRouter } from "@/server/trpc/router";
import type { TRPCContext } from "@/server/trpc/init";

function createAuthCtx(overrides: Partial<TRPCContext> = {}): TRPCContext {
  return {
    db: {} as TRPCContext["db"],
    session: {
      user: { id: "user-1", name: "Admin", email: "admin@test.com" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    },
    organizationId: "org-1",
    requestId: "req-1",
    logger: {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(),
    } as unknown as TRPCContext["logger"],
    ...overrides,
  };
}

describe("schemeRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkSharing", () => {
    it("returns sharing status for a valid scheme type", async () => {
      vi.mocked(schemeSvc.isSchemeShared).mockResolvedValue({
        shared: true,
        projectCount: 3,
      });

      const caller = appRouter.createCaller(createAuthCtx());
      const result = await caller.scheme.checkSharing({
        schemeType: "permissionScheme",
        schemeId: "scheme-1",
      });

      expect(result).toEqual({ shared: true, projectCount: 3 });
      expect(schemeSvc.isSchemeShared).toHaveBeenCalledWith(
        expect.objectContaining({ schemeType: "PermissionScheme" }),
        expect.anything(),
        "scheme-1",
        "org-1",
      );
    });

    it("rejects unauthenticated requests", async () => {
      const caller = appRouter.createCaller({
        ...createAuthCtx(),
        session: null,
        organizationId: null,
      });

      await expect(
        caller.scheme.checkSharing({
          schemeType: "workflow",
          schemeId: "wf-1",
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("fork", () => {
    it("forks a scheme and returns clone", async () => {
      const clone = { id: "clone-1", name: "Forked" };
      vi.mocked(schemeSvc.forkScheme).mockResolvedValue(clone);

      const caller = appRouter.createCaller(createAuthCtx());
      const result = await caller.scheme.fork({
        schemeType: "issueTypeScheme",
        schemeId: "its-1",
        projectId: "proj-1",
      });

      expect(result).toEqual(clone);
      expect(schemeSvc.forkScheme).toHaveBeenCalledWith(
        expect.objectContaining({ schemeType: "IssueTypeScheme" }),
        expect.anything(),
        "its-1",
        "proj-1",
        "org-1",
      );
    });
  });

  describe("clone", () => {
    it("clones a scheme independently", async () => {
      const clone = { id: "clone-2", name: "My Copy" };
      vi.mocked(schemeSvc.cloneSchemeIndependent).mockResolvedValue(clone);

      const caller = appRouter.createCaller(createAuthCtx());
      const result = await caller.scheme.clone({
        schemeType: "notificationScheme",
        sourceId: "ns-1",
        newName: "My Copy",
      });

      expect(result).toEqual(clone);
      expect(schemeSvc.cloneSchemeIndependent).toHaveBeenCalledWith(
        expect.objectContaining({ schemeType: "NotificationScheme" }),
        expect.anything(),
        "ns-1",
        "My Copy",
        "org-1",
      );
    });
  });
});
