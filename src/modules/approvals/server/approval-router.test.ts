import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./approval-service", () => ({
  requestApproval: vi.fn(),
  getApprovals: vi.fn(),
  decide: vi.fn(),
  getPendingApprovals: vi.fn(),
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

import * as approvalService from "./approval-service";
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

describe("approvalRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects unauthenticated requests", async () => {
    const trpc = caller(createUnauthenticatedContext());
    await expect(
      trpc.approval.list({ issueId: "issue-1" }),
    ).rejects.toThrow(TRPCError);
  });

  it("request calls requestApproval", async () => {
    vi.mocked(approvalService.requestApproval).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.approval.request({ issueId: "issue-1", approverId: "user-2" });

    expect(approvalService.requestApproval).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ issueId: "issue-1", approverId: "user-2" }),
    );
  });

  it("list calls getApprovals", async () => {
    vi.mocked(approvalService.getApprovals).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.approval.list({ issueId: "issue-1" });

    expect(approvalService.getApprovals).toHaveBeenCalledWith(
      expect.anything(), "org-1", "issue-1",
    );
  });

  it("decide calls service with userId", async () => {
    vi.mocked(approvalService.decide).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.approval.decide({ id: "appr-1", decision: "approved" });

    expect(approvalService.decide).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1", "appr-1", "approved", undefined,
    );
  });

  it("pending calls getPendingApprovals with userId", async () => {
    vi.mocked(approvalService.getPendingApprovals).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.approval.pending({});

    expect(approvalService.getPendingApprovals).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1",
      expect.objectContaining({ limit: 50 }),
    );
  });
});
