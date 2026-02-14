import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./test-management-service", () => ({
  createTestSuite: vi.fn(),
  getTestSuite: vi.fn(),
  listTestSuites: vi.fn(),
  updateTestSuite: vi.fn(),
  deleteTestSuite: vi.fn(),
  createTestCase: vi.fn(),
  getTestCase: vi.fn(),
  listTestCases: vi.fn(),
  updateTestCase: vi.fn(),
  deleteTestCase: vi.fn(),
  createTestRun: vi.fn(),
  getTestRun: vi.fn(),
  listTestRuns: vi.fn(),
  updateTestRunStatus: vi.fn(),
  deleteTestRun: vi.fn(),
  recordTestResult: vi.fn(),
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

import * as tmService from "./test-management-service";
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

describe("testManagementRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects unauthenticated requests", async () => {
    const trpc = caller(createUnauthenticatedContext());
    await expect(trpc.testManagement.listSuites()).rejects.toThrow(TRPCError);
  });

  it("createSuite calls service", async () => {
    vi.mocked(tmService.createTestSuite).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.testManagement.createSuite({ name: "Suite" });

    expect(tmService.createTestSuite).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ name: "Suite" }),
    );
  });

  it("createCase calls service", async () => {
    vi.mocked(tmService.createTestCase).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.testManagement.createCase({
      testSuiteId: "suite-1",
      title: "Test",
    });

    expect(tmService.createTestCase).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ testSuiteId: "suite-1" }),
    );
  });

  it("createRun passes userId", async () => {
    vi.mocked(tmService.createTestRun).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.testManagement.createRun({
      name: "Run",
      testCaseIds: ["tc-1"],
    });

    expect(tmService.createTestRun).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1",
      expect.objectContaining({ name: "Run" }),
    );
  });

  it("recordResult calls service", async () => {
    vi.mocked(tmService.recordTestResult).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.testManagement.recordResult({
      testRunId: "run-1",
      testCaseId: "tc-1",
      status: "passed",
    });

    expect(tmService.recordTestResult).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ testRunId: "run-1", status: "passed" }),
    );
  });
});
