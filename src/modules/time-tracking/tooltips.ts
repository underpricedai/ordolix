/**
 * Tooltip content dictionary for the Time Tracking module.
 * @module time-tracking-tooltips
 */

const tooltips = {
  logTime: "Record time spent working on this issue",
  startTimer: "Begin a live timer for the current task",
  timeRemaining: "Estimated time left based on the original estimate",
  timesheet: "View and submit your weekly time log for approval",
  billableTime: "Hours that can be charged to a client or cost center",
  worklogComment: "A note describing what was done during this period",
} as const;

export default tooltips;
