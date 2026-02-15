/**
 * Tooltip content dictionary for the Queues module.
 * @module queues-tooltips
 */

const tooltips = {
  createQueue: "Define a filtered list of issues for your team to triage",
  queueFilter: "The AQL query that determines which issues appear",
  sortOrder: "The default ordering of issues in this queue",
  assignFromQueue: "Pick up the next unassigned issue in the queue",
  queueVisibility: "Control which teams can see and use this queue",
} as const;

export default tooltips;
