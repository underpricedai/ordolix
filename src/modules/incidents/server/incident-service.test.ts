import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createIncident,
  getIncident,
  listIncidents,
  updateIncident,
  addTimelineEntry,
  addCommunication,
  resolveIncident,
  deleteIncident,
} from "./incident-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

function createMockDb() {
  return {
    issue: { findFirst: vi.fn() },
    incident: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";

const mockIncident = {
  id: "inc-1",
  organizationId: ORG_ID,
  issueId: "issue-1",
  severity: "P1",
  timeline: [],
  communications: [],
  statusPageUpdate: null,
  startedAt: new Date("2026-01-01"),
  resolvedAt: null,
  createdAt: new Date("2026-01-01"),
  issue: { id: "issue-1", key: "PROJ-1", summary: "Test issue" },
};

// ── createIncident ──────────────────────────────────────────────────────────

describe("createIncident", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue({ id: "issue-1" });
    db.incident.create.mockResolvedValue(mockIncident);
  });

  it("creates an incident for a valid issue", async () => {
    const result = await createIncident(db, ORG_ID, {
      issueId: "issue-1",
      severity: "P1",
    });

    expect(result.id).toBe("inc-1");
    expect(db.incident.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        issueId: "issue-1",
        severity: "P1",
        startedAt: expect.any(Date),
      }),
      include: expect.any(Object),
    });
  });

  it("throws NotFoundError if issue does not exist", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await expect(
      createIncident(db, ORG_ID, { issueId: "nope", severity: "P2" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── getIncident ─────────────────────────────────────────────────────────────

describe("getIncident", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.incident.findFirst.mockResolvedValue(mockIncident);
  });

  it("returns incident with issue details", async () => {
    const result = await getIncident(db, ORG_ID, "inc-1");

    expect(result.id).toBe("inc-1");
    expect(result.issue.key).toBe("PROJ-1");
    expect(db.incident.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inc-1", organizationId: ORG_ID },
      }),
    );
  });

  it("throws NotFoundError if incident does not exist", async () => {
    db.incident.findFirst.mockResolvedValue(null);

    await expect(getIncident(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── listIncidents ───────────────────────────────────────────────────────────

describe("listIncidents", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.incident.findMany.mockResolvedValue([mockIncident]);
  });

  it("returns incidents for organization", async () => {
    const result = await listIncidents(db, ORG_ID, { limit: 50 });

    expect(result).toHaveLength(1);
    expect(db.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID },
        take: 50,
      }),
    );
  });

  it("filters by severity", async () => {
    await listIncidents(db, ORG_ID, { severity: "P1", limit: 50 });

    expect(db.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID, severity: "P1" },
      }),
    );
  });

  it("filters by resolved=true", async () => {
    await listIncidents(db, ORG_ID, { resolved: true, limit: 50 });

    expect(db.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID, resolvedAt: { not: null } },
      }),
    );
  });

  it("filters by resolved=false", async () => {
    await listIncidents(db, ORG_ID, { resolved: false, limit: 50 });

    expect(db.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID, resolvedAt: null },
      }),
    );
  });

  it("applies cursor pagination", async () => {
    await listIncidents(db, ORG_ID, { limit: 10, cursor: "inc-5" });

    expect(db.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 1,
        cursor: { id: "inc-5" },
      }),
    );
  });
});

// ── updateIncident ──────────────────────────────────────────────────────────

