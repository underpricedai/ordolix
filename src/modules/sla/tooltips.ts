/**
 * Tooltip content dictionary for the SLA module.
 * @module sla-tooltips
 */

const tooltips = {
  createSla: "Define a new Service Level Agreement for this project",
  slaTarget: "The maximum allowed time to meet this SLA goal",
  slaCalendar: "Business hours schedule used for SLA time calculations",
  breachedSla: "This issue has exceeded its SLA target time",
  pauseCondition: "Statuses where the SLA clock stops counting",
  slaReport: "View SLA compliance metrics across your projects",
} as const;

export default tooltips;
