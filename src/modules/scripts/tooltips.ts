/**
 * Tooltip content dictionary for the Scripts module.
 * @module scripts-tooltips
 */

const tooltips = {
  createScript: "Write a new server-side script in TypeScript",
  runScript: "Execute this script against the current environment",
  scriptListener: "Trigger a script automatically on system events",
  scriptConsole: "Interactive editor to test scripts in real time",
  scheduledScript: "Run this script on a recurring cron schedule",
  scriptPermissions: "Control who can view, edit, and execute scripts",
} as const;

export default tooltips;
