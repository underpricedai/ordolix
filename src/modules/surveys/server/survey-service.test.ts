import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createTemplate,
  updateTemplate,
  listTemplates,
  getTemplate,
  deleteTemplate,
  submitResponse,
  getResponsesForIssue,
  getResponsesForTemplate,
  getSurveyStats,
  getAgentPerformance,
} from "./survey-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    surveyTemplate: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    surveyResponse: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    issue: {
      findMany: vi.fn(),
    },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";

// ── createTemplate ────────────────────────────────────────────────────────────

describe("createTemplate", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("creates a template with valid input", async () => {
    db.surveyTemplate.findFirst.mockResolvedValue(null);
    const created = {
      id: "tpl-1",
      organizationId: ORG_ID,
      name: "CSAT Survey",
      trigger: "issue_resolved",
      isActive: true,
      delayMinutes: 30,
      questions: [],
    };
    db.surveyTemplate.create.mockResolvedValue(created);

    const result = await createTemplate(db, ORG_ID, {
      name: "CSAT Survey",
      trigger: "issue_resolved",
      isActive: true,
      delayMinutes: 30,
      questions: [],
    });

    expect(result.name).toBe("CSAT Survey");
    expect(db.surveyTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        name: "CSAT Survey",
      }),
    });
  });

  it("throws ValidationError if name already exists", async () => {
    db.surveyTemplate.findFirst.mockResolvedValue({ id: "tpl-existing" });

    await expect(
      createTemplate(db, ORG_ID, {
        name: "CSAT Survey",
        trigger: "issue_resolved",
        isActive: true,
        delayMinutes: 30,
        questions: [],
      }),
    ).rejects.toThrow(ValidationError);
  });
});

// ── updateTemplate ────────────────────────────────────────────────────────────

describe("updateTemplate", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("updates a template", async () => {
    db.surveyTemplate.findFirst.mockResolvedValue({ id: "tpl-1" });
    db.surveyTemplate.update.mockResolvedValue({
      id: "tpl-1",
      name: "Updated Survey",
    });

    const result = await updateTemplate(db, ORG_ID, "tpl-1", {
      name: "Updated Survey",
    });

    expect(result.name).toBe("Updated Survey");
    expect(db.surveyTemplate.update).toHaveBeenCalledWith({
      where: { id: "tpl-1" },
      data: { name: "Updated Survey" },
    });
  });

  it("throws NotFoundError if template not found", async () => {
    db.surveyTemplate.findFirst.mockResolvedValue(null);

    await expect(
      updateTemplate(db, ORG_ID, "bad-id", { name: "Nope" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("only updates provided fields", async () => {
    db.surveyTemplate.findFirst.mockResolvedValue({ id: "tpl-1" });
    db.surveyTemplate.update.mockResolvedValue({ id: "tpl-1", isActive: false });

    await updateTemplate(db, ORG_ID, "tpl-1", { isActive: false });

    expect(db.surveyTemplate.update).toHaveBeenCalledWith({
      where: { id: "tpl-1" },
      data: { isActive: false },
    });
  });
});

// ── listTemplates ─────────────────────────────────────────────────────────────

describe("listTemplates", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns templates for organization", async () => {
    const templates = [
      { id: "tpl-1", name: "Survey 1" },
      { id: "tpl-2", name: "Survey 2" },
    ];
    db.surveyTemplate.findMany.mockResolvedValue(templates);

    const result = await listTemplates(db, ORG_ID);
    expect(result).toHaveLength(2);
    expect(db.surveyTemplate.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { responses: true } } },
    });
  });
});

// ── getTemplate ───────────────────────────────────────────────────────────────

