import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  isSchemeShared,
  forkScheme,
  cloneSchemeIndependent,
  type SchemeAdapter,
  SCHEME_TYPES,
} from "./scheme-sharing-service";

// ── Test Helpers ────────────────────────────────────────────────────────────

interface MockScheme {
  id: string;
  name: string;
  organizationId: string;
  entries: { id: string }[];
}

function createMockAdapter(
  overrides: Partial<SchemeAdapter<MockScheme>> = {},
): SchemeAdapter<MockScheme> {
  return {
    schemeType: "TestScheme",
    findSchemeWithEntries: vi.fn(),
    getProjectCount: vi.fn(),
    cloneScheme: vi.fn(),
    assignToProject: vi.fn(),
    ...overrides,
  };
}

const mockDb = {} as PrismaClient;
const orgId = "org-1";

// ── Tests ───────────────────────────────────────────────────────────────────

describe("scheme-sharing-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── isSchemeShared ──────────────────────────────────────────────────────

  describe("isSchemeShared", () => {
    it("returns shared=true when projectCount > 1", async () => {
      const adapter = createMockAdapter({
        getProjectCount: vi.fn().mockResolvedValue(3),
      });

      const result = await isSchemeShared(adapter, mockDb, "scheme-1", orgId);

      expect(result).toEqual({ shared: true, projectCount: 3 });
      expect(adapter.getProjectCount).toHaveBeenCalledWith(
        mockDb,
        "scheme-1",
        orgId,
      );
    });

    it("returns shared=false when projectCount <= 1", async () => {
      const adapter = createMockAdapter({
        getProjectCount: vi.fn().mockResolvedValue(1),
      });

      const result = await isSchemeShared(adapter, mockDb, "scheme-1", orgId);

      expect(result).toEqual({ shared: false, projectCount: 1 });
    });

    it("returns shared=false when projectCount is 0", async () => {
      const adapter = createMockAdapter({
        getProjectCount: vi.fn().mockResolvedValue(0),
      });

      const result = await isSchemeShared(adapter, mockDb, "scheme-1", orgId);

      expect(result).toEqual({ shared: false, projectCount: 0 });
    });
  });

  // ── forkScheme ──────────────────────────────────────────────────────────

  describe("forkScheme", () => {
    it("clones the scheme and assigns to project", async () => {
      const original: MockScheme = {
        id: "scheme-1",
        name: "Default Workflow",
        organizationId: orgId,
        entries: [{ id: "e1" }],
      };
      const clone: MockScheme = {
        id: "scheme-2",
        name: "Default Workflow (Custom)",
        organizationId: orgId,
        entries: [{ id: "e2" }],
      };

      const adapter = createMockAdapter({
        findSchemeWithEntries: vi.fn().mockResolvedValue(original),
        cloneScheme: vi.fn().mockResolvedValue(clone),
        assignToProject: vi.fn().mockResolvedValue(undefined),
      });

      const result = await forkScheme(
        adapter,
        mockDb,
        "scheme-1",
        "proj-1",
        orgId,
      );

      expect(result).toEqual(clone);
      expect(adapter.findSchemeWithEntries).toHaveBeenCalledWith(
        mockDb,
        "scheme-1",
        orgId,
      );
      expect(adapter.cloneScheme).toHaveBeenCalledWith(
        mockDb,
        original,
        "Default Workflow (Custom)",
        orgId,
      );
      expect(adapter.assignToProject).toHaveBeenCalledWith(
        mockDb,
        "scheme-2",
        "proj-1",
      );
    });

    it("throws when scheme not found", async () => {
      const adapter = createMockAdapter({
        findSchemeWithEntries: vi.fn().mockResolvedValue(null),
      });

      await expect(
        forkScheme(adapter, mockDb, "missing", "proj-1", orgId),
      ).rejects.toThrow("TestScheme with id 'missing' not found");
    });
  });

  // ── cloneSchemeIndependent ──────────────────────────────────────────────

  describe("cloneSchemeIndependent", () => {
    it("clones scheme without assigning to any project", async () => {
      const original: MockScheme = {
        id: "scheme-1",
        name: "Standard Types",
        organizationId: orgId,
        entries: [{ id: "e1" }, { id: "e2" }],
      };
      const clone: MockScheme = {
        id: "scheme-3",
        name: "My Types Copy",
        organizationId: orgId,
        entries: [{ id: "e3" }, { id: "e4" }],
      };

      const adapter = createMockAdapter({
        findSchemeWithEntries: vi.fn().mockResolvedValue(original),
        cloneScheme: vi.fn().mockResolvedValue(clone),
      });

      const result = await cloneSchemeIndependent(
        adapter,
        mockDb,
        "scheme-1",
        "My Types Copy",
        orgId,
      );

      expect(result).toEqual(clone);
      expect(adapter.cloneScheme).toHaveBeenCalledWith(
        mockDb,
        original,
        "My Types Copy",
        orgId,
      );
      // assignToProject should NOT be called
      expect(adapter.assignToProject).not.toHaveBeenCalled();
    });

    it("throws when source scheme not found", async () => {
      const adapter = createMockAdapter({
        findSchemeWithEntries: vi.fn().mockResolvedValue(null),
      });

      await expect(
        cloneSchemeIndependent(adapter, mockDb, "missing", "Copy", orgId),
      ).rejects.toThrow("TestScheme with id 'missing' not found");
    });
  });

  // ── SCHEME_TYPES ────────────────────────────────────────────────────────

  describe("SCHEME_TYPES", () => {
    it("includes all seven scheme types", () => {
      expect(SCHEME_TYPES).toHaveLength(7);
      expect(SCHEME_TYPES).toContain("permissionScheme");
      expect(SCHEME_TYPES).toContain("workflow");
      expect(SCHEME_TYPES).toContain("issueTypeScheme");
      expect(SCHEME_TYPES).toContain("fieldConfigurationScheme");
      expect(SCHEME_TYPES).toContain("notificationScheme");
      expect(SCHEME_TYPES).toContain("issueSecurityScheme");
      expect(SCHEME_TYPES).toContain("componentScheme");
    });
  });
});
