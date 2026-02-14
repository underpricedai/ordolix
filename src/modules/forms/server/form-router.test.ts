import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./form-service", () => ({
  createTemplate: vi.fn(),
  getTemplate: vi.fn(),
  listTemplates: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  submitForm: vi.fn(),
  getSubmission: vi.fn(),
  listSubmissions: vi.fn(),
  updateSubmissionStatus: vi.fn(),
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

import * as formService from "./form-service";
import { createRouter } from "@/server/trpc/init";
import type { TRPCContext } from "@/server/trpc/init";
import { formRouter } from "./form-router";

const testRouter = createRouter({
  form: formRouter,
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

describe("formRouter", () => {
  const caller = testRouter.createCaller;

  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects unauthenticated requests", async () => {
    const trpc = caller(createUnauthenticatedContext());
    await expect(
      trpc.form.listTemplates({}),
    ).rejects.toThrow(TRPCError);
  });

  it("createTemplate calls service", async () => {
    vi.mocked(formService.createTemplate).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    const field = { id: "f1", label: "Name", type: "text" as const, required: false };
    await trpc.form.createTemplate({ name: "Test", schema: [field] });

    expect(formService.createTemplate).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ name: "Test" }),
    );
  });

  it("getTemplate calls service", async () => {
    vi.mocked(formService.getTemplate).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.form.getTemplate({ id: "tpl-1" });

    expect(formService.getTemplate).toHaveBeenCalledWith(
      expect.anything(), "org-1", "tpl-1",
    );
  });

  it("deleteTemplate calls service", async () => {
    vi.mocked(formService.deleteTemplate).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.form.deleteTemplate({ id: "tpl-1" });

    expect(formService.deleteTemplate).toHaveBeenCalledWith(
      expect.anything(), "org-1", "tpl-1",
    );
  });

  it("submit calls service with userId", async () => {
    vi.mocked(formService.submitForm).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.form.submit({ formTemplateId: "tpl-1", data: { name: "John" } });

    expect(formService.submitForm).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1",
      expect.objectContaining({ formTemplateId: "tpl-1" }),
    );
  });

  it("updateSubmissionStatus calls service", async () => {
    vi.mocked(formService.updateSubmissionStatus).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.form.updateSubmissionStatus({ id: "sub-1", status: "approved" });

    expect(formService.updateSubmissionStatus).toHaveBeenCalledWith(
      expect.anything(), "org-1", "sub-1", "approved",
    );
  });

  it("listSubmissions calls service", async () => {
    vi.mocked(formService.listSubmissions).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.form.listSubmissions({ formTemplateId: "tpl-1" });

    expect(formService.listSubmissions).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ formTemplateId: "tpl-1", limit: 50 }),
    );
  });
});
