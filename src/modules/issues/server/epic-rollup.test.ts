import { describe, expect, it, vi, beforeEach } from "vitest";
import { getRollup } from "./epic-rollup";
import { NotFoundError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    issue: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const ISSUE_ID = "epic-1";

const mockParent = {
  id: ISSUE_ID,
  organizationId: ORG_ID,
  projectId: "proj-1",
  summary: "Epic: User Authentication",
  deletedAt: null,
};

function createMockChild(overrides: Record<string, unknown> = {}) {
  return {
    id: `child-${Math.random().toString(36).slice(2, 8)}`,
    organizationId: ORG_ID,
    parentId: ISSUE_ID,
    storyPoints: 5,
    originalEstimate: 3600,
    remainingEstimate: 1800,
    timeSpent: 1800,
    deletedAt: null,
    status: { category: "TO_DO" },
    ...overrides,
  };
}

// ── getRollup ────────────────────────────────────────────────────────────────

describe("getRollup", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue(mockParent);
    db.issue.findMany.mockResolvedValue([]);
  });

  it("returns zeros when no children", async () => {
    db.issue.findMany.mockResolvedValue([]);

    const result = await getRollup(db, ORG_ID, ISSUE_ID);

    expect(result).toEqual({
      storyPoints: 0,
      originalEstimate: 0,
      remainingEstimate: 0,
      timeSpent: 0,
      childCount: 0,
      doneCount: 0,
      progress: 0,
    });
  });

  it("sums storyPoints from children", async () => {
    db.issue.findMany.mockResolvedValue([
      createMockChild({ storyPoints: 3 }),
      createMockChild({ storyPoints: 5 }),
      createMockChild({ storyPoints: 8 }),
    ]);

    const result = await getRollup(db, ORG_ID, ISSUE_ID);

    expect(result.storyPoints).toBe(16);
  });

  it("sums time estimates from children", async () => {
    db.issue.findMany.mockResolvedValue([
      createMockChild({
        originalEstimate: 3600,
        remainingEstimate: 1800,
        timeSpent: 1800,
      }),
      createMockChild({
        originalEstimate: 7200,
        remainingEstimate: 3600,
        timeSpent: 3600,
      }),
    ]);

    const result = await getRollup(db, ORG_ID, ISSUE_ID);

    expect(result.originalEstimate).toBe(10800);
    expect(result.remainingEstimate).toBe(5400);
    expect(result.timeSpent).toBe(5400);
  });

  it("calculates progress as doneCount / childCount", async () => {
    db.issue.findMany.mockResolvedValue([
      createMockChild({ status: { category: "DONE" } }),
      createMockChild({ status: { category: "DONE" } }),
      createMockChild({ status: { category: "IN_PROGRESS" } }),
      createMockChild({ status: { category: "TO_DO" } }),
    ]);

    const result = await getRollup(db, ORG_ID, ISSUE_ID);

    expect(result.progress).toBeCloseTo(0.5);
    expect(result.childCount).toBe(4);
    expect(result.doneCount).toBe(2);
  });

  it("handles null storyPoints by treating them as 0", async () => {
    db.issue.findMany.mockResolvedValue([
      createMockChild({ storyPoints: 5 }),
      createMockChild({ storyPoints: null }),
      createMockChild({ storyPoints: 3 }),
    ]);

    const result = await getRollup(db, ORG_ID, ISSUE_ID);

    expect(result.storyPoints).toBe(8);
  });

  it("returns correct doneCount", async () => {
    db.issue.findMany.mockResolvedValue([
      createMockChild({ status: { category: "DONE" } }),
      createMockChild({ status: { category: "DONE" } }),
      createMockChild({ status: { category: "DONE" } }),
    ]);

    const result = await getRollup(db, ORG_ID, ISSUE_ID);

    expect(result.doneCount).toBe(3);
    expect(result.progress).toBe(1);
  });

  it("throws NotFoundError when issue does not exist", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await expect(getRollup(db, ORG_ID, "nonexistent")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("ignores deleted children", async () => {
    // The service queries with { deletedAt: null }, so deleted children
    // are excluded at the DB level. We verify by confirming only non-deleted
    // children appear in the findMany result.
    db.issue.findMany.mockResolvedValue([
      createMockChild({ storyPoints: 5 }),
    ]);

    const result = await getRollup(db, ORG_ID, ISSUE_ID);

    expect(result.childCount).toBe(1);
    expect(result.storyPoints).toBe(5);
    expect(db.issue.findMany).toHaveBeenCalledWith({
      where: {
        parentId: ISSUE_ID,
        organizationId: ORG_ID,
        deletedAt: null,
      },
      include: { status: true },
    });
  });

  it("handles mix of DONE and non-DONE children", async () => {
    db.issue.findMany.mockResolvedValue([
      createMockChild({ storyPoints: 3, status: { category: "DONE" } }),
      createMockChild({ storyPoints: 5, status: { category: "IN_PROGRESS" } }),
      createMockChild({ storyPoints: 8, status: { category: "TO_DO" } }),
    ]);

    const result = await getRollup(db, ORG_ID, ISSUE_ID);

    expect(result.storyPoints).toBe(16);
    expect(result.doneCount).toBe(1);
    expect(result.childCount).toBe(3);
    expect(result.progress).toBeCloseTo(1 / 3);
  });

  it("returns progress 0 when childCount is 0", async () => {
    db.issue.findMany.mockResolvedValue([]);

    const result = await getRollup(db, ORG_ID, ISSUE_ID);

    expect(result.progress).toBe(0);
    expect(result.childCount).toBe(0);
  });

  it("handles null time tracking fields by treating them as 0", async () => {
    db.issue.findMany.mockResolvedValue([
      createMockChild({
        originalEstimate: null,
        remainingEstimate: null,
        timeSpent: null,
      }),
      createMockChild({
        originalEstimate: 3600,
        remainingEstimate: 1800,
        timeSpent: 900,
      }),
    ]);

    const result = await getRollup(db, ORG_ID, ISSUE_ID);

    expect(result.originalEstimate).toBe(3600);
    expect(result.remainingEstimate).toBe(1800);
    expect(result.timeSpent).toBe(900);
  });

  it("scopes parent lookup to organization", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await getRollup(db, "other-org", ISSUE_ID).catch(() => {});

    expect(db.issue.findFirst).toHaveBeenCalledWith({
      where: { id: ISSUE_ID, organizationId: "other-org", deletedAt: null },
    });
  });
});
