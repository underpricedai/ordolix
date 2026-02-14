import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createTestSuite,
  getTestSuite,
  listTestSuites,
  updateTestSuite,
  deleteTestSuite,
  createTestCase,
  listTestCases,
  updateTestCase,
  createTestRun,
  getTestRun,
  updateTestRunStatus,
  recordTestResult,
} from "./test-management-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

function createMockDb() {
  return {
    testSuite: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    testCase: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    testRun: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    testResult: {
      upsert: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockSuite = {
  id: "suite-1",
  organizationId: ORG_ID,
  name: "Login Tests",
  description: null,
};

const mockTestCase = {
  id: "tc-1",
  organizationId: ORG_ID,
  testSuiteId: "suite-1",
  title: "Login with valid creds",
  steps: [],
  priority: "medium",
  status: "draft",
};

const mockTestRun = {
  id: "run-1",
  organizationId: ORG_ID,
  name: "Sprint 5",
  status: "not_started",
  executedBy: USER_ID,
  startedAt: null,
  completedAt: null,
};

// ── Test Suite ───────────────────────────────────────────────────────────────

describe("createTestSuite", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.testSuite.create.mockResolvedValue(mockSuite);
  });

  it("creates a test suite", async () => {
    const result = await createTestSuite(db, ORG_ID, { name: "Login Tests" });
    expect(result.id).toBe("suite-1");
    expect(db.testSuite.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        name: "Login Tests",
      }),
    });
  });
});

describe("getTestSuite", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => { db = createMockDb(); });

  it("returns suite with test case count", async () => {
    db.testSuite.findFirst.mockResolvedValue({
      ...mockSuite,
      _count: { testCases: 3 },
    });
    const result = await getTestSuite(db, ORG_ID, "suite-1");
    expect(result._count.testCases).toBe(3);
  });

  it("throws NotFoundError", async () => {
    db.testSuite.findFirst.mockResolvedValue(null);
    await expect(getTestSuite(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });
});

describe("listTestSuites", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.testSuite.findMany.mockResolvedValue([mockSuite]);
  });

  it("returns suites for org", async () => {
    const result = await listTestSuites(db, ORG_ID);
    expect(result).toHaveLength(1);
  });
});

describe("updateTestSuite", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.testSuite.findFirst.mockResolvedValue(mockSuite);
    db.testSuite.update.mockResolvedValue({ ...mockSuite, name: "Updated" });
  });

  it("updates suite", async () => {
    const result = await updateTestSuite(db, ORG_ID, "suite-1", { name: "Updated" });
    expect(result.name).toBe("Updated");
  });

  it("throws NotFoundError", async () => {
    db.testSuite.findFirst.mockResolvedValue(null);
    await expect(updateTestSuite(db, ORG_ID, "nope", { name: "X" })).rejects.toThrow(NotFoundError);
  });
});

describe("deleteTestSuite", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => { db = createMockDb(); });

  it("deletes suite", async () => {
    db.testSuite.findFirst.mockResolvedValue(mockSuite);
    db.testSuite.delete.mockResolvedValue(mockSuite);
    await deleteTestSuite(db, ORG_ID, "suite-1");
    expect(db.testSuite.delete).toHaveBeenCalledWith({ where: { id: "suite-1" } });
  });

  it("throws NotFoundError", async () => {
    db.testSuite.findFirst.mockResolvedValue(null);
    await expect(deleteTestSuite(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });
});

// ── Test Case ────────────────────────────────────────────────────────────────

describe("createTestCase", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.testSuite.findFirst.mockResolvedValue(mockSuite);
    db.testCase.create.mockResolvedValue(mockTestCase);
  });

  it("creates a test case", async () => {
    const result = await createTestCase(db, ORG_ID, {
      testSuiteId: "suite-1",
      title: "Login with valid creds",
      steps: [],
      priority: "medium",
      status: "draft",
    });
    expect(result.id).toBe("tc-1");
  });

  it("throws NotFoundError if suite not found", async () => {
    db.testSuite.findFirst.mockResolvedValue(null);
    await expect(
      createTestCase(db, ORG_ID, {
        testSuiteId: "nope",
        title: "Test",
        steps: [],
        priority: "medium",
        status: "draft",
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("listTestCases", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.testCase.findMany.mockResolvedValue([mockTestCase]);
  });

  it("filters by suite and priority", async () => {
    await listTestCases(db, ORG_ID, {
      testSuiteId: "suite-1",
      priority: "high",
    });

    expect(db.testCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          testSuiteId: "suite-1",
          priority: "high",
        }),
      }),
    );
  });
});

