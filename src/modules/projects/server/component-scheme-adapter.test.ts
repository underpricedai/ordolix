import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { componentSchemeAdapter } from "./component-scheme-adapter";

// ── Mock DB ──────────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    componentScheme: {
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

describe("componentSchemeAdapter", () => {
  let db: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("has schemeType 'ComponentScheme'", () => {
    expect(componentSchemeAdapter.schemeType).toBe("ComponentScheme");
  });

  describe("findSchemeWithEntries", () => {
    it("loads scheme with entries", async () => {
      const scheme = {
        id: "cs-1",
        name: "Default Components",
        organizationId: orgId,
        entries: [{ id: "e1", componentId: "comp-1", isDefault: true, position: 0 }],
      };
      vi.mocked(db.componentScheme.findFirst).mockResolvedValue(scheme as never);

      const result = await componentSchemeAdapter.findSchemeWithEntries(db, "cs-1", orgId);

      expect(result).toEqual(scheme);
      expect(db.componentScheme.findFirst).toHaveBeenCalledWith({
        where: { id: "cs-1", organizationId: orgId },
        include: { entries: true },
      });
    });
  });

  describe("getProjectCount", () => {
    it("counts projects using this scheme", async () => {
      vi.mocked(db.project.count).mockResolvedValue(3 as never);

      const result = await componentSchemeAdapter.getProjectCount(db, "cs-1", orgId);

      expect(result).toBe(3);
      expect(db.project.count).toHaveBeenCalledWith({
        where: { organizationId: orgId, componentSchemeId: "cs-1" },
      });
    });
  });

  describe("cloneScheme", () => {
    it("deep clones scheme with entries", async () => {
      const original = {
        id: "cs-1",
        name: "Original",
        description: "Test desc",
        organizationId: orgId,
        isDefault: true,
        parentId: null,
        entries: [
          { id: "e1", componentSchemeId: "cs-1", componentId: "comp-1", isDefault: true, position: 0 },
          { id: "e2", componentSchemeId: "cs-1", componentId: "comp-2", isDefault: false, position: 1 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const cloned = { ...original, id: "cs-2", name: "Cloned", parentId: "cs-1" };
      vi.mocked(db.componentScheme.create).mockResolvedValue(cloned as never);

      const result = await componentSchemeAdapter.cloneScheme(db, original as never, "Cloned", orgId);

      expect(result).toEqual(cloned);
      expect(db.componentScheme.create).toHaveBeenCalledWith({
        data: {
          organizationId: orgId,
          name: "Cloned",
          description: "Test desc",
          isDefault: false,
          parentId: "cs-1",
          entries: {
            create: [
              { componentId: "comp-1", isDefault: true, position: 0 },
              { componentId: "comp-2", isDefault: false, position: 1 },
            ],
          },
        },
        include: { entries: true },
      });
    });
  });

  describe("assignToProject", () => {
    it("updates project with scheme FK", async () => {
      vi.mocked(db.project.update).mockResolvedValue({} as never);

      await componentSchemeAdapter.assignToProject(db, "cs-1", "proj-1");

      expect(db.project.update).toHaveBeenCalledWith({
        where: { id: "proj-1" },
        data: { componentSchemeId: "cs-1" },
      });
    });
  });
});
