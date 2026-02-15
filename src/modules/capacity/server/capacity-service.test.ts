import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getTeamCapacity,
  setTeamCapacity,
  setAllocation,
  listAllocations,
  deleteAllocation,
  addTimeOff,
  listTimeOff,
  removeTimeOff,
  computeCapacity,
  getCapacityVsLoad,
} from "./capacity-service";
import { NotFoundError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    teamCapacity: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    userAllocation: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    timeOff: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    issue: {
      aggregate: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";

const mockTeamCapacity = {
  id: "tc-1",
  organizationId: ORG_ID,
  projectId: "proj-1",
  sprintId: null,
  periodStart: new Date("2026-02-01"),
  periodEnd: new Date("2026-02-14"),
  totalHours: 320,
  allocatedHours: 280,
};

const mockAllocation = {
  id: "alloc-1",
  organizationId: ORG_ID,
  userId: "user-1",
  projectId: "proj-1",
  percentage: 100,
  hoursPerDay: 8,
  startDate: new Date("2026-02-01"),
  endDate: null,
};

const mockTimeOff = {
  id: "to-1",
  organizationId: ORG_ID,
  userId: "user-1",
  date: new Date("2026-02-10"),
  hours: 8,
  type: "vacation",
  description: "Day off",
};

// ── getTeamCapacity ─────────────────────────────────────────────────────────

describe("getTeamCapacity", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns team capacity for a project period", async () => {
    db.teamCapacity.findUnique.mockResolvedValue({ ...mockTeamCapacity });

    const result = await getTeamCapacity(
      db,
      ORG_ID,
      "proj-1",
      new Date("2026-02-01"),
      new Date("2026-02-14"),
    );

    expect(result).toEqual(mockTeamCapacity);
    expect(db.teamCapacity.findUnique).toHaveBeenCalledWith({
      where: {
        projectId_periodStart_periodEnd: {
          projectId: "proj-1",
          periodStart: new Date("2026-02-01"),
          periodEnd: new Date("2026-02-14"),
        },
      },
    });
  });

  it("returns null when no capacity record exists", async () => {
    db.teamCapacity.findUnique.mockResolvedValue(null);

    const result = await getTeamCapacity(
      db,
      ORG_ID,
      "proj-1",
      new Date("2026-03-01"),
      new Date("2026-03-14"),
    );

    expect(result).toBeNull();
  });
});

// ── setTeamCapacity ─────────────────────────────────────────────────────────

describe("setTeamCapacity", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.teamCapacity.upsert.mockResolvedValue({ ...mockTeamCapacity });
  });

  it("upserts team capacity with all fields", async () => {
    const input = {
      projectId: "proj-1",
      sprintId: "sprint-1",
      periodStart: new Date("2026-02-01"),
      periodEnd: new Date("2026-02-14"),
      totalHours: 320,
      allocatedHours: 280,
    };

    const result = await setTeamCapacity(db, ORG_ID, input);

    expect(result.totalHours).toBe(320);
    expect(db.teamCapacity.upsert).toHaveBeenCalledWith({
      where: {
        projectId_periodStart_periodEnd: {
          projectId: "proj-1",
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        },
      },
      create: {
        organizationId: ORG_ID,
        projectId: "proj-1",
        sprintId: "sprint-1",
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        totalHours: 320,
        allocatedHours: 280,
      },
      update: {
        totalHours: 320,
        allocatedHours: 280,
        sprintId: "sprint-1",
      },
    });
  });

  it("upserts without optional sprintId", async () => {
    const input = {
      projectId: "proj-1",
      periodStart: new Date("2026-02-01"),
      periodEnd: new Date("2026-02-14"),
      totalHours: 160,
      allocatedHours: 120,
    };

    await setTeamCapacity(db, ORG_ID, input);

    expect(db.teamCapacity.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          sprintId: undefined,
        }),
        update: expect.objectContaining({
          sprintId: undefined,
        }),
      }),
    );
  });
});

// ── setAllocation ───────────────────────────────────────────────────────────

