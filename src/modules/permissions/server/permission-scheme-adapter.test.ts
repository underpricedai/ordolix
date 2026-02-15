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

import { permissionSchemeAdapter } from "./permission-scheme-adapter";
import type { PrismaClient } from "@prisma/client";

function mockDb() {
  return {
    permissionScheme: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    project: {
      count: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as PrismaClient;
}

const orgId = "org-1";

describe("permissionSchemeAdapter", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("has correct schemeType", () => {
    expect(permissionSchemeAdapter.schemeType).toBe("PermissionScheme");
  });

  describe("cloneScheme", () => {
    it("deep copies grants with parentId", async () => {
      const original = {
        id: "ps-1",
        name: "Default",
        description: "Org default",
        isDefault: true,
        parentId: null,
        organizationId: orgId,
        grants: [
          { id: "g1", permissionSchemeId: "ps-1", permissionKey: "BROWSE_PROJECTS", holderType: "projectRole", projectRoleId: "r1", groupId: null, userId: null },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const db = mockDb();
      vi.mocked(db.permissionScheme.create).mockResolvedValue({ id: "ps-2" } as never);

      await permissionSchemeAdapter.cloneScheme(db, original, "Forked", orgId);

      expect(db.permissionScheme.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentId: "ps-1",
          name: "Forked",
          grants: {
            create: [
              { permissionKey: "BROWSE_PROJECTS", holderType: "projectRole", projectRoleId: "r1", groupId: null, userId: null },
            ],
          },
        }),
        include: { grants: true },
      });
    });
  });

  describe("getProjectCount", () => {
    it("counts projects with the scheme", async () => {
      const db = mockDb();
      vi.mocked(db.project.count).mockResolvedValue(3 as never);

      const result = await permissionSchemeAdapter.getProjectCount(db, "ps-1", orgId);

      expect(result).toBe(3);
    });
  });
});
