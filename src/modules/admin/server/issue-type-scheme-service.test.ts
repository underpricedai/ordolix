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

import { issueTypeSchemeAdapter } from "./issue-type-scheme-adapter";
import type { PrismaClient } from "@prisma/client";

function mockDb(overrides: Record<string, unknown> = {}) {
  return {
    issueTypeScheme: {
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

describe("issueTypeSchemeAdapter", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("has correct schemeType", () => {
    expect(issueTypeSchemeAdapter.schemeType).toBe("IssueTypeScheme");
  });

  describe("findSchemeWithEntries", () => {
    it("finds scheme by id and org", async () => {
      const scheme = { id: "s1", name: "Default", entries: [] };
      const db = mockDb();
      vi.mocked(db.issueTypeScheme.findFirst).mockResolvedValue(scheme as never);

      const result = await issueTypeSchemeAdapter.findSchemeWithEntries(db, "s1", orgId);

      expect(result).toEqual(scheme);
      expect(db.issueTypeScheme.findFirst).toHaveBeenCalledWith({
        where: { id: "s1", organizationId: orgId },
        include: { entries: true },
      });
    });
  });

  describe("getProjectCount", () => {
    it("counts projects using the scheme", async () => {
      const db = mockDb();
      vi.mocked(db.project.count).mockResolvedValue(5 as never);

      const result = await issueTypeSchemeAdapter.getProjectCount(db, "s1", orgId);

      expect(result).toBe(5);
      expect(db.project.count).toHaveBeenCalledWith({
        where: { organizationId: orgId, issueTypeSchemeId: "s1" },
      });
    });
  });

  describe("cloneScheme", () => {
    it("creates a new scheme with entries and parentId", async () => {
      const original = {
        id: "s1",
        name: "Original",
        description: "Test",
        isDefault: false,
        parentId: null,
        organizationId: orgId,
        entries: [
          { id: "e1", issueTypeSchemeId: "s1", issueTypeId: "it-1", isDefault: true, position: 0 },
          { id: "e2", issueTypeSchemeId: "s1", issueTypeId: "it-2", isDefault: false, position: 1 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const clone = { id: "s2", name: "Clone", entries: [] };
      const db = mockDb();
      vi.mocked(db.issueTypeScheme.create).mockResolvedValue(clone as never);

      await issueTypeSchemeAdapter.cloneScheme(db, original, "Clone", orgId);

      expect(db.issueTypeScheme.create).toHaveBeenCalledWith({
        data: {
          organizationId: orgId,
          name: "Clone",
          description: "Test",
          isDefault: false,
          parentId: "s1",
          entries: {
            create: [
              { issueTypeId: "it-1", isDefault: true, position: 0 },
              { issueTypeId: "it-2", isDefault: false, position: 1 },
            ],
          },
        },
        include: { entries: true },
      });
    });
  });

  describe("assignToProject", () => {
    it("updates project FK", async () => {
      const db = mockDb();
      vi.mocked(db.project.update).mockResolvedValue({} as never);

      await issueTypeSchemeAdapter.assignToProject(db, "s1", "p1");

      expect(db.project.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { issueTypeSchemeId: "s1" },
      });
    });
  });
});
