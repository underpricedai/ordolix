/**
 * Tooltip content dictionary for the Test Management module.
 * @module test-management-tooltips
 */

const tooltips = {
  createTestCase: "Write a new test case with steps and expected results",
  createTestRun: "Execute a set of test cases and record outcomes",
  testStatus: "The result of this test (Passed, Failed, Blocked, Skipped)",
  linkTestToIssue: "Associate this test case with a related issue",
  testCoverage: "Percentage of requirements covered by test cases",
  testFolder: "Organize test cases into a hierarchical folder structure",
} as const;

export default tooltips;
