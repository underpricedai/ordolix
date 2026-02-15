/**
 * Tooltip content dictionary for the Gantt module.
 * @module gantt-tooltips
 */

const tooltips = {
  ganttView: "Visualize project timelines and issue dependencies",
  addDependency: "Create a start-to-finish link between two issues",
  criticalPath: "Highlight the longest chain of dependent issues",
  baselineComparison: "Compare current schedule against the saved baseline",
  autoSchedule: "Automatically adjust dates based on dependencies",
  zoomLevel: "Switch between day, week, month, or quarter views",
} as const;

export default tooltips;