describe("setAllocation", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.userAllocation.create.mockResolvedValue({ ...mockAllocation });
  });

  it("creates an allocation with explicit values", async () => {
    const input = {
      userId: "user-1",
      projectId: "proj-1",
      percentage: 50,
      hoursPerDay: 4,
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-06-30"),
    };

    await setAllocation(db, ORG_ID, input);

    expect(db.userAllocation.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_ID,
        userId: "user-1",
        projectId: "proj-1",
        percentage: 50,
        hoursPerDay: 4,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });
  });

  it("defaults percentage to 100 and hoursPerDay to 8", async () => {
    const input = {
      userId: "user-1",
      projectId: "proj-1",
      startDate: new Date("2026-02-01"),
    };

    await setAllocation(db, ORG_ID, input);

    expect(db.userAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        percentage: 100,
        hoursPerDay: 8,
        endDate: undefined,
      }),
    });
  });
});

// ── listAllocations ─────────────────────────────────────────────────────────

describe("listAllocations", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.userAllocation.findMany.mockResolvedValue([mockAllocation]);
  });

  it("lists allocations for a user", async () => {
    const result = await listAllocations(db, ORG_ID, { userId: "user-1" });

    expect(result).toHaveLength(1);
    expect(db.userAllocation.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, userId: "user-1" },
      orderBy: { startDate: "desc" },
    });
  });

  it("lists allocations for a project", async () => {
    await listAllocations(db, ORG_ID, { projectId: "proj-1" });

    expect(db.userAllocation.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, projectId: "proj-1" },
      orderBy: { startDate: "desc" },
    });
  });

  it("lists all allocations in org when no filters provided", async () => {
    await listAllocations(db, ORG_ID, {});

    expect(db.userAllocation.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID },
      orderBy: { startDate: "desc" },
    });
  });
});

// ── deleteAllocation ────────────────────────────────────────────────────────

describe("deleteAllocation", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("deletes an existing allocation", async () => {
    db.userAllocation.findFirst.mockResolvedValue({ ...mockAllocation });
    db.userAllocation.delete.mockResolvedValue({ ...mockAllocation });

    await deleteAllocation(db, ORG_ID, "alloc-1");

    expect(db.userAllocation.findFirst).toHaveBeenCalledWith({
      where: { id: "alloc-1", organizationId: ORG_ID },
    });
    expect(db.userAllocation.delete).toHaveBeenCalledWith({
      where: { id: "alloc-1" },
    });
  });

  it("throws NotFoundError when allocation does not exist", async () => {
    db.userAllocation.findFirst.mockResolvedValue(null);

    await expect(
      deleteAllocation(db, ORG_ID, "alloc-missing"),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── addTimeOff ──────────────────────────────────────────────────────────────

describe("addTimeOff", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.timeOff.create.mockResolvedValue({ ...mockTimeOff });
  });

  it("creates a time-off entry with explicit values", async () => {
    const input = {
      userId: "user-1",
      date: new Date("2026-02-10"),
      hours: 4,
      type: "sick",
      description: "Half day sick",
    };

    await addTimeOff(db, ORG_ID, input);

    expect(db.timeOff.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_ID,
        userId: "user-1",
        date: input.date,
        hours: 4,
        type: "sick",
        description: "Half day sick",
      },
    });
  });

  it("defaults hours to 8 and type to vacation", async () => {
    const input = {
      userId: "user-1",
      date: new Date("2026-02-10"),
    };

    await addTimeOff(db, ORG_ID, input);

    expect(db.timeOff.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        hours: 8,
        type: "vacation",
        description: undefined,
      }),
    });
  });
});

// ── listTimeOff ─────────────────────────────────────────────────────────────

describe("listTimeOff", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.timeOff.findMany.mockResolvedValue([mockTimeOff]);
  });

  it("lists time-off for a user", async () => {
    const result = await listTimeOff(db, ORG_ID, { userId: "user-1" });

    expect(result).toHaveLength(1);
    expect(db.timeOff.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, userId: "user-1" },
      orderBy: { date: "asc" },
    });
  });

  it("filters by date range", async () => {
    const startDate = new Date("2026-02-01");
    const endDate = new Date("2026-02-28");

    await listTimeOff(db, ORG_ID, { startDate, endDate });

    expect(db.timeOff.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    });
  });

  it("handles startDate-only filter", async () => {
    const startDate = new Date("2026-02-01");

    await listTimeOff(db, ORG_ID, { startDate });

    expect(db.timeOff.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        date: { gte: startDate },
      },
      orderBy: { date: "asc" },
    });
  });

  it("returns all org time-off when no filters provided", async () => {
    await listTimeOff(db, ORG_ID, {});

    expect(db.timeOff.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID },
      orderBy: { date: "asc" },
    });
  });
});

