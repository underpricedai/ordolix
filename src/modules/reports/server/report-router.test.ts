import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./report-service", () => ({
  createReport: vi.fn(),
  getReport: vi.fn(),
  listReports: vi.fn(),
  updateReport: vi.fn(),
  deleteReport: vi.fn(),
  runReport: vi.fn(),
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

import * as reportService from "./report-service";
import { reportRouter } from "./report-router";
import { createRouter } from "@/server/trpc/init";
import type { TRPCContext } from "@/server/trpc/init";

const testRouter = createRouter({ report: reportRouter });

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

describe("reportRouter", () => {
  const caller = testRouter.createCaller;

  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects unauthenticated requests", async () => {
    const trpc = caller(createUnauthenticatedContext());
    await expect(
      trpc.report.list({}),
    ).rejects.toThrow(TRPCError);
  });

  it("create calls createReport", async () => {
    vi.mocked(reportService.createReport).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.report.create({
      name: "Test Report",
      reportType: "velocity",
      query: { project: "ORD" },
    });

    expect(reportService.createReport).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1",
      expect.objectContaining({
        name: "Test Report",
        reportType: "velocity",
      }),
    );
  });

  it("getById calls getReport", async () => {
    vi.mocked(reportService.getReport).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.report.getById({ id: "report-1" });

    expect(reportService.getReport).toHaveBeenCalledWith(
      expect.anything(), "org-1", "report-1",
    );
  });

  it("list calls listReports with userId", async () => {
    vi.mocked(reportService.listReports).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.report.list({});

    expect(reportService.listReports).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1",
      expect.objectContaining({}),
    );
  });

  it("update calls updateReport with userId", async () => {
    vi.mocked(reportService.updateReport).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.report.update({ id: "report-1", name: "Updated" });

    expect(reportService.updateReport).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1", "report-1",
      expect.objectContaining({ name: "Updated" }),
    );
  });

  it("delete calls deleteReport with userId", async () => {
    vi.mocked(reportService.deleteReport).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.report.delete({ id: "report-1" });

    expect(reportService.deleteReport).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1", "report-1",
    );
  });

  it("run calls runReport", async () => {
    vi.mocked(reportService.runReport).mockResolvedValue({
      reportId: "report-1",
      data: [],
      generatedAt: new Date(),
    } as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.report.run({ id: "report-1" });

    expect(reportService.runReport).toHaveBeenCalledWith(
      expect.anything(), "org-1", "report-1",
    );
  });
});
