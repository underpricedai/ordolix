/**
 * Tooltip content dictionary for the Issues module.
 * @module issues-tooltips
 */

const tooltips = {
  createIssue: "Create a new issue in this project",
  assignee: "The team member responsible for this issue",
  priority: "Issue urgency level (Highest to Lowest)",
  storyPoints: "Estimated effort using the Fibonacci scale",
  linkIssue: "Create a relationship between two issues",
  watchIssue: "Get notified about changes to this issue",
} as const;

export default tooltips;