describe("updateTestCase", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.testCase.findFirst.mockResolvedValue(mockTestCase);
    db.testCase.update.mockResolvedValue({ ...mockTestCase, priority: "high" });
  });

  it("updates test case", async () => {
    const result = await updateTestCase(db, ORG_ID, "tc-1", { priority: "high" });
    expect(result.priority).toBe("high");
  });

  it("throws NotFoundError", async () => {
    db.testCase.findFirst.mockResolvedValue(null);
    await expect(updateTestCase(db, ORG_ID, "nope", {})).rejects.toThrow(NotFoundError);
  });
});

// ── Test Run ─────────────────────────────────────────────────────────────────

describe("createTestRun", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.testRun.create.mockResolvedValue(mockTestRun);
  });

  it("creates a test run", async () => {
    const result = await createTestRun(db, ORG_ID, USER_ID, {
      name: "Sprint 5",
      testCaseIds: ["tc-1"],
    });
    expect(result.id).toBe("run-1");
  });
});

describe("getTestRun", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => { db = createMockDb(); });

  it("returns run with results", async () => {
    db.testRun.findFirst.mockResolvedValue({ ...mockTestRun, results: [] });
    const result = await getTestRun(db, ORG_ID, "run-1");
    expect(result.results).toEqual([]);
  });

  it("throws NotFoundError", async () => {
    db.testRun.findFirst.mockResolvedValue(null);
    await expect(getTestRun(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });
});

describe("updateTestRunStatus", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.testRun.findFirst.mockResolvedValue(mockTestRun);
    db.testRun.update.mockResolvedValue({ ...mockTestRun, status: "in_progress" });
  });

  it("sets startedAt when moving to in_progress", async () => {
    await updateTestRunStatus(db, ORG_ID, "run-1", "in_progress");

    expect(db.testRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: expect.objectContaining({
        status: "in_progress",
        startedAt: expect.any(Date),
      }),
    });
  });

  it("sets completedAt when completed", async () => {
    await updateTestRunStatus(db, ORG_ID, "run-1", "completed");

    expect(db.testRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: expect.objectContaining({
        status: "completed",
        completedAt: expect.any(Date),
      }),
    });
  });

  it("throws NotFoundError", async () => {
    db.testRun.findFirst.mockResolvedValue(null);
    await expect(updateTestRunStatus(db, ORG_ID, "nope", "completed")).rejects.toThrow(NotFoundError);
  });
});

// ── Test Result ──────────────────────────────────────────────────────────────

describe("recordTestResult", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.testRun.findFirst.mockResolvedValue(mockTestRun);
    db.testResult.upsert.mockResolvedValue({
      id: "result-1",
      testRunId: "run-1",
      testCaseId: "tc-1",
      status: "passed",
    });
  });

  it("records a result", async () => {
    const result = await recordTestResult(db, ORG_ID, {
      testRunId: "run-1",
      testCaseId: "tc-1",
      status: "passed",
    });

    expect(result.status).toBe("passed");
    expect(db.testResult.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          testRunId_testCaseId: { testRunId: "run-1", testCaseId: "tc-1" },
        },
      }),
    );
  });

  it("throws NotFoundError if run not found", async () => {
    db.testRun.findFirst.mockResolvedValue(null);
    await expect(
      recordTestResult(db, ORG_ID, {
        testRunId: "nope",
        testCaseId: "tc-1",
        status: "passed",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError if run is completed", async () => {
    db.testRun.findFirst.mockResolvedValue({ ...mockTestRun, status: "completed" });
    await expect(
      recordTestResult(db, ORG_ID, {
        testRunId: "run-1",
        testCaseId: "tc-1",
        status: "passed",
      }),
    ).rejects.toThrow(ValidationError);
  });
});
