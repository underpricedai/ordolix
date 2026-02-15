/**
 * Tooltip content dictionary for the Budgets module.
 * @module budget-tooltips
 */

const tooltips = {
  budget: "Track planned vs actual spending for a project",
  costRate: "Hourly rate used to compute cost from time logs",
  capex: "Capital expenditure — costs for building new assets",
  opex: "Operational expenditure — ongoing running costs",
  alertThreshold: "Percentage of budget used that triggers a warning",
  periodStart: "Start date for the budget tracking period",
  periodEnd: "End date for the budget tracking period",
} as const;

export default tooltips;
