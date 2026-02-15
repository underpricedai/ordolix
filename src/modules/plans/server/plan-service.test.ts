import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createPlan,
  getPlan,
  listPlans,
  updatePlan,
  deletePlan,
  addScope,
  removeScope,
  getTimeline,
  createScenario,
  updateScenario,
  deleteScenario,
} from "./plan-service";
import { NotFoundError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    plan: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    planIssueScope: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    planScenario: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    issue: {
      findMany: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockPlan = {
  id: "plan-1",
  organizationId: ORG_ID,
  name: "Q1 Roadmap",
  description: "First quarter plan",
  ownerId: USER_ID,
  isShared: false,
  status: "active",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-15"),
};

const mockPlanWithRelations = {
  ...mockPlan,
  scopes: [
    {
      id: "scope-1",
      planId: "plan-1",
      projectId: "proj-1",
      issueId: null,
      position: 0,
    },
  ],
  scenarios: [
    {
      id: "scenario-1",
      planId: "plan-1",
      name: "Baseline",
      isDraft: false,
      isBaseline: true,
      overrides: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

const mockScope = {
  id: "scope-1",
  planId: "plan-1",
  projectId: "proj-1",
  issueId: null,
  position: 0,
  plan: { organizationId: ORG_ID },
};

const mockScenario = {
  id: "scenario-1",
  planId: "plan-1",
  name: "Baseline",
  isDraft: false,
  isBaseline: true,
  overrides: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  plan: { organizationId: ORG_ID },
};

// ── createPlan ───────────────────────────────────────────────────────────────

describe("createPlan", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.plan.create.mockResolvedValue(mockPlan);
  });

  it("creates a plan with correct data", async () => {
    const result = await createPlan(db, ORG_ID, USER_ID, {
      name: "Q1 Roadmap",
      description: "First quarter plan",
    });

    expect(result).toEqual(mockPlan);
    expect(db.plan.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_ID,
        name: "Q1 Roadmap",
        description: "First quarter plan",
        ownerId: USER_ID,
        isShared: false,
      },
    });
  });

  it("defaults isShared to false", async () => {
    await createPlan(db, ORG_ID, USER_ID, { name: "Test" });

    expect(db.plan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isShared: false }),
      }),
    );
  });

  it("respects explicit isShared value", async () => {
    await createPlan(db, ORG_ID, USER_ID, {
      name: "Shared Plan",
      isShared: true,
    });

    expect(db.plan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isShared: true }),
      }),
    );
  });
});

// ── getPlan ──────────────────────────────────────────────────────────────────