describe("getTemplate", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns template when found", async () => {
    db.surveyTemplate.findFirst.mockResolvedValue({
      id: "tpl-1",
      name: "CSAT",
    });

    const result = await getTemplate(db, ORG_ID, "tpl-1");
    expect(result.name).toBe("CSAT");
  });

  it("throws NotFoundError when not found", async () => {
    db.surveyTemplate.findFirst.mockResolvedValue(null);

    await expect(getTemplate(db, ORG_ID, "bad-id")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── deleteTemplate ────────────────────────────────────────────────────────────

describe("deleteTemplate", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("deletes an existing template", async () => {
    db.surveyTemplate.findFirst.mockResolvedValue({ id: "tpl-1" });
    db.surveyTemplate.delete.mockResolvedValue({ id: "tpl-1" });

    await deleteTemplate(db, ORG_ID, "tpl-1");
    expect(db.surveyTemplate.delete).toHaveBeenCalledWith({
      where: { id: "tpl-1" },
    });
  });

  it("throws NotFoundError when template not found", async () => {
    db.surveyTemplate.findFirst.mockResolvedValue(null);

    await expect(deleteTemplate(db, ORG_ID, "bad-id")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── submitResponse ────────────────────────────────────────────────────────────

describe("submitResponse", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("creates a response with star rating", async () => {
    db.surveyTemplate.findFirst.mockResolvedValue({ id: "tpl-1" });
    const created = {
      id: "resp-1",
      templateId: "tpl-1",
      starRating: 5,
      comment: "Great job!",
    };
    db.surveyResponse.create.mockResolvedValue(created);

    const result = await submitResponse(db, ORG_ID, {
      templateId: "tpl-1",
      starRating: 5,
      comment: "Great job!",
      answers: {},
    }, "user-1");

    expect(result.starRating).toBe(5);
    expect(db.surveyResponse.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        templateId: "tpl-1",
        starRating: 5,
        respondentId: "user-1",
        comment: "Great job!",
      }),
    });
  });

  it("throws NotFoundError if template not found", async () => {
    db.surveyTemplate.findFirst.mockResolvedValue(null);

    await expect(
      submitResponse(db, ORG_ID, {
        templateId: "bad-id",
        starRating: 3,
        answers: {},
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("creates response without respondentId when not provided", async () => {
    db.surveyTemplate.findFirst.mockResolvedValue({ id: "tpl-1" });
    db.surveyResponse.create.mockResolvedValue({ id: "resp-1" });

    await submitResponse(db, ORG_ID, {
      templateId: "tpl-1",
      starRating: 4,
      answers: {},
      respondentEmail: "anon@test.com",
    });

    expect(db.surveyResponse.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        respondentId: null,
        respondentEmail: "anon@test.com",
      }),
    });
  });

  it("accepts issue context", async () => {
    db.surveyTemplate.findFirst.mockResolvedValue({ id: "tpl-1" });
    db.surveyResponse.create.mockResolvedValue({ id: "resp-1" });

    await submitResponse(db, ORG_ID, {
      templateId: "tpl-1",
      issueId: "issue-1",
      starRating: 2,
      answers: { q1: "Slow" },
    });

    expect(db.surveyResponse.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        issueId: "issue-1",
        answers: { q1: "Slow" },
      }),
    });
  });
});

// ── getResponsesForIssue ──────────────────────────────────────────────────────

describe("getResponsesForIssue", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns responses for an issue", async () => {
    const responses = [
      { id: "r1", starRating: 5, template: { id: "tpl-1", name: "CSAT" } },
    ];
    db.surveyResponse.findMany.mockResolvedValue(responses);

    const result = await getResponsesForIssue(db, ORG_ID, "issue-1");
    expect(result).toHaveLength(1);
    expect(db.surveyResponse.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, issueId: "issue-1" },
      orderBy: { submittedAt: "desc" },
      include: { template: { select: { id: true, name: true } } },
    });
  });
});

// ── getResponsesForTemplate ───────────────────────────────────────────────────

describe("getResponsesForTemplate", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns paginated responses", async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      id: `r${i}`,
      starRating: 3,
    }));
    db.surveyResponse.findMany.mockResolvedValue(items);

    const result = await getResponsesForTemplate(db, ORG_ID, "tpl-1", {
      limit: 50,
    });
    expect(result.items).toHaveLength(5);
    expect(result.nextCursor).toBeUndefined();
  });

  it("returns nextCursor when at limit", async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `r${i}`,
      starRating: 4,
    }));
    db.surveyResponse.findMany.mockResolvedValue(items);

    const result = await getResponsesForTemplate(db, ORG_ID, "tpl-1", {
      limit: 10,
    });
    expect(result.nextCursor).toBe("r9");
  });

  it("applies cursor-based pagination", async () => {
    db.surveyResponse.findMany.mockResolvedValue([]);

    await getResponsesForTemplate(db, ORG_ID, "tpl-1", {
      limit: 50,
      cursor: "cursor-abc",
    });

    expect(db.surveyResponse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        cursor: { id: "cursor-abc" },
      }),
    );
  });
});

// ── getSurveyStats ────────────────────────────────────────────────────────────

