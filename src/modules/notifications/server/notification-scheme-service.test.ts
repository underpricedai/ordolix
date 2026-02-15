import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/lib/logger", () => ({
  logger: { child: vi.fn().mockReturnValue({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }) },
}));
vi.mock("@/server/trpc/dev-auth", () => ({
  createDevSession: vi.fn().mockResolvedValue(null),
  getOrganizationId: vi.fn().mockResolvedValue(null),
}));

import { notificationSchemeAdapter } from "./notification-scheme-adapter";
import type { PrismaClient } from "@prisma/client";

function mockDb(overrides: Record<string, unknown> = {}) {
  return {
    notificationScheme: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    project: {
      count: vi.fn(),
      update: vi.fn(),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const orgId = "org-1";

describe("notificationSchemeAdapter", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("has correct schemeType", () => {
    expect(notificationSchemeAdapter.schemeType).toBe("NotificationScheme");
  });

  describe("findSchemeWithEntries", () => {
    it("finds scheme by id and org", async () => {
      const scheme = { id: "s1", entries: [] };
      const db = mockDb();
      vi.mocked(db.notificationScheme.findFirst).mockResolvedValue(scheme as never);

      const result = await notificationSchemeAdapter.findSchemeWithEntries(db, "s1", orgId);

      expect(result).toEqual(scheme);
    });
  });

  describe("getProjectCount", () => {
    it("counts projects using the scheme", async () => {
      const db = mockDb();
      vi.mocked(db.project.count).mockResolvedValue(4 as never);

      const result = await notificationSchemeAdapter.getProjectCount(db, "s1", orgId);

      expect(result).toBe(4);
    });
  });

  describe("cloneScheme", () => {
    it("deep copies entries with parentId tracking", async () => {
      const original = {
        id: "s1",
        name: "Default Notifications",
        description: "Org default",
        isDefault: true,
        parentId: null,
        organizationId: orgId,
        entries: [
          {
            id: "e1",
            notificationSchemeId: "s1",
            event: "issue_created",
            recipientType: "reporter",
            recipientId: null,
            channels: ["in_app", "email"],
          },
          {
            id: "e2",
            notificationSchemeId: "s1",
            event: "comment_added",
            recipientType: "assignee",
            recipientId: null,
            channels: ["in_app"],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const db = mockDb();
      vi.mocked(db.notificationScheme.create).mockResolvedValue({ id: "s2" } as never);

      await notificationSchemeAdapter.cloneScheme(db, original, "Custom Notifications", orgId);

      expect(db.notificationScheme.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Custom Notifications",
          parentId: "s1",
          isDefault: false,
          entries: {
            create: [
              {
                event: "issue_created",
                recipientType: "reporter",
                recipientId: null,
                channels: ["in_app", "email"],
              },
              {
                event: "comment_added",
                recipientType: "assignee",
                recipientId: null,
                channels: ["in_app"],
              },
            ],
          },
        }),
        include: { entries: true },
      });
    });
  });

  describe("assignToProject", () => {
    it("updates project FK", async () => {
      const db = mockDb();
      vi.mocked(db.project.update).mockResolvedValue({} as never);

      await notificationSchemeAdapter.assignToProject(db, "s1", "p1");

      expect(db.project.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { notificationSchemeId: "s1" },
      });
    });
  });
});
