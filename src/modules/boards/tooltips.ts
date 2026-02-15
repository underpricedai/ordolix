/**
 * Tooltip content dictionary for the Boards module.
 * @module boards-tooltips
 */

const tooltips = {
  createBoard: "Create a new Kanban or Scrum board for your team",
  addColumn: "Add a status column to this board layout",
  swimlane: "Horizontal grouping to organize cards by a field",
  cardLayout: "Configure which fields appear on board cards",
  wipLimit: "Set the maximum number of issues allowed in a column",
  quickFilter: "Filter board cards by labels, assignees, or types",
} as const;

export default tooltips;
