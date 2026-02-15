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

import { fieldConfigSchemeAdapter } from "./field-config-scheme-adapter";
import type { PrismaClient } from "@prisma/client";

function mockDb(overrides: Record<string, unknown> = {}) {
  return {
    fieldConfigurationScheme: {
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

describe("fieldConfigSchemeAdapter", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("has correct schemeType", () => {
    expect(fieldConfigSchemeAdapter.schemeType).toBe("FieldConfigurationScheme");
  });

  describe("findSchemeWithEntries", () => {
    it("finds scheme by id and org", async () => {
      const scheme = { id: "s1", entries: [] };
      const db = mockDb();
      vi.mocked(db.fieldConfigurationScheme.findFirst).mockResolvedValue(scheme as never);

      const result = await fieldConfigSchemeAdapter.findSchemeWithEntries(db, "s1", orgId);

      expect(result).toEqual(scheme);
    });
  });

  describe("getProjectCount", () => {
    it("counts projects using the scheme", async () => {
      const db = mockDb();
      vi.mocked(db.project.count).mockResolvedValue(2 as never);

      const result = await fieldConfigSchemeAdapter.getProjectCount(db, "s1", orgId);

      expect(result).toBe(2);
    });
  });

  describe("cloneScheme", () => {
    it("deep copies entries with parentId tracking", async () => {
      const original = {
        id: "s1",
        name: "Original",
        description: null,
        isDefault: false,
        parentId: null,
        organizationId: orgId,
        entries: [
          { id: "e1", fieldConfigurationSchemeId: "s1", customFieldId: "cf-1", isVisible: true, isRequired: false, position: 0 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const db = mockDb();
      vi.mocked(db.fieldConfigurationScheme.create).mockResolvedValue({ id: "s2" } as never);

      await fieldConfigSchemeAdapter.cloneScheme(db, original, "Clone", orgId);

      expect(db.fieldConfigurationScheme.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentId: "s1",
          entries: {
            create: [{ customFieldId: "cf-1", isVisible: true, isRequired: false, position: 0 }],
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

      await fieldConfigSchemeAdapter.assignToProject(db, "s1", "p1");

      expect(db.project.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { fieldConfigurationSchemeId: "s1" },
      });
    });
  });
});
