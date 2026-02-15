import { z } from "zod";

export const testCasePriorityEnum = z.enum(["low", "medium", "high", "critical"]);
export const testCaseStatusEnum = z.enum(["draft", "ready", "deprecated"]);
export const testRunStatusEnum = z.enum(["not_started", "in_progress", "completed", "aborted"]);
export const testResultStatusEnum = z.enum(["passed", "failed", "blocked", "skipped"]);

export const testStepSchema = z.object({
  step: z.string().min(1),
  expectedResult: z.string().optional(),
});

// ── Test Suite ───────────────────────────────────────────────────────────────

export const createTestSuiteInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

export const updateTestSuiteInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

// ── Test Case ────────────────────────────────────────────────────────────────

export const createTestCaseInput = z.object({
  testSuiteId: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  preconditions: z.string().optional(),
  steps: z.array(testStepSchema).default([]),
  expectedResult: z.string().optional(),
  priority: testCasePriorityEnum.default("medium"),
  status: testCaseStatusEnum.default("draft"),
});

export const updateTestCaseInput = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  preconditions: z.string().optional(),
  steps: z.array(testStepSchema).optional(),
  expectedResult: z.string().optional(),
  priority: testCasePriorityEnum.optional(),
  status: testCaseStatusEnum.optional(),
});

export const listTestCasesInput = z.object({
  testSuiteId: z.string().min(1),
  priority: testCasePriorityEnum.optional(),
  status: testCaseStatusEnum.optional(),
});

// ── Test Run ─────────────────────────────────────────────────────────────────

export const createTestRunInput = z.object({
  name: z.string().min(1).max(255),
  testCaseIds: z.array(z.string().min(1)).min(1),
});

export const updateTestRunStatusInput = z.object({
  id: z.string().min(1),
  status: testRunStatusEnum,
});

export const listTestRunsInput = z.object({
  status: testRunStatusEnum.optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

// ── Test Result ──────────────────────────────────────────────────────────────

export const recordTestResultInput = z.object({
  testRunId: z.string().min(1),
  testCaseId: z.string().min(1),
  status: testResultStatusEnum,
  comment: z.string().optional(),
  duration: z.number().int().min(0).optional(),
});

export type CreateTestSuiteInput = z.infer<typeof createTestSuiteInput>;
export type UpdateTestSuiteInput = z.infer<typeof updateTestSuiteInput>;
export type CreateTestCaseInput = z.infer<typeof createTestCaseInput>;
export type UpdateTestCaseInput = z.infer<typeof updateTestCaseInput>;
export type ListTestCasesInput = z.infer<typeof listTestCasesInput>;
export type CreateTestRunInput = z.infer<typeof createTestRunInput>;
export type UpdateTestRunStatusInput = z.infer<typeof updateTestRunStatusInput>;
export type ListTestRunsInput = z.infer<typeof listTestRunsInput>;
export type RecordTestResultInput = z.infer<typeof recordTestResultInput>;

// ── Test Cycle ──────────────────────────────────────────────────────────────

export const createTestCycleInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  plannedStart: z.coerce.date().optional(),
  plannedEnd: z.coerce.date().optional(),
});

export const updateTestCycleInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  plannedStart: z.coerce.date().nullable().optional(),
  plannedEnd: z.coerce.date().nullable().optional(),
  status: z.string().optional(),
});

export const listTestCyclesInput = z.object({
  status: z.string().optional(),
});

export const deleteTestCycleInput = z.object({ id: z.string().min(1) });

export type CreateTestCycleInput = z.infer<typeof createTestCycleInput>;
export type UpdateTestCycleInput = z.infer<typeof updateTestCycleInput>;
export type ListTestCyclesInput = z.infer<typeof listTestCyclesInput>;

// ── Bulk Test Results ───────────────────────────────────────────────────────

export const bulkRecordResultsInput = z.object({
  testRunId: z.string().min(1),
  results: z.array(z.object({
    testCaseId: z.string().min(1),
    status: testResultStatusEnum,
    comment: z.string().optional(),
    duration: z.number().int().min(0).optional(),
  })).min(1),
});

export type BulkRecordResultsInput = z.infer<typeof bulkRecordResultsInput>;