describe("updateIncident", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.incident.findFirst.mockResolvedValue(mockIncident);
    db.incident.update.mockResolvedValue({ ...mockIncident, severity: "P2" });
  });

  it("updates severity", async () => {
    const result = await updateIncident(db, ORG_ID, "inc-1", {
      severity: "P2",
    });

    expect(result.severity).toBe("P2");
    expect(db.incident.update).toHaveBeenCalledWith({
      where: { id: "inc-1" },
      data: expect.objectContaining({ severity: "P2" }),
      include: expect.any(Object),
    });
  });

  it("throws NotFoundError if incident does not exist", async () => {
    db.incident.findFirst.mockResolvedValue(null);

    await expect(
      updateIncident(db, ORG_ID, "nope", { severity: "P3" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── addTimelineEntry ────────────────────────────────────────────────────────

describe("addTimelineEntry", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.incident.findFirst.mockResolvedValue(mockIncident);
    db.incident.update.mockResolvedValue({
      ...mockIncident,
      timeline: [{ event: "Escalated", timestamp: "2026-01-01T00:00:00.000Z" }],
    });
  });

  it("appends entry with timestamp to timeline", async () => {
    await addTimelineEntry(db, ORG_ID, "inc-1", { event: "Escalated" });

    expect(db.incident.update).toHaveBeenCalledWith({
      where: { id: "inc-1" },
      data: {
        timeline: [
          expect.objectContaining({
            event: "Escalated",
            timestamp: expect.any(String),
          }),
        ],
      },
      include: expect.any(Object),
    });
  });

  it("throws NotFoundError if incident does not exist", async () => {
    db.incident.findFirst.mockResolvedValue(null);

    await expect(
      addTimelineEntry(db, ORG_ID, "nope", { event: "Escalated" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── addCommunication ────────────────────────────────────────────────────────

describe("addCommunication", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.incident.findFirst.mockResolvedValue(mockIncident);
    db.incident.update.mockResolvedValue({
      ...mockIncident,
      communications: [
        {
          channel: "slack",
          message: "Investigating",
          timestamp: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
  });

  it("appends entry with timestamp to communications", async () => {
    await addCommunication(db, ORG_ID, "inc-1", {
      channel: "slack",
      message: "Investigating",
    });

    expect(db.incident.update).toHaveBeenCalledWith({
      where: { id: "inc-1" },
      data: {
        communications: [
          expect.objectContaining({
            channel: "slack",
            message: "Investigating",
            timestamp: expect.any(String),
          }),
        ],
      },
      include: expect.any(Object),
    });
  });

  it("throws NotFoundError if incident does not exist", async () => {
    db.incident.findFirst.mockResolvedValue(null);

    await expect(
      addCommunication(db, ORG_ID, "nope", {
        channel: "slack",
        message: "test",
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── resolveIncident ─────────────────────────────────────────────────────────

describe("resolveIncident", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.incident.findFirst.mockResolvedValue(mockIncident);
    db.incident.update.mockResolvedValue({
      ...mockIncident,
      resolvedAt: new Date(),
      timeline: [
        { event: "Incident resolved", timestamp: "2026-01-01T00:00:00.000Z" },
      ],
    });
  });

  it("resolves an open incident", async () => {
    const result = await resolveIncident(db, ORG_ID, "inc-1");

    expect(result.resolvedAt).toBeDefined();
    expect(db.incident.update).toHaveBeenCalledWith({
      where: { id: "inc-1" },
      data: {
        resolvedAt: expect.any(Date),
        timeline: [
          expect.objectContaining({
            event: "Incident resolved",
            timestamp: expect.any(String),
          }),
        ],
      },
      include: expect.any(Object),
    });
  });

  it("throws NotFoundError if incident does not exist", async () => {
    db.incident.findFirst.mockResolvedValue(null);

    await expect(resolveIncident(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws ValidationError if already resolved", async () => {
    db.incident.findFirst.mockResolvedValue({
      ...mockIncident,
      resolvedAt: new Date("2026-01-02"),
    });

    await expect(resolveIncident(db, ORG_ID, "inc-1")).rejects.toThrow(
      ValidationError,
    );
  });
});

// ── deleteIncident ──────────────────────────────────────────────────────────

describe("deleteIncident", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.incident.findFirst.mockResolvedValue(mockIncident);
    db.incident.delete.mockResolvedValue(mockIncident);
  });

  it("deletes an existing incident", async () => {
    await deleteIncident(db, ORG_ID, "inc-1");

    expect(db.incident.delete).toHaveBeenCalledWith({
      where: { id: "inc-1" },
    });
  });

  it("throws NotFoundError if incident does not exist", async () => {
    db.incident.findFirst.mockResolvedValue(null);

    await expect(deleteIncident(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});