// ── removeTimeOff ───────────────────────────────────────────────────────────

describe("removeTimeOff", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("deletes an existing time-off entry", async () => {
    db.timeOff.findFirst.mockResolvedValue({ ...mockTimeOff });
    db.timeOff.delete.mockResolvedValue({ ...mockTimeOff });

    await removeTimeOff(db, ORG_ID, "to-1");

    expect(db.timeOff.findFirst).toHaveBeenCalledWith({
      where: { id: "to-1", organizationId: ORG_ID },
    });
    expect(db.timeOff.delete).toHaveBeenCalledWith({
      where: { id: "to-1" },
    });
  });

  it("throws NotFoundError when time-off does not exist", async () => {
    db.timeOff.findFirst.mockResolvedValue(null);

    await expect(
      removeTimeOff(db, ORG_ID, "to-missing"),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── computeCapacity ─────────────────────────────────────────────────────────

describe("computeCapacity", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("calculates working days excluding weekends", async () => {
    // Feb 2-8, 2026: Sun(off), Mon, Tue, Wed, Thu, Fri, Sat(off) = 5 working days
    db.userAllocation.findMany.mockResolvedValue([]);
    db.timeOff.findMany.mockResolvedValue([]);

    const result = await computeCapacity(db, ORG_ID, {
      projectId: "proj-1",
      periodStart: new Date("2026-02-02"), // Sunday
      periodEnd: new Date("2026-02-08"), // Saturday
    });

    expect(result.workingDays).toBe(5);
    expect(result.totalCapacityHours).toBe(0);
    expect(result.allocations).toBe(0);
    expect(result.timeOffHours).toBe(0);
  });

  it("calculates a full working week (Mon-Fri)", async () => {
    // Feb 3-7, 2026 = Mon-Fri = 5 working days
    db.userAllocation.findMany.mockResolvedValue([
      { ...mockAllocation, percentage: 100, hoursPerDay: 8 },
    ]);
    db.timeOff.findMany.mockResolvedValue([]);

    const result = await computeCapacity(db, ORG_ID, {
      projectId: "proj-1",
      periodStart: new Date("2026-02-03"), // Monday
      periodEnd: new Date("2026-02-07"), // Friday
    });

    expect(result.workingDays).toBe(5);
    // 5 days * 8 hrs/day * 100% = 40 hours
    expect(result.totalCapacityHours).toBe(40);
    expect(result.allocations).toBe(1);
  });

  it("subtracts time-off from capacity", async () => {
    db.userAllocation.findMany.mockResolvedValue([
      { ...mockAllocation, userId: "user-1", percentage: 100, hoursPerDay: 8 },
    ]);
    db.timeOff.findMany.mockResolvedValue([
      { userId: "user-1", hours: 8 }, // 1 full day off
    ]);

    const result = await computeCapacity(db, ORG_ID, {
      projectId: "proj-1",
      periodStart: new Date("2026-02-03"), // Monday
      periodEnd: new Date("2026-02-07"), // Friday
    });

    // 5 days * 8 hrs * 100% - 8 hrs time-off = 32 hours
    expect(result.totalCapacityHours).toBe(32);
    expect(result.timeOffHours).toBe(8);
  });

  it("applies percentage allocation correctly", async () => {
    db.userAllocation.findMany.mockResolvedValue([
      { ...mockAllocation, userId: "user-1", percentage: 50, hoursPerDay: 8 },
    ]);
    db.timeOff.findMany.mockResolvedValue([]);

    const result = await computeCapacity(db, ORG_ID, {
      projectId: "proj-1",
      periodStart: new Date("2026-02-03"), // Monday
      periodEnd: new Date("2026-02-07"), // Friday
    });

    // 5 days * 8 hrs * 50% = 20 hours
    expect(result.totalCapacityHours).toBe(20);
  });

  it("sums capacity across multiple users", async () => {
    db.userAllocation.findMany.mockResolvedValue([
      { ...mockAllocation, userId: "user-1", percentage: 100, hoursPerDay: 8 },
      { ...mockAllocation, userId: "user-2", percentage: 50, hoursPerDay: 8 },
    ]);
    db.timeOff.findMany.mockResolvedValue([]);

    const result = await computeCapacity(db, ORG_ID, {
      projectId: "proj-1",
      periodStart: new Date("2026-02-03"), // Monday
      periodEnd: new Date("2026-02-07"), // Friday
    });

    // user-1: 5 * 8 * 1.0 = 40 | user-2: 5 * 8 * 0.5 = 20 | total = 60
    expect(result.totalCapacityHours).toBe(60);
    expect(result.allocations).toBe(2);
  });

  it("queries allocations overlapping the period", async () => {
    db.userAllocation.findMany.mockResolvedValue([]);
    db.timeOff.findMany.mockResolvedValue([]);

    const periodStart = new Date("2026-02-01");
    const periodEnd = new Date("2026-02-14");

    await computeCapacity(db, ORG_ID, {
      projectId: "proj-1",
      periodStart,
      periodEnd,
    });

    expect(db.userAllocation.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        projectId: "proj-1",
        startDate: { lte: periodEnd },
        OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
      },
    });
  });
});

// ── getCapacityVsLoad ───────────────────────────────────────────────────────

describe("getCapacityVsLoad", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    // Default: 1 user at 100%, 5 working days (Mon-Fri), no time-off
    db.userAllocation.findMany.mockResolvedValue([
      { ...mockAllocation, percentage: 100, hoursPerDay: 8 },
    ]);
    db.timeOff.findMany.mockResolvedValue([]);
  });

  it("calculates load percentage correctly", async () => {
    // 20 hours planned / 40 hours capacity = 50%
    db.issue.aggregate.mockResolvedValue({
      _sum: { originalEstimate: 72000, storyPoints: 10 }, // 72000s = 20 hrs
    });

    const result = await getCapacityVsLoad(db, ORG_ID, {
      projectId: "proj-1",
      periodStart: new Date("2026-02-03"), // Monday
      periodEnd: new Date("2026-02-07"), // Friday
    });

    expect(result.plannedHours).toBe(20);
    expect(result.plannedPoints).toBe(10);
    expect(result.loadPercent).toBe(50);
    expect(result.isOverallocated).toBe(false);
  });

  it("detects overallocation when load > 100%", async () => {
    // 200 hours planned / 40 hours capacity = 500%
    db.issue.aggregate.mockResolvedValue({
      _sum: { originalEstimate: 720000, storyPoints: 50 }, // 720000s = 200 hrs
    });

    const result = await getCapacityVsLoad(db, ORG_ID, {
      projectId: "proj-1",
      periodStart: new Date("2026-02-03"), // Monday
      periodEnd: new Date("2026-02-07"), // Friday
    });

    expect(result.loadPercent).toBe(500);
    expect(result.isOverallocated).toBe(true);
  });

  it("returns 0 load percent when capacity is zero", async () => {
    db.userAllocation.findMany.mockResolvedValue([]);
    db.issue.aggregate.mockResolvedValue({
      _sum: { originalEstimate: 3600, storyPoints: 1 },
    });

    const result = await getCapacityVsLoad(db, ORG_ID, {
      projectId: "proj-1",
      periodStart: new Date("2026-02-03"), // Monday
      periodEnd: new Date("2026-02-07"), // Friday
    });

    expect(result.totalCapacityHours).toBe(0);
    expect(result.loadPercent).toBe(0);
    expect(result.isOverallocated).toBe(false);
  });

  it("handles null estimate and story points", async () => {
    db.issue.aggregate.mockResolvedValue({
      _sum: { originalEstimate: null, storyPoints: null },
    });

    const result = await getCapacityVsLoad(db, ORG_ID, {
      projectId: "proj-1",
      periodStart: new Date("2026-02-03"), // Monday
      periodEnd: new Date("2026-02-07"), // Friday
    });

    expect(result.plannedHours).toBe(0);
    expect(result.plannedPoints).toBe(0);
    expect(result.loadPercent).toBe(0);
  });

  it("queries issues with correct filters", async () => {
    db.issue.aggregate.mockResolvedValue({
      _sum: { originalEstimate: null, storyPoints: null },
    });

    await getCapacityVsLoad(db, ORG_ID, {
      projectId: "proj-1",
      periodStart: new Date("2026-02-03"), // Monday
      periodEnd: new Date("2026-02-07"), // Friday
    });

    expect(db.issue.aggregate).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        projectId: "proj-1",
        deletedAt: null,
      },
      _sum: { originalEstimate: true, storyPoints: true },
    });
  });
});
