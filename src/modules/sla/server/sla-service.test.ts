import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createSLAConfig,
  updateSLAConfig,
  listSLAConfigs,
  getSLAConfig,
  deleteSLAConfig,
  startSLA,
  pauseSLA,
  resumeSLA,
  completeSLA,
  getSLAInstances,
} from "./sla-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

function createMockDb() {
  return {
    sLAConfig: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    sLAInstance: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";

const mockConfig = {
  id: "sla-config-1",
  organizationId: ORG_ID,
  projectId: null,
  name: "Response SLA",
  metric: "time_to_first_response",
  targetDuration: 60,
  startCondition: { event: "issue_created" },
  stopCondition: { event: "first_response" },
  pauseConditions: [],
  calendar: {},
  escalationRules: [],
  isActive: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockInstance = {
  id: "sla-inst-1",
  organizationId: ORG_ID,
  slaConfigId: "sla-config-1",
  issueId: "issue-1",
  status: "active",
  elapsedMs: 0,
  remainingMs: 3600000,
  breachTime: new Date("2026-01-01T11:00:00Z"),
  startedAt: new Date("2026-01-01T10:00:00Z"),
  pausedAt: null,
  completedAt: null,
};

// ── createSLAConfig ─────────────────────────────────────────────────────────

describe("createSLAConfig", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.sLAConfig.create.mockResolvedValue(mockConfig);
  });

  it("creates a config", async () => {
    const result = await createSLAConfig(db, ORG_ID, {
      name: "Response SLA",
      metric: "time_to_first_response",
      targetDuration: 60,
      startCondition: { event: "issue_created" },
      stopCondition: { event: "first_response" },
      pauseConditions: [],
      calendar: {},
      escalationRules: [],
      isActive: true,
    });

    expect(result.id).toBe("sla-config-1");
    expect(db.sLAConfig.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        name: "Response SLA",
        metric: "time_to_first_response",
        targetDuration: 60,
      }),
    });
  });
});

// ── updateSLAConfig ─────────────────────────────────────────────────────────

describe("updateSLAConfig", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.sLAConfig.findFirst.mockResolvedValue(mockConfig);
    db.sLAConfig.update.mockResolvedValue({ ...mockConfig, name: "Updated" });
  });

  it("updates a config", async () => {
    const result = await updateSLAConfig(db, ORG_ID, "sla-config-1", {
      name: "Updated",
    });

    expect(result.name).toBe("Updated");
    expect(db.sLAConfig.update).toHaveBeenCalledWith({
      where: { id: "sla-config-1" },
      data: expect.objectContaining({ name: "Updated" }),
    });
  });

  it("throws NotFoundError if config not found", async () => {
    db.sLAConfig.findFirst.mockResolvedValue(null);

    await expect(
      updateSLAConfig(db, ORG_ID, "nope", { name: "Updated" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── listSLAConfigs ──────────────────────────────────────────────────────────

describe("listSLAConfigs", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.sLAConfig.findMany.mockResolvedValue([mockConfig]);
  });

  it("returns configs for organization", async () => {
    const result = await listSLAConfigs(db, ORG_ID, {});

    expect(result).toHaveLength(1);
    expect(db.sLAConfig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID },
      }),
    );
  });

  it("filters by isActive", async () => {
    await listSLAConfigs(db, ORG_ID, { isActive: true });

    expect(db.sLAConfig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID, isActive: true },
      }),
    );
  });
});

// ── getSLAConfig ────────────────────────────────────────────────────────────

