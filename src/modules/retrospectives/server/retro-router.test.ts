import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./retro-service", () => ({
  createRetro: vi.fn(),
  getRetro: vi.fn(),
  listRetros: vi.fn(),
  updateRetro: vi.fn(),
  deleteRetro: vi.fn(),
  addCard: vi.fn(),
  updateCard: vi.fn(),
  voteCard: vi.fn(),
  deleteCard: vi.fn(),
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

import * as retroService from "./retro-service";
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

describe("retroRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects unauthenticated requests", async () => {
    const trpc = caller(createUnauthenticatedContext());
    await expect(
      trpc.retro.list({ projectId: "proj-1" }),
    ).rejects.toThrow(TRPCError);
  });

  it("create calls createRetro", async () => {
    vi.mocked(retroService.createRetro).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.retro.create({ projectId: "proj-1", name: "Sprint Retro" });

    expect(retroService.createRetro).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ projectId: "proj-1", name: "Sprint Retro" }),
    );
  });

  it("getById calls getRetro", async () => {
    vi.mocked(retroService.getRetro).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.retro.getById({ id: "retro-1" });

    expect(retroService.getRetro).toHaveBeenCalledWith(
      expect.anything(), "org-1", "retro-1",
    );
  });

  it("list calls listRetros", async () => {
    vi.mocked(retroService.listRetros).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.retro.list({ projectId: "proj-1" });

    expect(retroService.listRetros).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ projectId: "proj-1" }),
    );
  });

  it("addCard calls service with userId", async () => {
    vi.mocked(retroService.addCard).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.retro.addCard({
      retrospectiveId: "retro-1",
      category: "Went Well",
      text: "Great work",
    });

    expect(retroService.addCard).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1",
      expect.objectContaining({
        retrospectiveId: "retro-1",
        category: "Went Well",
        text: "Great work",
      }),
    );
  });

  it("voteCard calls service", async () => {
    vi.mocked(retroService.voteCard).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.retro.voteCard({ id: "card-1" });

    expect(retroService.voteCard).toHaveBeenCalledWith(
      expect.anything(), "org-1", "card-1",
    );
  });

  it("deleteCard calls service", async () => {
    vi.mocked(retroService.deleteCard).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.retro.deleteCard({ id: "card-1" });

    expect(retroService.deleteCard).toHaveBeenCalledWith(
      expect.anything(), "org-1", "card-1",
    );
  });
});
