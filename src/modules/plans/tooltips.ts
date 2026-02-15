/**
 * Tooltip content dictionary for the plans module.
 * @module plan-tooltips
 */

const tooltips = {
  plan: "A cross-project roadmap that combines issues from multiple projects",
  scenario:
    "A what-if scenario that overrides issue fields without changing real data",
  scope: "A project or epic included in this plan's timeline",
} as const;

export default tooltips;