describe("getSLAConfig", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.sLAConfig.findFirst.mockResolvedValue(mockConfig);
  });

  it("returns a single config", async () => {
    const result = await getSLAConfig(db, ORG_ID, "sla-config-1");

    expect(result.id).toBe("sla-config-1");
  });

  it("throws NotFoundError if not found", async () => {
    db.sLAConfig.findFirst.mockResolvedValue(null);

    await expect(getSLAConfig(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── deleteSLAConfig ─────────────────────────────────────────────────────────

describe("deleteSLAConfig", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.sLAConfig.findFirst.mockResolvedValue(mockConfig);
    db.sLAConfig.delete.mockResolvedValue(mockConfig);
  });

  it("deletes a config", async () => {
    await deleteSLAConfig(db, ORG_ID, "sla-config-1");

    expect(db.sLAConfig.delete).toHaveBeenCalledWith({
      where: { id: "sla-config-1" },
    });
  });

  it("throws NotFoundError if not found", async () => {
    db.sLAConfig.findFirst.mockResolvedValue(null);

    await expect(deleteSLAConfig(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── startSLA ────────────────────────────────────────────────────────────────

describe("startSLA", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.sLAConfig.findFirst.mockResolvedValue(mockConfig);
    db.sLAInstance.create.mockResolvedValue(mockInstance);
  });

  it("creates an instance with calculated breachTime", async () => {
    const result = await startSLA(db, ORG_ID, {
      slaConfigId: "sla-config-1",
      issueId: "issue-1",
    });

    expect(result.id).toBe("sla-inst-1");
    expect(db.sLAInstance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        slaConfigId: "sla-config-1",
        issueId: "issue-1",
        status: "active",
        startedAt: expect.any(Date),
        breachTime: expect.any(Date),
        remainingMs: 3600000,
        elapsedMs: 0,
      }),
    });
  });

  it("throws NotFoundError if config not found", async () => {
    db.sLAConfig.findFirst.mockResolvedValue(null);

    await expect(
      startSLA(db, ORG_ID, { slaConfigId: "nope", issueId: "issue-1" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── pauseSLA ────────────────────────────────────────────────────────────────

describe("pauseSLA", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.sLAInstance.findFirst.mockResolvedValue(mockInstance);
    db.sLAInstance.update.mockResolvedValue({
      ...mockInstance,
      status: "paused",
      pausedAt: new Date(),
    });
  });

  it("pauses an active instance", async () => {
    const result = await pauseSLA(db, ORG_ID, "sla-inst-1");

    expect(result.status).toBe("paused");
    expect(db.sLAInstance.update).toHaveBeenCalledWith({
      where: { id: "sla-inst-1" },
      data: expect.objectContaining({
        status: "paused",
        pausedAt: expect.any(Date),
        elapsedMs: expect.any(Number),
      }),
    });
  });

  it("throws NotFoundError if instance not found", async () => {
    db.sLAInstance.findFirst.mockResolvedValue(null);

    await expect(pauseSLA(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError if not active", async () => {
    db.sLAInstance.findFirst.mockResolvedValue({
      ...mockInstance,
      status: "paused",
    });

    await expect(pauseSLA(db, ORG_ID, "sla-inst-1")).rejects.toThrow(
      ValidationError,
    );
  });
});

// ── resumeSLA ───────────────────────────────────────────────────────────────

describe("resumeSLA", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.sLAInstance.findFirst.mockResolvedValue({
      ...mockInstance,
      status: "paused",
      pausedAt: new Date(Date.now() - 30 * 60 * 1000), // paused 30 min ago
    });
    db.sLAInstance.update.mockResolvedValue({
      ...mockInstance,
      status: "active",
      pausedAt: null,
    });
  });

  it("resumes a paused instance and extends breachTime", async () => {
    const result = await resumeSLA(db, ORG_ID, "sla-inst-1");

    expect(result.status).toBe("active");
    expect(db.sLAInstance.update).toHaveBeenCalledWith({
      where: { id: "sla-inst-1" },
      data: expect.objectContaining({
        status: "active",
        pausedAt: null,
        breachTime: expect.any(Date),
      }),
    });
  });

  it("throws NotFoundError if instance not found", async () => {
    db.sLAInstance.findFirst.mockResolvedValue(null);

    await expect(resumeSLA(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError if not paused", async () => {
    db.sLAInstance.findFirst.mockResolvedValue(mockInstance); // status: "active"

    await expect(resumeSLA(db, ORG_ID, "sla-inst-1")).rejects.toThrow(
      ValidationError,
    );
  });
});

// ── completeSLA ─────────────────────────────────────────────────────────────

describe("completeSLA", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.sLAInstance.findFirst.mockResolvedValue({
      ...mockInstance,
      breachTime: new Date(Date.now() + 60 * 60 * 1000), // breach in 1 hour
    });
    db.sLAInstance.update.mockResolvedValue({
      ...mockInstance,
      status: "met",
      completedAt: new Date(),
    });
  });

  it("marks as met when completed before breachTime", async () => {
    const result = await completeSLA(db, ORG_ID, "sla-inst-1");

    expect(result.status).toBe("met");
    expect(db.sLAInstance.update).toHaveBeenCalledWith({
      where: { id: "sla-inst-1" },
      data: expect.objectContaining({
        status: "met",
        completedAt: expect.any(Date),
      }),
    });
  });

  it("marks as breached when completed after breachTime", async () => {
    db.sLAInstance.findFirst.mockResolvedValue({
      ...mockInstance,
      breachTime: new Date(Date.now() - 60 * 60 * 1000), // breach 1 hour ago
    });
    db.sLAInstance.update.mockResolvedValue({
      ...mockInstance,
      status: "breached",
      completedAt: new Date(),
    });

    const result = await completeSLA(db, ORG_ID, "sla-inst-1");

    expect(result.status).toBe("breached");
    expect(db.sLAInstance.update).toHaveBeenCalledWith({
      where: { id: "sla-inst-1" },
      data: expect.objectContaining({
        status: "breached",
        completedAt: expect.any(Date),
      }),
    });
  });

  it("throws NotFoundError if instance not found", async () => {
    db.sLAInstance.findFirst.mockResolvedValue(null);

    await expect(completeSLA(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws ValidationError if already completed", async () => {
    db.sLAInstance.findFirst.mockResolvedValue({
      ...mockInstance,
      status: "met",
    });

    await expect(completeSLA(db, ORG_ID, "sla-inst-1")).rejects.toThrow(
      ValidationError,
    );
  });
});

// ── getSLAInstances ─────────────────────────────────────────────────────────

describe("getSLAInstances", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.sLAInstance.findMany.mockResolvedValue([mockInstance]);
  });

  it("returns instances for an issue", async () => {
    const result = await getSLAInstances(db, ORG_ID, "issue-1", {
      issueId: "issue-1",
    });

    expect(result).toHaveLength(1);
    expect(db.sLAInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID, issueId: "issue-1" },
      }),
    );
  });

  it("filters by status", async () => {
    await getSLAInstances(db, ORG_ID, "issue-1", {
      issueId: "issue-1",
      status: "active",
    });

    expect(db.sLAInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID, issueId: "issue-1", status: "active" },
      }),
    );
  });
});
