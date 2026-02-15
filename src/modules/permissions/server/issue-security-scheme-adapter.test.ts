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

import { issueSecuritySchemeAdapter } from "./issue-security-scheme-adapter";
import type { PrismaClient } from "@prisma/client";

function mockDb() {
  return {
    issueSecurityScheme: {
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

describe("issueSecuritySchemeAdapter", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("has correct schemeType", () => {
    expect(issueSecuritySchemeAdapter.schemeType).toBe("IssueSecurityScheme");
  });

  describe("cloneScheme", () => {
    it("deep copies levels and members", async () => {
      const original = {
        id: "iss-1",
        name: "Default Security",
        description: null,
        isDefault: false,
        parentId: null,
        organizationId: orgId,
        levels: [
          {
            id: "l1",
            issueSecuritySchemeId: "iss-1",
            name: "Confidential",
            description: "Restricted",
            orderIndex: 0,
            members: [
              { id: "m1", issueSecurityLevelId: "l1", holderType: "group", projectRoleId: null, groupId: "g1", userId: null },
            ],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const db = mockDb();
      vi.mocked(db.issueSecurityScheme.create).mockResolvedValue({ id: "iss-2" } as never);

      await issueSecuritySchemeAdapter.cloneScheme(db, original, "Forked Security", orgId);

      expect(db.issueSecurityScheme.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentId: "iss-1",
          levels: {
            create: [
              {
                name: "Confidential",
                description: "Restricted",
                orderIndex: 0,
                members: {
                  create: [
                    { holderType: "group", projectRoleId: null, groupId: "g1", userId: null },
                  ],
                },
              },
            ],
          },
        }),
        include: { levels: { include: { members: true } } },
      });
    });
  });

  describe("assignToProject", () => {
    it("updates project FK", async () => {
      const db = mockDb();
      vi.mocked(db.project.update).mockResolvedValue({} as never);

      await issueSecuritySchemeAdapter.assignToProject(db, "iss-1", "p1");

      expect(db.project.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { issueSecuritySchemeId: "iss-1" },
      });
    });
  });
});