describe("getPlan", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.plan.findFirst.mockResolvedValue(mockPlanWithRelations);
  });

  it("returns plan with scopes and scenarios", async () => {
    const result = await getPlan(db, ORG_ID, "plan-1");

    expect(result).toEqual(mockPlanWithRelations);
    expect(db.plan.findFirst).toHaveBeenCalledWith({
      where: { id: "plan-1", organizationId: ORG_ID },
      include: { scopes: true, scenarios: true },
    });
  });

  it("throws NotFoundError when plan does not exist", async () => {
    db.plan.findFirst.mockResolvedValue(null);

    await expect(getPlan(db, ORG_ID, "missing")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── listPlans ────────────────────────────────────────────────────────────────

describe("listPlans", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.plan.findMany.mockResolvedValue([mockPlan]);
  });

  it("returns active plans ordered by updatedAt desc", async () => {
    const result = await listPlans(db, ORG_ID);

    expect(result).toEqual([mockPlan]);
    expect(db.plan.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, status: "active" },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("returns empty array when no plans exist", async () => {
    db.plan.findMany.mockResolvedValue([]);

    const result = await listPlans(db, ORG_ID);

    expect(result).toEqual([]);
  });
});

// ── updatePlan ───────────────────────────────────────────────────────────────

describe("updatePlan", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.plan.findFirst.mockResolvedValue(mockPlan);
    db.plan.update.mockResolvedValue({ ...mockPlan, name: "Updated" });
  });

  it("updates plan fields", async () => {
    const result = await updatePlan(db, ORG_ID, "plan-1", {
      name: "Updated",
    });

    expect(result.name).toBe("Updated");
    expect(db.plan.update).toHaveBeenCalledWith({
      where: { id: "plan-1" },
      data: { name: "Updated" },
    });
  });

  it("throws NotFoundError when plan does not exist", async () => {
    db.plan.findFirst.mockResolvedValue(null);

    await expect(
      updatePlan(db, ORG_ID, "missing", { name: "X" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("scopes lookup to organization", async () => {
    await updatePlan(db, "other-org", "plan-1", { name: "X" });

    expect(db.plan.findFirst).toHaveBeenCalledWith({
      where: { id: "plan-1", organizationId: "other-org" },
    });
  });
});

// ── deletePlan ───────────────────────────────────────────────────────────────

describe("deletePlan", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.plan.findFirst.mockResolvedValue(mockPlan);
    db.plan.delete.mockResolvedValue({});
  });

  it("deletes the plan", async () => {
    await deletePlan(db, ORG_ID, "plan-1");

    expect(db.plan.delete).toHaveBeenCalledWith({ where: { id: "plan-1" } });
  });

  it("throws NotFoundError when plan does not exist", async () => {
    db.plan.findFirst.mockResolvedValue(null);

    await expect(deletePlan(db, ORG_ID, "missing")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── addScope ─────────────────────────────────────────────────────────────────

describe("addScope", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.plan.findFirst.mockResolvedValue(mockPlan);
    db.planIssueScope.create.mockResolvedValue(mockScope);
  });

  it("adds scope to a plan", async () => {
    const result = await addScope(db, ORG_ID, {
      planId: "plan-1",
      projectId: "proj-1",
    });

    expect(result).toEqual(mockScope);
    expect(db.planIssueScope.create).toHaveBeenCalledWith({
      data: {
        planId: "plan-1",
        projectId: "proj-1",
        issueId: null,
        position: 0,
      },
    });
  });

  it("throws NotFoundError when plan does not exist", async () => {
    db.plan.findFirst.mockResolvedValue(null);

    await expect(
      addScope(db, ORG_ID, { planId: "missing", projectId: "proj-1" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("passes optional issueId and position", async () => {
    await addScope(db, ORG_ID, {
      planId: "plan-1",
      projectId: "proj-1",
      issueId: "issue-1",
      position: 5,
    });

    expect(db.planIssueScope.create).toHaveBeenCalledWith({
      data: {
        planId: "plan-1",
        projectId: "proj-1",
        issueId: "issue-1",
        position: 5,
      },
    });
  });
});

// ── removeScope ──────────────────────────────────────────────────────────────

describe("removeScope", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.planIssueScope.findFirst.mockResolvedValue(mockScope);
    db.planIssueScope.delete.mockResolvedValue({});
  });

  it("removes a scope entry", async () => {
    await removeScope(db, ORG_ID, "scope-1");

    expect(db.planIssueScope.delete).toHaveBeenCalledWith({
      where: { id: "scope-1" },
    });
  });

  it("throws NotFoundError when scope does not exist", async () => {
    db.planIssueScope.findFirst.mockResolvedValue(null);

    await expect(removeScope(db, ORG_ID, "missing")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws NotFoundError when scope belongs to different org", async () => {
    db.planIssueScope.findFirst.mockResolvedValue({
      ...mockScope,
      plan: { organizationId: "other-org" },
    });

    await expect(removeScope(db, ORG_ID, "scope-1")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── getTimeline ──────────────────────────────────────────────────────────────

describe("getTimeline", () => {
  let db: ReturnType<typeof createMockDb>;

  const mockIssues = [
    {
      id: "issue-1",
      organizationId: ORG_ID,
      projectId: "proj-1",
      key: "ORD-1",
      summary: "Issue 1",
      issueType: { id: "type-1", name: "Task" },
      status: { id: "status-1", name: "To Do" },
      priority: { id: "pri-1", name: "Medium" },
      assignee: { id: "user-1", name: "Alice", image: null },
      ganttDepsSource: [],
    },
  ];

  beforeEach(() => {
    db = createMockDb();
    db.plan.findFirst.mockResolvedValue(mockPlanWithRelations);
    db.issue.findMany.mockResolvedValue(mockIssues);
  });

  it("returns plan, issues, and projectIds", async () => {
    const result = await getTimeline(db, ORG_ID, "plan-1");

    expect(result.plan).toEqual(mockPlanWithRelations);
    expect(result.issues).toEqual(mockIssues);
    expect(result.projectIds).toEqual(["proj-1"]);
  });

  it("throws NotFoundError when plan does not exist", async () => {
    db.plan.findFirst.mockResolvedValue(null);

    await expect(getTimeline(db, ORG_ID, "missing")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("queries issues scoped to org and plan projects", async () => {
    await getTimeline(db, ORG_ID, "plan-1");

    expect(db.issue.findMany).toHaveBeenCalledWith({
      where: {
        projectId: { in: ["proj-1"] },
        organizationId: ORG_ID,
        deletedAt: null,
      },
      include: {
        issueType: true,
        status: true,
        priority: true,
        assignee: { select: { id: true, name: true, image: true } },
        ganttDepsSource: true,
      },
      orderBy: { createdAt: "asc" },
    });
  });

  it("returns empty issues when plan has no scopes", async () => {
    db.plan.findFirst.mockResolvedValue({
      ...mockPlanWithRelations,
      scopes: [],
    });
    db.issue.findMany.mockResolvedValue([]);

    const result = await getTimeline(db, ORG_ID, "plan-1");

    expect(result.issues).toEqual([]);
    expect(result.projectIds).toEqual([]);
  });
});

// ── createScenario ───────────────────────────────────────────────────────────

describe("createScenario", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.plan.findFirst.mockResolvedValue(mockPlan);
    db.planScenario.create.mockResolvedValue(mockScenario);
  });

  it("creates a scenario for a plan", async () => {
    const result = await createScenario(db, ORG_ID, {
      planId: "plan-1",
      name: "Baseline",
      isBaseline: true,
      isDraft: false,
    });

    expect(result).toEqual(mockScenario);
    expect(db.planScenario.create).toHaveBeenCalledWith({
      data: {
        planId: "plan-1",
        name: "Baseline",
        isDraft: false,
        isBaseline: true,
      },
    });
  });

  it("throws NotFoundError when plan does not exist", async () => {
    db.plan.findFirst.mockResolvedValue(null);

    await expect(
      createScenario(db, ORG_ID, { planId: "missing", name: "Draft" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("defaults isDraft to true and isBaseline to false", async () => {
    await createScenario(db, ORG_ID, {
      planId: "plan-1",
      name: "Quick Draft",
    });

    expect(db.planScenario.create).toHaveBeenCalledWith({
      data: {
        planId: "plan-1",
        name: "Quick Draft",
        isDraft: true,
        isBaseline: false,
      },
    });
  });
});

// ── updateScenario ───────────────────────────────────────────────────────────

describe("updateScenario", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.planScenario.findFirst.mockResolvedValue(mockScenario);
    db.planScenario.update.mockResolvedValue({
      ...mockScenario,
      name: "Updated",
    });
  });

  it("updates scenario fields", async () => {
    const result = await updateScenario(db, ORG_ID, "scenario-1", {
      name: "Updated",
    });

    expect(result.name).toBe("Updated");
    expect(db.planScenario.update).toHaveBeenCalledWith({
      where: { id: "scenario-1" },
      data: { name: "Updated" },
    });
  });

  it("throws NotFoundError when scenario does not exist", async () => {
    db.planScenario.findFirst.mockResolvedValue(null);

    await expect(
      updateScenario(db, ORG_ID, "missing", { name: "X" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when scenario belongs to different org", async () => {
    db.planScenario.findFirst.mockResolvedValue({
      ...mockScenario,
      plan: { organizationId: "other-org" },
    });

    await expect(
      updateScenario(db, ORG_ID, "scenario-1", { name: "X" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteScenario ───────────────────────────────────────────────────────────

describe("deleteScenario", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.planScenario.findFirst.mockResolvedValue(mockScenario);
    db.planScenario.delete.mockResolvedValue({});
  });

  it("deletes a scenario", async () => {
    await deleteScenario(db, ORG_ID, "scenario-1");

    expect(db.planScenario.delete).toHaveBeenCalledWith({
      where: { id: "scenario-1" },
    });
  });

  it("throws NotFoundError when scenario does not exist", async () => {
    db.planScenario.findFirst.mockResolvedValue(null);

    await expect(deleteScenario(db, ORG_ID, "missing")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws NotFoundError when scenario belongs to different org", async () => {
    db.planScenario.findFirst.mockResolvedValue({
      ...mockScenario,
      plan: { organizationId: "other-org" },
    });

    await expect(deleteScenario(db, ORG_ID, "scenario-1")).rejects.toThrow(
      NotFoundError,
    );
  });
});
