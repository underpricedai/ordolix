/**
 * Tooltip content dictionary for the Reports module.
 * @module reports-tooltips
 */

const tooltips = {
  createReport: "Build a new report from available data sources",
  reportType: "The visualization style (table, bar, line, pie, etc.)",
  dateRange: "The time period covered by this report",
  exportReport: "Download this report as CSV, PDF, or Excel",
  scheduleReport: "Automatically email this report on a recurring basis",
  savedFilter: "A reusable AQL query that powers this report's data",
} as const;

export default tooltips;
