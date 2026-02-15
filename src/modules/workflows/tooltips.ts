/**
 * Tooltip content dictionary for the Workflows module.
 * @module workflows-tooltips
 */

const tooltips = {
  createWorkflow: "Design a new workflow with statuses and transitions",
  addTransition: "Define an allowed path between two statuses",
  transitionCondition: "A rule that must be met before this transition fires",
  postFunction: "An action that runs automatically after a transition",
  workflowScheme: "Map workflows to issue types within a project",
  publishDraft: "Apply pending workflow changes to the live project",
} as const;

export default tooltips;
