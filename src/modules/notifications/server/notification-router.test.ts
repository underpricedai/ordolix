import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./notification-service", () => ({
  createNotification: vi.fn(),
  listNotifications: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  getUnreadCount: vi.fn(),
  updatePreference: vi.fn(),
  listPreferences: vi.fn(),
  deleteNotification: vi.fn(),
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

import * as notificationService from "./notification-service";
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

describe("notificationRouter", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects unauthenticated requests", async () => {
    const trpc = caller(createUnauthenticatedContext());
    await expect(
      trpc.notification.list({}),
    ).rejects.toThrow(TRPCError);
  });

  it("create calls createNotification", async () => {
    vi.mocked(notificationService.createNotification).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.notification.create({
      userId: "user-2",
      type: "issue_assigned",
      title: "Assigned to you",
    });

    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.anything(), "org-1",
      expect.objectContaining({
        userId: "user-2",
        type: "issue_assigned",
        title: "Assigned to you",
      }),
    );
  });

  it("list calls listNotifications with userId", async () => {
    vi.mocked(notificationService.listNotifications).mockResolvedValue([] as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.notification.list({});

    expect(notificationService.listNotifications).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1",
      expect.objectContaining({ limit: 50 }),
    );
  });

  it("markRead calls service with userId and id", async () => {
    vi.mocked(notificationService.markRead).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.notification.markRead({ id: "notif-1" });

    expect(notificationService.markRead).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1", "notif-1",
    );
  });

  it("unreadCount calls getUnreadCount with userId", async () => {
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(3 as never);
    const trpc = caller(createAuthenticatedContext());
    const count = await trpc.notification.unreadCount();

    expect(count).toBe(3);
    expect(notificationService.getUnreadCount).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1",
    );
  });

  it("updatePreference calls service with userId", async () => {
    vi.mocked(notificationService.updatePreference).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.notification.updatePreference({
      eventType: "issue_assigned",
      channel: "email",
    });

    expect(notificationService.updatePreference).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1",
      expect.objectContaining({ eventType: "issue_assigned", channel: "email" }),
    );
  });

  it("delete calls deleteNotification with userId and id", async () => {
    vi.mocked(notificationService.deleteNotification).mockResolvedValue({} as never);
    const trpc = caller(createAuthenticatedContext());
    await trpc.notification.delete({ id: "notif-1" });

    expect(notificationService.deleteNotification).toHaveBeenCalledWith(
      expect.anything(), "org-1", "user-1", "notif-1",
    );
  });
});
