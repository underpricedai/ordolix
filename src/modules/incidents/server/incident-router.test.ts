import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./incident-service", () => ({
  createIncident: vi.fn(),
  getIncident: vi.fn(),
  listIncidents: vi.fn(),
  updateIncident: vi.fn(),
  addTimelineEntry: vi.fn(),
  addCommunication: vi.fn(),
  resolveIncident: vi.fn(),
  deleteIncident: vi.fn(),
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

import * as incidentService from "./incident-service";
import { incidentRouter } from "./incident-router";
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

describe("incidentRouter", () => {
  const caller = incidentRouter.createCaller;

  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects unauthenticated requests", async () => {
    const trpc = caller(createUnauthenticatedContext());
    await expect(
      trpc.list({}),
    ).rejects.toThrow(TRPCError);
  });

  it("create calls createIncident", async () => {
    vi.mocked(incidentService.createIncident).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.create({ issueId: "issue-1", severity: "P1" });

    expect(incidentService.createIncident).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ issueId: "issue-1", severity: "P1" }),
    );
  });

  it("getById calls getIncident", async () => {
    vi.mocked(incidentService.getIncident).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.getById({ id: "inc-1" });

    expect(incidentService.getIncident).toHaveBeenCalledWith(
      expect.anything(), "org-1", "inc-1",
    );
  });

  it("list calls listIncidents", async () => {
    vi.mocked(incidentService.listIncidents).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.list({ severity: "P2" });

    expect(incidentService.listIncidents).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({ severity: "P2", limit: 50 }),
    );
  });

  it("resolve calls resolveIncident", async () => {
    vi.mocked(incidentService.resolveIncident).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.resolve({ id: "inc-1" });

    expect(incidentService.resolveIncident).toHaveBeenCalledWith(
      expect.anything(), "org-1", "inc-1",
    );
  });

  it("addTimelineEntry calls service correctly", async () => {
    vi.mocked(incidentService.addTimelineEntry).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.addTimelineEntry({
      id: "inc-1",
      entry: { event: "Escalated" },
    });

    expect(incidentService.addTimelineEntry).toHaveBeenCalledWith(
      expect.anything(), "org-1", "inc-1",
      expect.objectContaining({ event: "Escalated" }),
    );
  });

  it("delete calls deleteIncident", async () => {
    vi.mocked(incidentService.deleteIncident).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.delete({ id: "inc-1" });

    expect(incidentService.deleteIncident).toHaveBeenCalledWith(
      expect.anything(), "org-1", "inc-1",
    );
  });
});
