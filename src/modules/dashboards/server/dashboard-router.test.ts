import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./dashboard-service", () => ({
  createDashboard: vi.fn(),
  getDashboard: vi.fn(),
  listDashboards: vi.fn(),
  updateDashboard: vi.fn(),
  deleteDashboard: vi.fn(),
  addWidget: vi.fn(),
  updateWidget: vi.fn(),
  deleteWidget: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/server/db", () => ({ db: {} }));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("@/server/trpc/dev-auth", () => ({
  createDevSession: vi.fn().mockResolvedValue(null),
  getOrganizationId: vi.fn().mockResolvedValue(null),
}));

import * as dashboardService from "./dashboard-service";
import { createRouter } from "@/server/trpc/init";
import { dashboardRouter } from "./dashboard-router";
import type { TRPCContext } from "@/server/trpc/init";

const testRouter = createRouter({
  dashboard: dashboardRouter,
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
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
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
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as TRPCContext["logger"],
  };
}

describe("dashboardRouter", () => {
  const caller = testRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
      const trpc = caller(createUnauthenticatedContext());
      await expect(
        trpc.dashboard.getById({ id: "dash-1" }),
      ).rejects.toThrow(TRPCError);
    });

    it("rejects requests without organizationId", async () => {
      const trpc = caller(
        createAuthenticatedContext({ organizationId: null }),
      );
      await expect(
        trpc.dashboard.getById({ id: "dash-1" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("create", () => {
    it("calls createDashboard with correct args", async () => {
      const mockResult = { id: "dash-1", name: "My Dashboard" };
      vi.mocked(dashboardService.createDashboard).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.dashboard.create({
        name: "My Dashboard",
      });

      expect(result).toEqual(mockResult);
      expect(dashboardService.createDashboard).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        expect.objectContaining({ name: "My Dashboard" }),
      );
    });
  });

  describe("list", () => {
    it("calls listDashboards with correct args", async () => {
      const mockResult = [{ id: "dash-1", name: "Dashboard" }];
      vi.mocked(dashboardService.listDashboards).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.dashboard.list();

      expect(result).toEqual(mockResult);
      expect(dashboardService.listDashboards).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
      );
    });
  });

  describe("update", () => {
    it("calls updateDashboard separating id from updates", async () => {
      const mockResult = { id: "dash-1", name: "Renamed" };
      vi.mocked(dashboardService.updateDashboard).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      await trpc.dashboard.update({ id: "dash-1", name: "Renamed" });

      expect(dashboardService.updateDashboard).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        "dash-1",
        { name: "Renamed" },
      );
    });
  });

  describe("delete", () => {
    it("calls deleteDashboard with correct args", async () => {
      vi.mocked(dashboardService.deleteDashboard).mockResolvedValue(
        undefined as never,
      );

      const trpc = caller(createAuthenticatedContext());
      await trpc.dashboard.delete({ id: "dash-1" });

      expect(dashboardService.deleteDashboard).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "user-1",
        "dash-1",
      );
    });
  });

  describe("addWidget", () => {
    it("calls addWidget with correct args", async () => {
      const mockResult = { id: "widget-1", title: "Open Issues" };
      vi.mocked(dashboardService.addWidget).mockResolvedValue(
        mockResult as never,
      );

      const trpc = caller(createAuthenticatedContext());
      const result = await trpc.dashboard.addWidget({
        dashboardId: "dash-1",
        widgetType: "issueCount",
        title: "Open Issues",
      });

      expect(result).toEqual(mockResult);
      expect(dashboardService.addWidget).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        expect.objectContaining({
          dashboardId: "dash-1",
          widgetType: "issueCount",
          title: "Open Issues",
        }),
      );
    });
  });

  describe("deleteWidget", () => {
    it("calls deleteWidget with correct args", async () => {
      vi.mocked(dashboardService.deleteWidget).mockResolvedValue(
        undefined as never,
      );

      const trpc = caller(createAuthenticatedContext());
      await trpc.dashboard.deleteWidget({ id: "widget-1" });

      expect(dashboardService.deleteWidget).toHaveBeenCalledWith(
        expect.anything(),
        "org-1",
        "widget-1",
      );
    });
  });
});
