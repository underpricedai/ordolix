/**
 * Tooltip content dictionary for the Checklists module.
 * @module checklists-tooltips
 */

const tooltips = {
  addChecklist: "Attach a checklist of tasks to this issue",
  addChecklistItem: "Add a new item to this checklist",
  toggleItem: "Mark this checklist item as complete or incomplete",
  checklistTemplate: "Reusable checklist that can be applied to any issue",
  mandatoryChecklist: "All items must be completed before transition",
} as const;

export default tooltips;
