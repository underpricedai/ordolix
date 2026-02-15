import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getDashboardStats,
  listAuditLog,
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getSystemHealth,
} from "./admin-service";
import { NotFoundError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    organizationMember: { count: vi.fn() },
    project: { count: vi.fn() },
    issue: { count: vi.fn() },
    workflow: { count: vi.fn() },
    auditLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    webhookEndpoint: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

// ── getDashboardStats ────────────────────────────────────────────────────────

describe("getDashboardStats", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.organizationMember.count.mockResolvedValue(12);
    db.project.count.mockResolvedValue(5);
    db.issue.count.mockResolvedValue(150);
    db.workflow.count.mockResolvedValue(3);
  });

  it("returns all four stats", async () => {
    const result = await getDashboardStats(db, ORG_ID);

    expect(result).toEqual({
      userCount: 12,
      projectCount: 5,
      issueCount: 150,
      workflowCount: 3,
    });
  });

  it("scopes member count to organization", async () => {
    await getDashboardStats(db, ORG_ID);

    expect(db.organizationMember.count).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID },
    });
  });

  it("counts only non-archived projects", async () => {
    await getDashboardStats(db, ORG_ID);

    expect(db.project.count).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, isArchived: false },
    });
  });

  it("counts only active workflows", async () => {
    await getDashboardStats(db, ORG_ID);

    expect(db.workflow.count).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, isActive: true },
    });
  });
});

// ── listAuditLog ─────────────────────────────────────────────────────────────

describe("listAuditLog", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.auditLog.findMany.mockResolvedValue([]);
  });

  it("returns items and nextCursor", async () => {
    const mockItems = [
      { id: "log-1", action: "CREATED", user: { id: "u-1", name: "Alice", email: "a@e.com" } },
    ];
    db.auditLog.findMany.mockResolvedValue(mockItems);

    const result = await listAuditLog(db, ORG_ID, { limit: 50 });

    expect(result.items).toEqual(mockItems);
    expect(result.nextCursor).toBeUndefined();
  });

  it("sets nextCursor when more items exist", async () => {
    const items = Array.from({ length: 11 }, (_, i) => ({ id: `log-${i}` }));
    db.auditLog.findMany.mockResolvedValue(items);

    const result = await listAuditLog(db, ORG_ID, { limit: 10 });

    expect(result.items).toHaveLength(10);
    expect(result.nextCursor).toBe("log-10");
  });

  it("filters by action when provided", async () => {
    await listAuditLog(db, ORG_ID, { limit: 50, action: "CREATED" });

    expect(db.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: "CREATED" }),
      }),
    );
  });

  it("filters by date range when provided", async () => {
    const startDate = new Date("2026-01-01");
    const endDate = new Date("2026-02-01");

    await listAuditLog(db, ORG_ID, { limit: 50, startDate, endDate });

    expect(db.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gte: startDate, lte: endDate },
        }),
      }),
    );
  });

  it("applies cursor pagination", async () => {
    await listAuditLog(db, ORG_ID, { limit: 50, cursor: "log-5" });

    expect(db.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        cursor: { id: "log-5" },
      }),
    );
  });
});

// ── listWebhooks ─────────────────────────────────────────────────────────────

describe("listWebhooks", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.webhookEndpoint.findMany.mockResolvedValue([]);
  });

  it("returns items scoped to organization", async () => {
    const mockItems = [{ id: "wh-1", url: "https://example.com" }];
    db.webhookEndpoint.findMany.mockResolvedValue(mockItems);

    const result = await listWebhooks(db, ORG_ID, { limit: 50 });

    expect(result.items).toEqual(mockItems);
    expect(db.webhookEndpoint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID },
      }),
    );
  });
});

// ── createWebhook ────────────────────────────────────────────────────────────

describe("createWebhook", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.webhookEndpoint.create.mockResolvedValue({
      id: "wh-1",
      organizationId: ORG_ID,
      url: "https://example.com/hook",
      events: ["issue.created"],
      isActive: true,
    });
    db.auditLog.create.mockResolvedValue({});
  });

  it("creates a webhook and returns it", async () => {
    const result = await createWebhook(db, ORG_ID, USER_ID, {
      url: "https://example.com/hook",
      events: ["issue.created"],
      isActive: true,
    });

    expect(result.id).toBe("wh-1");
    expect(db.webhookEndpoint.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        url: "https://example.com/hook",
        events: ["issue.created"],
      }),
    });
  });

  it("creates an audit log entry", async () => {
    await createWebhook(db, ORG_ID, USER_ID, {
      url: "https://example.com/hook",
      events: ["issue.created"],
      isActive: true,
    });

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        userId: USER_ID,
        entityType: "WebhookEndpoint",
        action: "CREATED",
      }),
    });
  });
});

// ── updateWebhook ────────────────────────────────────────────────────────────

describe("updateWebhook", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.webhookEndpoint.findFirst.mockResolvedValue({
      id: "wh-1",
      organizationId: ORG_ID,
    });
    db.webhookEndpoint.update.mockResolvedValue({
      id: "wh-1",
      url: "https://new-url.com",
    });
  });

  it("updates a webhook", async () => {
    const result = await updateWebhook(db, ORG_ID, {
      id: "wh-1",
      url: "https://new-url.com",
    });

    expect(result.url).toBe("https://new-url.com");
    expect(db.webhookEndpoint.update).toHaveBeenCalledWith({
      where: { id: "wh-1" },
      data: { url: "https://new-url.com" },
    });
  });

  it("throws NotFoundError if webhook not in org", async () => {
    db.webhookEndpoint.findFirst.mockResolvedValue(null);

    await expect(
      updateWebhook(db, ORG_ID, { id: "wh-missing" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteWebhook ────────────────────────────────────────────────────────────

describe("deleteWebhook", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.webhookEndpoint.findFirst.mockResolvedValue({
      id: "wh-1",
      organizationId: ORG_ID,
    });
    db.webhookEndpoint.delete.mockResolvedValue({});
  });

  it("deletes a webhook", async () => {
    await deleteWebhook(db, ORG_ID, "wh-1");

    expect(db.webhookEndpoint.delete).toHaveBeenCalledWith({
      where: { id: "wh-1" },
    });
  });

  it("throws NotFoundError if webhook not in org", async () => {
    db.webhookEndpoint.findFirst.mockResolvedValue(null);

    await expect(
      deleteWebhook(db, ORG_ID, "wh-missing"),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── getSystemHealth ──────────────────────────────────────────────────────────

describe("getSystemHealth", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns healthy status for all subsystems", async () => {
    const result = await getSystemHealth(db, ORG_ID);

    expect(result.database).toBe("healthy");
    expect(result.cache).toBe("healthy");
    expect(result.queue).toBe("healthy");
    expect(result.timestamp).toBeInstanceOf(Date);
  });
});
