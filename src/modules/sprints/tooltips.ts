/**
 * Tooltip content dictionary for the Sprints module.
 * @module sprints-tooltips
 */

const tooltips = {
  createSprint: "Plan a new time-boxed iteration for your team",
  startSprint: "Activate this sprint and begin tracking progress",
  completeSprint: "End this sprint and move unfinished issues to backlog",
  sprintGoal: "A short objective describing what this sprint delivers",
  sprintVelocity: "Average story points completed per sprint",
  burndownChart: "Track remaining work over the sprint timeline",
} as const;

export default tooltips;
