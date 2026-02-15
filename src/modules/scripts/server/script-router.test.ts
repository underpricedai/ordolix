import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./script-service", () => ({
  createScript: vi.fn(),
  getScript: vi.fn(),
  listScripts: vi.fn(),
  updateScript: vi.fn(),
  deleteScript: vi.fn(),
  executeScript: vi.fn(),
  listExecutions: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
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

vi.mock("@/modules/permissions/server/permission-checker", () => ({
  checkGlobalPermission: vi.fn().mockResolvedValue(true),
  checkPermission: vi.fn().mockResolvedValue(true),
  checkIssueSecurityAccess: vi.fn().mockResolvedValue(true),
  resolveProjectPermissions: vi.fn().mockResolvedValue(new Set(["BROWSE_PROJECTS", "CREATE_ISSUES", "EDIT_ISSUES"])),
  invalidatePermissionCache: vi.fn().mockResolvedValue(undefined),
}));

import * as scriptService from "./script-service";
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
      child: vi.fn().mockReturnThis(), info: vi.fn(), error: vi.fn(),
      warn: vi.fn(), debug: vi.fn(),
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
      child: vi.fn().mockReturnThis(), info: vi.fn(), error: vi.fn(),
      warn: vi.fn(), debug: vi.fn(),
    } as unknown as TRPCContext["logger"],
  };
}

describe("scriptRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects unauthenticated requests", async () => {
    const trpc = caller(createUnauthenticatedContext());
    await expect(
      trpc.script.list({}),
    ).rejects.toThrow(TRPCError);
  });

  it("create calls createScript", async () => {
    vi.mocked(scriptService.createScript).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.script.create({
      name: "Test Script",
      triggerType: "manual",
      code: "return 1",
    });

    expect(scriptService.createScript).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ name: "Test Script", triggerType: "manual" }),
    );
  });

  it("list calls listScripts", async () => {
    vi.mocked(scriptService.listScripts).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.script.list({});

    expect(scriptService.listScripts).toHaveBeenCalledWith(
      expect.anything(), "org-1", expect.any(Object),
    );
  });

  it("execute calls executeScript with userId", async () => {
    vi.mocked(scriptService.executeScript).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.script.execute({ scriptId: "script-1" });

    expect(scriptService.executeScript).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1",
      expect.objectContaining({ scriptId: "script-1" }),
    );
  });

  it("delete calls deleteScript", async () => {
    vi.mocked(scriptService.deleteScript).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.script.delete({ id: "script-1" });

    expect(scriptService.deleteScript).toHaveBeenCalledWith(
      expect.anything(), "org-1", "script-1",
    );
  });
});
