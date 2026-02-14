import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./sla-service", () => ({
  createSLAConfig: vi.fn(),
  updateSLAConfig: vi.fn(),
  listSLAConfigs: vi.fn(),
  getSLAConfig: vi.fn(),
  deleteSLAConfig: vi.fn(),
  startSLA: vi.fn(),
  pauseSLA: vi.fn(),
  resumeSLA: vi.fn(),
  completeSLA: vi.fn(),
  getSLAInstances: vi.fn(),
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

import * as slaService from "./sla-service";
import { slaRouter } from "./sla-router";
import { createRouter } from "@/server/trpc/init";
import type { TRPCContext } from "@/server/trpc/init";

const testRouter = createRouter({ sla: slaRouter });

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

describe("slaRouter", () => {
  const caller = testRouter.createCaller;

  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects unauthenticated requests", async () => {
    const trpc = caller(createUnauthenticatedContext());
    await expect(
      trpc.sla.listConfigs({}),
    ).rejects.toThrow(TRPCError);
  });

  it("createConfig calls createSLAConfig", async () => {
    vi.mocked(slaService.createSLAConfig).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.sla.createConfig({
      name: "Response SLA",
      metric: "time_to_first_response",
      targetDuration: 60,
      startCondition: { event: "issue_created" },
      stopCondition: { event: "first_response" },
    });

    expect(slaService.createSLAConfig).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({
        name: "Response SLA",
        metric: "time_to_first_response",
        targetDuration: 60,
      }),
    );
  });

  it("listConfigs calls listSLAConfigs", async () => {
    vi.mocked(slaService.listSLAConfigs).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.sla.listConfigs({});

    expect(slaService.listSLAConfigs).toHaveBeenCalledWith(
      expect.anything(), "org-1", expect.objectContaining({}),
    );
  });

  it("start calls startSLA", async () => {
    vi.mocked(slaService.startSLA).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.sla.start({ slaConfigId: "config-1", issueId: "issue-1" });

    expect(slaService.startSLA).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ slaConfigId: "config-1", issueId: "issue-1" }),
    );
  });

  it("pause calls pauseSLA with instanceId", async () => {
    vi.mocked(slaService.pauseSLA).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.sla.pause({ instanceId: "inst-1" });

    expect(slaService.pauseSLA).toHaveBeenCalledWith(
      expect.anything(), "org-1", "inst-1",
    );
  });

  it("complete calls completeSLA with instanceId", async () => {
    vi.mocked(slaService.completeSLA).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.sla.complete({ instanceId: "inst-1" });

    expect(slaService.completeSLA).toHaveBeenCalledWith(
      expect.anything(), "org-1", "inst-1",
    );
  });

  it("getInstances calls getSLAInstances", async () => {
    vi.mocked(slaService.getSLAInstances).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.sla.getInstances({ issueId: "issue-1" });

    expect(slaService.getSLAInstances).toHaveBeenCalledWith(
      expect.anything(), "org-1", "issue-1",
      expect.objectContaining({ issueId: "issue-1" }),
    );
  });
});
