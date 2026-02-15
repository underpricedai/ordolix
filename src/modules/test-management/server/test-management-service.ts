import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import type {
  CreateTestSuiteInput,
  CreateTestCaseInput,
  ListTestCasesInput,
  CreateTestRunInput,
  ListTestRunsInput,
  RecordTestResultInput,
  CreateTestCycleInput,
  UpdateTestCycleInput,
  ListTestCyclesInput,
  BulkRecordResultsInput,
} from "../types/schemas";

// ── Test Suite ───────────────────────────────────────────────────────────────

export async function createTestSuite(
  db: PrismaClient,
  organizationId: string,
  input: CreateTestSuiteInput,
) {
  return db.testSuite.create({
    data: {
      organizationId,
      name: input.name,
      description: input.description,
    },
  });
}

export async function getTestSuite(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const suite = await db.testSuite.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { testCases: true } } },
  });
  if (!suite) {
    throw new NotFoundError("TestSuite", id);
  }
  return suite;
}

export async function listTestSuites(
  db: PrismaClient,
  organizationId: string,
) {
  return db.testSuite.findMany({
    where: { organizationId },
    include: { _count: { select: { testCases: true } } },
    orderBy: { name: "asc" as const },
  });
}

export async function updateTestSuite(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: Partial<CreateTestSuiteInput>,
) {
  const suite = await db.testSuite.findFirst({
    where: { id, organizationId },
  });
  if (!suite) {
    throw new NotFoundError("TestSuite", id);
  }
  return db.testSuite.update({
    where: { id },
    data: input,
  });
}

export async function deleteTestSuite(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const suite = await db.testSuite.findFirst({
    where: { id, organizationId },
  });
  if (!suite) {
    throw new NotFoundError("TestSuite", id);
  }
  return db.testSuite.delete({ where: { id } });
}

// ── Test Case ────────────────────────────────────────────────────────────────

export async function createTestCase(
  db: PrismaClient,
  organizationId: string,
  input: CreateTestCaseInput,
) {
  const suite = await db.testSuite.findFirst({
    where: { id: input.testSuiteId, organizationId },
  });
  if (!suite) {
    throw new NotFoundError("TestSuite", input.testSuiteId);
  }

  return db.testCase.create({
    data: {
      organizationId,
      testSuiteId: input.testSuiteId,
      title: input.title,
      description: input.description,
      preconditions: input.preconditions,
      steps: input.steps,
      expectedResult: input.expectedResult,
      priority: input.priority,
      status: input.status,
    },
  });
}

export async function getTestCase(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const testCase = await db.testCase.findFirst({
    where: { id, organizationId },
    include: { testSuite: { select: { id: true, name: true } } },
  });
  if (!testCase) {
    throw new NotFoundError("TestCase", id);
  }
  return testCase;
}

