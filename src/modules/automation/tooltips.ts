/**
 * Tooltip content dictionary for the Automation module.
 * @module automation-tooltips
 */

const tooltips = {
  createRule: "Define a new automation rule with triggers and actions",
  trigger: "The event that starts this automation rule",
  condition: "A filter that must be true for the rule to execute",
  action: "The operation performed when the rule fires",
  enableRule: "Activate this rule so it runs on matching events",
  ruleExecutionLog: "View the history of this rule's executions",
} as const;

export default tooltips;
