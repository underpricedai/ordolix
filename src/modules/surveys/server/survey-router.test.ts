import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./survey-service", () => ({
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  listTemplates: vi.fn(),
  getTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  submitResponse: vi.fn(),
  getResponsesForIssue: vi.fn(),
  getResponsesForTemplate: vi.fn(),
  getSurveyStats: vi.fn(),
  getAgentPerformance: vi.fn(),
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
  resolveProjectPermissions: vi.fn().mockResolvedValue(new Set()),
  invalidatePermissionCache: vi.fn().mockResolvedValue(undefined),
}));

import * as surveyService from "./survey-service";
import { createRouter } from "@/server/trpc/init";
import { surveyRouter } from "./survey-router";
import type { TRPCContext } from "@/server/trpc/init";

const appRouter = createRouter({
  survey: surveyRouter,
});

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

describe("surveyRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects unauthenticated requests", async () => {
    const trpc = caller(createUnauthenticatedContext());
    await expect(trpc.survey.listTemplates()).rejects.toThrow(TRPCError);
  });

  // ── Template Procedures ─────────────────────────────────────────────────

  it("createTemplate calls service", async () => {
    vi.mocked(surveyService.createTemplate).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.survey.createTemplate({
      name: "CSAT Survey",
      trigger: "issue_resolved",
    });

    expect(surveyService.createTemplate).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ name: "CSAT Survey" }),
    );
  });

  it("updateTemplate calls service", async () => {
    vi.mocked(surveyService.updateTemplate).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.survey.updateTemplate({ id: "tpl-1", name: "Updated" });

    expect(surveyService.updateTemplate).toHaveBeenCalledWith(
      expect.anything(), "org-1", "tpl-1",
      expect.objectContaining({ name: "Updated" }),
    );
  });

  it("listTemplates calls service", async () => {
    vi.mocked(surveyService.listTemplates).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.survey.listTemplates();

    expect(surveyService.listTemplates).toHaveBeenCalledWith(
      expect.anything(), "org-1",
    );
  });

  it("getTemplate calls service", async () => {
    vi.mocked(surveyService.getTemplate).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.survey.getTemplate({ id: "tpl-1" });

    expect(surveyService.getTemplate).toHaveBeenCalledWith(
      expect.anything(), "org-1", "tpl-1",
    );
  });

  it("deleteTemplate calls service", async () => {
    vi.mocked(surveyService.deleteTemplate).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.survey.deleteTemplate({ id: "tpl-1" });

    expect(surveyService.deleteTemplate).toHaveBeenCalledWith(
      expect.anything(), "org-1", "tpl-1",
    );
  });

  // ── Response Procedures ─────────────────────────────────────────────────

  it("submitResponse calls service with userId", async () => {
    vi.mocked(surveyService.submitResponse).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.survey.submitResponse({
      templateId: "tpl-1",
      starRating: 5,
      answers: {},
    });

    expect(surveyService.submitResponse).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ templateId: "tpl-1", starRating: 5 }),
      "user-1",
    );
  });

  it("getResponsesForIssue calls service", async () => {
    vi.mocked(surveyService.getResponsesForIssue).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.survey.getResponsesForIssue({ issueId: "issue-1" });

    expect(surveyService.getResponsesForIssue).toHaveBeenCalledWith(
      expect.anything(), "org-1", "issue-1",
    );
  });

  it("getResponsesForTemplate calls service", async () => {
    vi.mocked(surveyService.getResponsesForTemplate).mockResolvedValue(
      { items: [], nextCursor: undefined } as never,
    );
    const trpc = caller(createAuthenticatedContext());
    await trpc.survey.getResponsesForTemplate({ templateId: "tpl-1", limit: 20 });

    expect(surveyService.getResponsesForTemplate).toHaveBeenCalledWith(
      expect.anything(), "org-1", "tpl-1",
      expect.objectContaining({ limit: 20 }),
    );
  });

  // ── Stats Procedures ────────────────────────────────────────────────────

  it("getStats calls service", async () => {
    vi.mocked(surveyService.getSurveyStats).mockResolvedValue({
      avgRating: 4.5,
      totalResponses: 10,
      ratedResponses: 10,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 5, 5: 5 },
      trend: [],
    } as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.survey.getStats();

    expect(surveyService.getSurveyStats).toHaveBeenCalledWith(
      expect.anything(), "org-1", undefined,
    );
  });

  it("getAgentPerformance calls service", async () => {
    vi.mocked(surveyService.getAgentPerformance).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.survey.getAgentPerformance();

    expect(surveyService.getAgentPerformance).toHaveBeenCalledWith(
      expect.anything(), "org-1", undefined,
    );
  });
});