export async function listTestCases(
  db: PrismaClient,
  organizationId: string,
  input: ListTestCasesInput,
) {
  return db.testCase.findMany({
    where: {
      organizationId,
      testSuiteId: input.testSuiteId,
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: { title: "asc" as const },
  });
}

export async function updateTestCase(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: Record<string, unknown>,
) {
  const testCase = await db.testCase.findFirst({
    where: { id, organizationId },
  });
  if (!testCase) {
    throw new NotFoundError("TestCase", id);
  }
  return db.testCase.update({
    where: { id },
    data: input,
  });
}

export async function deleteTestCase(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const testCase = await db.testCase.findFirst({
    where: { id, organizationId },
  });
  if (!testCase) {
    throw new NotFoundError("TestCase", id);
  }
  return db.testCase.delete({ where: { id } });
}

// ── Test Run ─────────────────────────────────────────────────────────────────

export async function createTestRun(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: CreateTestRunInput,
) {
  return db.$transaction(async (tx) => {
    const run = await tx.testRun.create({
      data: {
        organizationId,
        name: input.name,
        executedBy: userId,
      },
    });

    // Create placeholder results for each test case with not_executed status
    if (input.testCaseIds && input.testCaseIds.length > 0) {
      await tx.testResult.createMany({
        data: input.testCaseIds.map((testCaseId: string) => ({
          testRunId: run.id,
          testCaseId,
          status: "not_executed",
        })),
      });
    }

    return run;
  });
}

export async function getTestRun(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const run = await db.testRun.findFirst({
    where: { id, organizationId },
    include: {
      results: {
        include: { testCase: { select: { id: true, title: true } } },
      },
    },
  });
  if (!run) {
    throw new NotFoundError("TestRun", id);
  }
  return run;
}

export async function listTestRuns(
  db: PrismaClient,
  organizationId: string,
  input: ListTestRunsInput,
) {
  return db.testRun.findMany({
    where: {
      organizationId,
      ...(input.status ? { status: input.status } : {}),
    },
    include: { _count: { select: { results: true } } },
    orderBy: { createdAt: "desc" as const },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });
}

export async function updateTestRunStatus(
  db: PrismaClient,
  organizationId: string,
  id: string,
  status: string,
) {
  const run = await db.testRun.findFirst({
    where: { id, organizationId },
  });
  if (!run) {
    throw new NotFoundError("TestRun", id);
  }

  const data: Record<string, unknown> = { status };
  if (status === "in_progress" && !run.startedAt) {
    data.startedAt = new Date();
  }
  if (status === "completed" || status === "aborted") {
    data.completedAt = new Date();
  }

  return db.testRun.update({ where: { id }, data });
}

export async function deleteTestRun(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const run = await db.testRun.findFirst({
    where: { id, organizationId },
  });
  if (!run) {
    throw new NotFoundError("TestRun", id);
  }
  return db.testRun.delete({ where: { id } });
}

// ── Test Result ──────────────────────────────────────────────────────────────

export async function recordTestResult(
  db: PrismaClient,
  organizationId: string,
  input: RecordTestResultInput,
) {
  const run = await db.testRun.findFirst({
    where: { id: input.testRunId, organizationId },
  });
  if (!run) {
    throw new NotFoundError("TestRun", input.testRunId);
  }
  if (run.status === "completed" || run.status === "aborted") {
    throw new ValidationError("Cannot add results to a finished test run", {
      code: "TEST_RUN_FINISHED",
      currentStatus: run.status,
    });
  }

  return db.testResult.upsert({
    where: {
      testRunId_testCaseId: {
        testRunId: input.testRunId,
        testCaseId: input.testCaseId,
      },
    },
    create: {
      testRunId: input.testRunId,
      testCaseId: input.testCaseId,
      status: input.status,
      comment: input.comment,
      duration: input.duration,
    },
    update: {
      status: input.status,
      comment: input.comment,
      duration: input.duration,
      executedAt: new Date(),
    },
  });
}

export async function bulkRecordResults(
  db: PrismaClient,
  organizationId: string,
  input: BulkRecordResultsInput,
) {
  const run = await db.testRun.findFirst({
    where: { id: input.testRunId, organizationId },
  });
  if (!run) {
    throw new NotFoundError("TestRun", input.testRunId);
  }
  if (run.status === "completed" || run.status === "aborted") {
    throw new ValidationError("Cannot add results to a finished test run", {
      code: "TEST_RUN_FINISHED",
      currentStatus: run.status,
    });
  }

  return db.$transaction(
    input.results.map((r) =>
      db.testResult.upsert({
        where: {
          testRunId_testCaseId: {
            testRunId: input.testRunId,
            testCaseId: r.testCaseId,
          },
        },
        create: {
          testRunId: input.testRunId,
          testCaseId: r.testCaseId,
          status: r.status,
          comment: r.comment,
          duration: r.duration,
        },
        update: {
          status: r.status,
          comment: r.comment,
          duration: r.duration,
          executedAt: new Date(),
        },
      }),
    ),
  );
}

// ── Test Cycle ──────────────────────────────────────────────────────────────

export async function createTestCycle(
  db: PrismaClient,
  organizationId: string,
  input: CreateTestCycleInput,
) {
  return db.testCycle.create({
    data: {
      organizationId,
      name: input.name,
      description: input.description,
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
    },
  });
}

export async function getTestCycle(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const cycle = await db.testCycle.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { testRuns: true } } },
  });
  if (!cycle) {
    throw new NotFoundError("TestCycle", id);
  }
  return cycle;
}

export async function listTestCycles(
  db: PrismaClient,
  organizationId: string,
  input: ListTestCyclesInput,
) {
  return db.testCycle.findMany({
    where: {
      organizationId,
      ...(input.status ? { status: input.status } : {}),
    },
    include: { _count: { select: { testRuns: true } } },
    orderBy: { createdAt: "desc" as const },
  });
}

export async function updateTestCycle(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: Omit<UpdateTestCycleInput, "id">,
) {
  const cycle = await db.testCycle.findFirst({
    where: { id, organizationId },
  });
  if (!cycle) {
    throw new NotFoundError("TestCycle", id);
  }
  return db.testCycle.update({
    where: { id },
    data: input,
  });
}

export async function deleteTestCycle(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const cycle = await db.testCycle.findFirst({
    where: { id, organizationId },
  });
  if (!cycle) {
    throw new NotFoundError("TestCycle", id);
  }
  return db.testCycle.delete({ where: { id } });
}
