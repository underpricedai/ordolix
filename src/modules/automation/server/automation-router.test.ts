import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./automation-service", () => ({
  createRule: vi.fn(),
  getRule: vi.fn(),
  listRules: vi.fn(),
  updateRule: vi.fn(),
  deleteRule: vi.fn(),
  executeRule: vi.fn(),
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

import * as automationService from "./automation-service";
import { createRouter } from "@/server/trpc/init";
import { automationRouter } from "./automation-router";
import type { TRPCContext } from "@/server/trpc/init";

const testRouter = createRouter({ automation: automationRouter });

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

describe("automationRouter", () => {
  const caller = testRouter.createCaller;

  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects unauthenticated requests", async () => {
    const trpc = caller(createUnauthenticatedContext());
    await expect(
      trpc.automation.list({}),
    ).rejects.toThrow(TRPCError);
  });

  it("create calls createRule", async () => {
    vi.mocked(automationService.createRule).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.automation.create({
      name: "Test Rule",
      trigger: { type: "issue_created" },
      actions: [{ type: "set_field", config: { field: "assignee", value: "u1" } }],
    });

    expect(automationService.createRule).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1",
      expect.objectContaining({ name: "Test Rule" }),
    );
  });

  it("getById calls getRule", async () => {
    vi.mocked(automationService.getRule).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.automation.getById({ id: "rule-1" });

    expect(automationService.getRule).toHaveBeenCalledWith(
      expect.anything(), "org-1", "rule-1",
    );
  });

  it("list calls listRules", async () => {
    vi.mocked(automationService.listRules).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.automation.list({ isActive: true });

    expect(automationService.listRules).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ isActive: true }),
    );
  });

  it("update calls updateRule", async () => {
    vi.mocked(automationService.updateRule).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.automation.update({ id: "rule-1", isActive: false });

    expect(automationService.updateRule).toHaveBeenCalledWith(
      expect.anything(), "org-1", "rule-1",
      expect.objectContaining({ id: "rule-1", isActive: false }),
    );
  });

  it("delete calls deleteRule", async () => {
    vi.mocked(automationService.deleteRule).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.automation.delete({ id: "rule-1" });

    expect(automationService.deleteRule).toHaveBeenCalledWith(
      expect.anything(), "org-1", "rule-1",
    );
  });

  it("execute calls executeRule", async () => {
    vi.mocked(automationService.executeRule).mockResolvedValue({
      executed: true,
      actionsRun: 2,
    } as never);
    const trpc = caller(createAuthenticatedContext());
    const result = await trpc.automation.execute({
      ruleId: "rule-1",
      issueId: "issue-1",
    });

    expect(result.executed).toBe(true);
    expect(automationService.executeRule).toHaveBeenCalledWith(
      expect.anything(), "org-1", "rule-1", "issue-1",
    );
  });
});
