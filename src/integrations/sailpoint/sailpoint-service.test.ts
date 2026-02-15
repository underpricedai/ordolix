/**
 * Unit tests for SailPoint integration service.
 *
 * @module integrations/sailpoint/sailpoint-service-test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import * as sailpointService from "./sailpoint-service";

// ── Mock DB Factory ─────────────────────────────────────────────────────────

function createMockDb() {
  return {
    integrationConfig: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    sailPointMapping: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    sailPointSyncLog: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
    },
    group: {
      findFirst: vi.fn(),
    },
    groupMember: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    projectRole: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    projectMember: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    project: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    organizationMember: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
  } as unknown as Parameters<typeof sailpointService.listMappings>[0];
}

// ── createSailPointClient ───────────────────────────────────────────────────

describe("createSailPointClient", () => {
  it("creates a client with valid config", () => {
    const config = sailpointService.createSailPointClient({
      tenantUrl: "https://acme.identitynow.com/",
      clientId: "client-id",
      clientSecret: "secret",
    });

    expect(config.tenantUrl).toBe("https://acme.identitynow.com");
    expect(config.clientId).toBe("client-id");
    expect(config.clientSecret).toBe("secret");
  });

  it("strips trailing slashes from tenant URL", () => {
    const config = sailpointService.createSailPointClient({
      tenantUrl: "https://acme.identitynow.com///",
      clientId: "id",
      clientSecret: "secret",
    });

    expect(config.tenantUrl).toBe("https://acme.identitynow.com");
  });

  it("throws IntegrationError when tenantUrl is missing", () => {
    expect(() =>
      sailpointService.createSailPointClient({
        tenantUrl: "",
        clientId: "id",
        clientSecret: "secret",
      }),
    ).toThrow("Missing required SailPoint configuration");
  });

  it("throws IntegrationError when clientId is missing", () => {
    expect(() =>
      sailpointService.createSailPointClient({
        tenantUrl: "https://acme.identitynow.com",
        clientId: "",
        clientSecret: "secret",
      }),
    ).toThrow("Missing required SailPoint configuration");
  });

  it("throws IntegrationError when clientSecret is missing", () => {
    expect(() =>
      sailpointService.createSailPointClient({
        tenantUrl: "https://acme.identitynow.com",
        clientId: "id",
        clientSecret: "",
      }),
    ).toThrow("Missing required SailPoint configuration");
  });
});

// ── listSailPointGroups ─────────────────────────────────────────────────────

describe("listSailPointGroups", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("returns mock groups when no integration config exists", async () => {
    (db.integrationConfig.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const groups = await sailpointService.listSailPointGroups(db, "org-1");

    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0]).toHaveProperty("id");
    expect(groups[0]).toHaveProperty("name");
    expect(groups[0]).toHaveProperty("description");
    expect(groups[0]).toHaveProperty("memberCount");
  });

  it("returns mock groups when config is present but incomplete", async () => {
    (db.integrationConfig.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      config: { tenantUrl: "https://example.com" },
    });

    const groups = await sailpointService.listSailPointGroups(db, "org-1");

    expect(groups.length).toBeGreaterThan(0);
  });

  it("filters mock groups by search term", async () => {
    (db.integrationConfig.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const groups = await sailpointService.listSailPointGroups(db, "org-1", {
      search: "Engineering",
      limit: 50,
    });

    expect(groups.length).toBeGreaterThanOrEqual(1);
    expect(groups.every((g) => g.name.includes("Engineering") || g.description.includes("engineering"))).toBe(true);
  });

  it("limits results", async () => {
    (db.integrationConfig.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const groups = await sailpointService.listSailPointGroups(db, "org-1", { limit: 2 });

    expect(groups.length).toBeLessThanOrEqual(2);
  });
});

// ── getSailPointGroupMembers ────────────────────────────────────────────────

describe("getSailPointGroupMembers", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("returns mock members for a known group", async () => {
    (db.integrationConfig.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const members = await sailpointService.getSailPointGroupMembers(db, "org-1", "sp-grp-001");

    expect(members.length).toBeGreaterThan(0);
    expect(members[0]).toHaveProperty("id");
    expect(members[0]).toHaveProperty("email");
    expect(members[0]).toHaveProperty("displayName");
  });

  it("returns empty array for unknown group", async () => {
    (db.integrationConfig.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const members = await sailpointService.getSailPointGroupMembers(db, "org-1", "unknown-group");

    expect(members).toEqual([]);
  });
});

// ── Mapping CRUD ────────────────────────────────────────────────────────────

describe("createMapping", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("creates a group mapping when group exists", async () => {
    (db.group.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "grp-1" });
    const mockMapping = {
      id: "map-1",
      organizationId: "org-1",
      sailPointGroupId: "sp-grp-001",
      sailPointGroupName: "Engineering",
      targetType: "group",
      targetId: "grp-1",
    };
    (db.sailPointMapping.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

    const result = await sailpointService.createMapping(db, "org-1", {
      sailPointGroupId: "sp-grp-001",
      sailPointGroupName: "Engineering",
      targetType: "group",
      targetId: "grp-1",
      syncDirection: "pull",
    });

    expect(result).toEqual(mockMapping);
    expect(db.sailPointMapping.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        sailPointGroupId: "sp-grp-001",
        targetType: "group",
        targetId: "grp-1",
        syncDirection: "pull",
      }),
    });
  });

  it("creates a projectRole mapping when role exists", async () => {
    (db.projectRole.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "role-1" });
    const mockMapping = { id: "map-2", targetType: "projectRole", targetId: "role-1" };
    (db.sailPointMapping.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

    const result = await sailpointService.createMapping(db, "org-1", {
      sailPointGroupId: "sp-grp-002",
      sailPointGroupName: "DevOps",
      targetType: "projectRole",
      targetId: "role-1",
      syncDirection: "pull",
    });

    expect(result).toEqual(mockMapping);
  });

  it("creates an organizationRole mapping with valid role name", async () => {
    const mockMapping = { id: "map-3", targetType: "organizationRole", targetId: "admin" };
    (db.sailPointMapping.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

    const result = await sailpointService.createMapping(db, "org-1", {
      sailPointGroupId: "sp-grp-005",
      sailPointGroupName: "IT Admins",
      targetType: "organizationRole",
      targetId: "admin",
      syncDirection: "pull",
    });

    expect(result).toEqual(mockMapping);
  });

  it("throws ValidationError when group target not found", async () => {
    (db.group.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      sailpointService.createMapping(db, "org-1", {
        sailPointGroupId: "sp-grp-001",
        sailPointGroupName: "Test",
        targetType: "group",
        targetId: "nonexistent",
        syncDirection: "pull",
      }),
    ).rejects.toThrow("Group 'nonexistent' not found");
  });

  it("throws ValidationError for invalid org role", async () => {
    await expect(
      sailpointService.createMapping(db, "org-1", {
        sailPointGroupId: "sp-grp-005",
        sailPointGroupName: "Test",
        targetType: "organizationRole",
        targetId: "superadmin",
        syncDirection: "pull",
      }),
    ).rejects.toThrow("Invalid organization role");
  });
});

describe("deleteMapping", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("deletes an existing mapping", async () => {
    (db.sailPointMapping.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "map-1",
      organizationId: "org-1",
    });

    await sailpointService.deleteMapping(db, "org-1", "map-1");

    expect(db.sailPointMapping.delete).toHaveBeenCalledWith({ where: { id: "map-1" } });
  });

  it("throws NotFoundError when mapping does not exist", async () => {
    (db.sailPointMapping.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      sailpointService.deleteMapping(db, "org-1", "nonexistent"),
    ).rejects.toThrow("not found");
  });
});

describe("listMappings", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("returns all mappings for the organization", async () => {
    const mockMappings = [
      { id: "map-1", sailPointGroupName: "Engineering", targetType: "group" },
      { id: "map-2", sailPointGroupName: "DevOps", targetType: "projectRole" },
    ];
    (db.sailPointMapping.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockMappings);

    const result = await sailpointService.listMappings(db, "org-1");

    expect(result).toEqual(mockMappings);
    expect(db.sailPointMapping.findMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      orderBy: { createdAt: "desc" },
    });
  });
});

// ── Sync Logic ──────────────────────────────────────────────────────────────

describe("syncMapping", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("throws NotFoundError when mapping does not exist", async () => {
    (db.sailPointMapping.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      sailpointService.syncMapping(db, "org-1", "nonexistent"),
    ).rejects.toThrow("not found");
  });

  it("syncs a group mapping: adds new members", async () => {
    const mapping = {
      id: "map-1",
      organizationId: "org-1",
      sailPointGroupId: "sp-grp-001",
      sailPointGroupName: "Engineering",
      targetType: "group",
      targetId: "grp-1",
    };
    (db.sailPointMapping.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mapping);
    (db.integrationConfig.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    // SailPoint members resolve to Ordolix users
    (db.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "user-1", email: "alice@example.com" },
      { id: "user-2", email: "bob@example.com" },
    ]);

    // No existing group members
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await sailpointService.syncMapping(db, "org-1", "map-1");

    expect(result.added).toBe(2);
    expect(result.removed).toBe(0);
    expect(db.groupMember.create).toHaveBeenCalledTimes(2);
    expect(db.sailPointMapping.update).toHaveBeenCalledWith({
      where: { id: "map-1" },
      data: { lastSyncAt: expect.any(Date) },
    });
  });

  it("syncs a group mapping: removes members no longer in SailPoint", async () => {
    const mapping = {
      id: "map-1",
      organizationId: "org-1",
      sailPointGroupId: "sp-grp-001",
      sailPointGroupName: "Engineering",
      targetType: "group",
      targetId: "grp-1",
    };
    (db.sailPointMapping.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mapping);
    (db.integrationConfig.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    // No SailPoint members match Ordolix users
    (db.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // Existing group member that should be removed
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { userId: "user-old" },
    ]);

    const result = await sailpointService.syncMapping(db, "org-1", "map-1");

    expect(result.added).toBe(0);
    expect(result.removed).toBe(1);
    expect(db.groupMember.deleteMany).toHaveBeenCalledWith({
      where: { groupId: "grp-1", userId: "user-old" },
    });
  });

  it("logs an error when sync fails", async () => {
    const mapping = {
      id: "map-1",
      organizationId: "org-1",
      sailPointGroupId: "sp-grp-001",
      sailPointGroupName: "Engineering",
      targetType: "group",
      targetId: "grp-1",
    };
    (db.sailPointMapping.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mapping);
    (db.integrationConfig.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    // Force an error during sync
    (db.user.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB connection lost"));

    await expect(
      sailpointService.syncMapping(db, "org-1", "map-1"),
    ).rejects.toThrow("DB connection lost");

    expect(db.sailPointSyncLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "error",
        status: "failure",
        error: "DB connection lost",
      }),
    });
  });
});

describe("syncAll", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("returns zero counts when no mappings exist", async () => {
    (db.sailPointMapping.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await sailpointService.syncAll(db, "org-1");

    expect(result).toEqual({ totalAdded: 0, totalRemoved: 0, errors: [] });
    expect(db.sailPointSyncLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "full_sync",
        details: expect.objectContaining({ mappingCount: 0 }),
      }),
    });
  });

  it("aggregates results from multiple mapping syncs", async () => {
    const mappings = [
      {
        id: "map-1",
        organizationId: "org-1",
        sailPointGroupId: "sp-grp-001",
        sailPointGroupName: "Engineering",
        targetType: "group",
        targetId: "grp-1",
      },
    ];
    (db.sailPointMapping.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mappings);

    // For syncMapping call
    (db.sailPointMapping.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mappings[0]);
    (db.integrationConfig.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "user-1", email: "alice@example.com" },
    ]);
    (db.groupMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await sailpointService.syncAll(db, "org-1");

    expect(result.totalAdded).toBe(1);
    expect(result.errors).toEqual([]);
  });
});

// ── handleSailPointEvent ────────────────────────────────────────────────────

describe("handleSailPointEvent", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("returns not processed when groupId is missing", async () => {
    const result = await sailpointService.handleSailPointEvent(db, "org-1", {
      eventType: "access_request",
      userEmail: "alice@example.com",
      action: "approved",
    });

    expect(result.processed).toBe(false);
  });

  it("returns not processed when userEmail is missing", async () => {
    const result = await sailpointService.handleSailPointEvent(db, "org-1", {
      eventType: "access_request",
      groupId: "sp-grp-001",
      action: "approved",
    });

    expect(result.processed).toBe(false);
  });

  it("returns not processed when no mappings exist for group", async () => {
    (db.sailPointMapping.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await sailpointService.handleSailPointEvent(db, "org-1", {
      eventType: "access_request",
      userEmail: "alice@example.com",
      groupId: "sp-grp-999",
      action: "approved",
    });

    expect(result.processed).toBe(false);
  });

  it("returns not processed when user not found in Ordolix", async () => {
    (db.sailPointMapping.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "map-1", targetType: "group", targetId: "grp-1" },
    ]);
    (db.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await sailpointService.handleSailPointEvent(db, "org-1", {
      eventType: "access_request",
      userEmail: "unknown@example.com",
      groupId: "sp-grp-001",
      action: "approved",
    });

    expect(result.processed).toBe(false);
    expect(db.sailPointSyncLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "error",
        error: expect.stringContaining("not found"),
      }),
    });
  });

  it("adds user to group when access is approved", async () => {
    (db.sailPointMapping.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "map-1", targetType: "group", targetId: "grp-1" },
    ]);
    (db.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1" });
    (db.groupMember.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await sailpointService.handleSailPointEvent(db, "org-1", {
      eventType: "access_request",
      userEmail: "alice@example.com",
      groupId: "sp-grp-001",
      action: "approved",
    });

    expect(result.processed).toBe(true);
    expect(result.action).toBe("approved");
    expect(db.groupMember.create).toHaveBeenCalledWith({
      data: { groupId: "grp-1", userId: "user-1" },
    });
  });

  it("removes user from group when access is revoked", async () => {
    (db.sailPointMapping.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "map-1", targetType: "group", targetId: "grp-1" },
    ]);
    (db.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1" });

    const result = await sailpointService.handleSailPointEvent(db, "org-1", {
      eventType: "access_request",
      userEmail: "alice@example.com",
      groupId: "sp-grp-001",
      action: "revoked",
    });

    expect(result.processed).toBe(true);
    expect(result.action).toBe("revoked");
    expect(db.groupMember.deleteMany).toHaveBeenCalledWith({
      where: { groupId: "grp-1", userId: "user-1" },
    });
  });

  it("updates org role when access is approved for organizationRole mapping", async () => {
    (db.sailPointMapping.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "map-1", targetType: "organizationRole", targetId: "admin" },
    ]);
    (db.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1" });
    (db.organizationMember.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "om-1",
      userId: "user-1",
      role: "member",
    });

    const result = await sailpointService.handleSailPointEvent(db, "org-1", {
      eventType: "access_request",
      userEmail: "alice@example.com",
      groupId: "sp-grp-005",
      action: "approved",
    });

    expect(result.processed).toBe(true);
    expect(db.organizationMember.update).toHaveBeenCalledWith({
      where: { id: "om-1" },
      data: { role: "admin" },
    });
  });

  it("resets org role to member when access is revoked for organizationRole mapping", async () => {
    (db.sailPointMapping.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "map-1", targetType: "organizationRole", targetId: "admin" },
    ]);
    (db.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1" });
    (db.organizationMember.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "om-1",
      userId: "user-1",
      role: "admin",
    });

    const result = await sailpointService.handleSailPointEvent(db, "org-1", {
      eventType: "access_request",
      userEmail: "alice@example.com",
      groupId: "sp-grp-005",
      action: "revoked",
    });

    expect(result.processed).toBe(true);
    expect(db.organizationMember.update).toHaveBeenCalledWith({
      where: { id: "om-1" },
      data: { role: "member" },
    });
  });
});

// ── Sync Logging ────────────────────────────────────────────────────────────

describe("logSyncAction", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("creates a sync log entry with all fields", async () => {
    await sailpointService.logSyncAction(
      db,
      "org-1",
      "map-1",
      "group_synced",
      { added: 3, removed: 1 },
      "success",
    );

    expect(db.sailPointSyncLog.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        mappingId: "map-1",
        action: "group_synced",
        details: { added: 3, removed: 1 },
        status: "success",
        error: null,
      },
    });
  });

  it("creates an error log entry", async () => {
    await sailpointService.logSyncAction(
      db,
      "org-1",
      "map-1",
      "error",
      { reason: "API timeout" },
      "failure",
      "Connection timed out",
    );

    expect(db.sailPointSyncLog.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        mappingId: "map-1",
        action: "error",
        details: { reason: "API timeout" },
        status: "failure",
        error: "Connection timed out",
      },
    });
  });

  it("defaults status to success when not provided", async () => {
    await sailpointService.logSyncAction(
      db,
      "org-1",
      null,
      "full_sync",
      { count: 5 },
    );

    expect(db.sailPointSyncLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "success",
        mappingId: null,
      }),
    });
  });
});

// ── getSyncLogs ─────────────────────────────────────────────────────────────

describe("getSyncLogs", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("returns logs with default limit", async () => {
    const mockLogs = [{ id: "log-1", action: "group_synced" }];
    (db.sailPointSyncLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockLogs);

    const result = await sailpointService.getSyncLogs(db, "org-1", { limit: 50 });

    expect(result).toEqual(mockLogs);
    expect(db.sailPointSyncLog.findMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });

  it("filters by mappingId when provided", async () => {
    (db.sailPointSyncLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await sailpointService.getSyncLogs(db, "org-1", {
      mappingId: "map-1",
      limit: 20,
    });

    expect(db.sailPointSyncLog.findMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1", mappingId: "map-1" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  });

  it("supports cursor-based pagination", async () => {
    (db.sailPointSyncLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await sailpointService.getSyncLogs(db, "org-1", {
      limit: 10,
      cursor: "log-50",
    });

    expect(db.sailPointSyncLog.findMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      orderBy: { createdAt: "desc" },
      take: 10,
      skip: 1,
      cursor: { id: "log-50" },
    });
  });
});