describe("getSurveyStats", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("computes average rating and distribution", async () => {
    const now = new Date();
    db.surveyResponse.findMany.mockResolvedValue([
      { starRating: 5, submittedAt: now, issueId: null },
      { starRating: 4, submittedAt: now, issueId: null },
      { starRating: 3, submittedAt: now, issueId: null },
      { starRating: 5, submittedAt: now, issueId: null },
    ]);

    const stats = await getSurveyStats(db, ORG_ID);

    expect(stats.avgRating).toBe(4.25);
    expect(stats.totalResponses).toBe(4);
    expect(stats.ratedResponses).toBe(4);
    expect(stats.distribution[5]).toBe(2);
    expect(stats.distribution[4]).toBe(1);
    expect(stats.distribution[3]).toBe(1);
    expect(stats.distribution[1]).toBe(0);
  });

  it("handles no responses", async () => {
    db.surveyResponse.findMany.mockResolvedValue([]);

    const stats = await getSurveyStats(db, ORG_ID);

    expect(stats.avgRating).toBe(0);
    expect(stats.totalResponses).toBe(0);
    expect(stats.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });

  it("handles responses with null ratings", async () => {
    db.surveyResponse.findMany.mockResolvedValue([
      { starRating: null, submittedAt: new Date(), issueId: null },
      { starRating: 5, submittedAt: new Date(), issueId: null },
    ]);

    const stats = await getSurveyStats(db, ORG_ID);

    expect(stats.avgRating).toBe(5);
    expect(stats.totalResponses).toBe(2);
    expect(stats.ratedResponses).toBe(1);
  });

  it("applies template filter", async () => {
    db.surveyResponse.findMany.mockResolvedValue([]);

    await getSurveyStats(db, ORG_ID, { templateId: "tpl-1" });

    expect(db.surveyResponse.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ templateId: "tpl-1" }),
      select: expect.any(Object),
    });
  });

  it("computes daily trend for last 30 days", async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    db.surveyResponse.findMany.mockResolvedValue([
      { starRating: 5, submittedAt: today, issueId: null },
      { starRating: 3, submittedAt: today, issueId: null },
      { starRating: 4, submittedAt: yesterday, issueId: null },
    ]);

    const stats = await getSurveyStats(db, ORG_ID);

    expect(stats.trend.length).toBeGreaterThanOrEqual(1);
    expect(stats.trend[0]).toHaveProperty("date");
    expect(stats.trend[0]).toHaveProperty("count");
    expect(stats.trend[0]).toHaveProperty("avgRating");
  });
});

// ── getAgentPerformance ───────────────────────────────────────────────────────

describe("getAgentPerformance", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns agent performance sorted by rating", async () => {
    db.surveyResponse.findMany.mockResolvedValue([
      { starRating: 5, comment: "Excellent!", issueId: "issue-1" },
      { starRating: 3, comment: null, issueId: "issue-2" },
      { starRating: 4, comment: "Good", issueId: "issue-1" },
    ]);

    db.issue.findMany.mockResolvedValue([
      {
        id: "issue-1",
        assigneeId: "agent-1",
        assignee: { id: "agent-1", name: "Alice", image: null },
      },
      {
        id: "issue-2",
        assigneeId: "agent-2",
        assignee: { id: "agent-2", name: "Bob", image: null },
      },
    ]);

    const result = await getAgentPerformance(db, ORG_ID);

    expect(result).toHaveLength(2);
    // Alice: avg (5+4)/2 = 4.5, sorted first
    expect(result[0]?.agent.name).toBe("Alice");
    expect(result[0]?.avgRating).toBe(4.5);
    expect(result[0]?.responseCount).toBe(2);
    expect(result[0]?.recentComments).toEqual(["Excellent!", "Good"]);
    // Bob: avg 3
    expect(result[1]?.agent.name).toBe("Bob");
    expect(result[1]?.avgRating).toBe(3);
  });

  it("returns empty array when no responses with issues", async () => {
    db.surveyResponse.findMany.mockResolvedValue([]);

    const result = await getAgentPerformance(db, ORG_ID);
    expect(result).toEqual([]);
  });

  it("skips responses without assigned issues", async () => {
    db.surveyResponse.findMany.mockResolvedValue([
      { starRating: 5, comment: null, issueId: "issue-1" },
    ]);

    db.issue.findMany.mockResolvedValue([
      {
        id: "issue-1",
        assigneeId: null,
        assignee: null,
      },
    ]);

    const result = await getAgentPerformance(db, ORG_ID);
    expect(result).toEqual([]);
  });

  it("respects limit parameter", async () => {
    db.surveyResponse.findMany.mockResolvedValue([
      { starRating: 5, comment: null, issueId: "issue-1" },
      { starRating: 3, comment: null, issueId: "issue-2" },
    ]);

    db.issue.findMany.mockResolvedValue([
      { id: "issue-1", assigneeId: "agent-1", assignee: { id: "agent-1", name: "Alice", image: null } },
      { id: "issue-2", assigneeId: "agent-2", assignee: { id: "agent-2", name: "Bob", image: null } },
    ]);

    const result = await getAgentPerformance(db, ORG_ID, { limit: 1 });
    expect(result).toHaveLength(1);
  });
});
