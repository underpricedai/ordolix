/** Default configuration constants matching Jira Cloud fresh instance defaults */

// ── Issue Types ──────────────────────────────────────────────────────────────

export const DEFAULT_ISSUE_TYPES = {
  software: [
    { name: "Epic", icon: "zap", color: "#904EE2", isSubtask: false, hierarchyLevel: 1, category: "software" },
    { name: "Story", icon: "bookmark", color: "#63BA3C", isSubtask: false, hierarchyLevel: 0, category: "software" },
    { name: "Task", icon: "check-square", color: "#4BADE8", isSubtask: false, hierarchyLevel: 0, category: "software" },
    { name: "Bug", icon: "circle-dot", color: "#E5493A", isSubtask: false, hierarchyLevel: 0, category: "software" },
    { name: "Subtask", icon: "subtask", color: "#4BADE8", isSubtask: true, hierarchyLevel: -1, category: "software" },
  ],
  serviceManagement: [
    { name: "Service Request", icon: "headset", color: "#4BADE8", isSubtask: false, hierarchyLevel: 0, category: "service_management" },
    { name: "Incident", icon: "alert-triangle", color: "#E5493A", isSubtask: false, hierarchyLevel: 0, category: "service_management" },
    { name: "Problem", icon: "search", color: "#FF8B00", isSubtask: false, hierarchyLevel: 0, category: "service_management" },
    { name: "Change", icon: "refresh-cw", color: "#904EE2", isSubtask: false, hierarchyLevel: 0, category: "service_management" },
  ],
} as const;

// ── Status Categories ────────────────────────────────────────────────────────

export const STATUS_CATEGORIES = {
  TO_DO: { color: "#42526E", label: "To Do" },
  IN_PROGRESS: { color: "#0052CC", label: "In Progress" },
  DONE: { color: "#00875A", label: "Done" },
} as const;

// ── Statuses ─────────────────────────────────────────────────────────────────

export const DEFAULT_STATUSES = {
  simplified: [
    { name: "To Do", category: "TO_DO", color: "#42526E" },
    { name: "In Progress", category: "IN_PROGRESS", color: "#0052CC" },
    { name: "Done", category: "DONE", color: "#00875A" },
  ],
  classic: [
    { name: "Open", category: "TO_DO", color: "#42526E" },
    { name: "In Progress", category: "IN_PROGRESS", color: "#0052CC" },
    { name: "In Review", category: "IN_PROGRESS", color: "#0052CC" },
    { name: "Reopened", category: "TO_DO", color: "#42526E" },
    { name: "Resolved", category: "DONE", color: "#00875A" },
    { name: "Closed", category: "DONE", color: "#00875A" },
  ],
  serviceManagement: [
    { name: "Waiting for Support", category: "IN_PROGRESS", color: "#0052CC" },
    { name: "Waiting for Customer", category: "IN_PROGRESS", color: "#0052CC" },
    { name: "Escalated", category: "IN_PROGRESS", color: "#0052CC" },
    { name: "Pending Approval", category: "IN_PROGRESS", color: "#0052CC" },
    { name: "Approved", category: "IN_PROGRESS", color: "#0052CC" },
    { name: "Implementing", category: "IN_PROGRESS", color: "#0052CC" },
    { name: "Under Investigation", category: "IN_PROGRESS", color: "#0052CC" },
    { name: "Known Error", category: "IN_PROGRESS", color: "#0052CC" },
    { name: "Canceled", category: "DONE", color: "#00875A" },
  ],
} as const;

// ── Priorities ───────────────────────────────────────────────────────────────

export const DEFAULT_PRIORITIES = [
  { name: "Highest", rank: 1, color: "#CE0000", slaMultiplier: 0.25 },
  { name: "High", rank: 2, color: "#EA7D24", slaMultiplier: 0.5 },
  { name: "Medium", rank: 3, color: "#FFAB00", slaMultiplier: 1.0 },
  { name: "Low", rank: 4, color: "#2A8735", slaMultiplier: 2.0 },
  { name: "Lowest", rank: 5, color: "#4A6785", slaMultiplier: 4.0 },
] as const;

// ── Resolutions ──────────────────────────────────────────────────────────────

export const DEFAULT_RESOLUTIONS = [
  { name: "Done", description: "Work has been completed" },
  { name: "Won't Do", description: "This issue won't be actioned" },
  { name: "Duplicate", description: "The issue is a duplicate of another issue" },
  { name: "Cannot Reproduce", description: "The issue could not be reproduced" },
] as const;

// ── Workflows (transition definitions) ──────────────────────────────────────

export const DEFAULT_WORKFLOWS = {
  simplified: {
    name: "Simplified Workflow",
    description: "All transitions allowed between all statuses",
    transitions: [
      { from: "To Do", to: "In Progress", name: "Start Progress" },
      { from: "In Progress", to: "Done", name: "Done" },
      { from: "In Progress", to: "To Do", name: "Stop Progress" },
      { from: "Done", to: "To Do", name: "Reopen" },
      { from: "To Do", to: "Done", name: "Done" },
      { from: "Done", to: "In Progress", name: "Reopen and Start" },
    ],
  },
  classic: {
    name: "Classic Software Workflow",
    description: "Restricted transitions with review step",
    transitions: [
      { from: "Open", to: "In Progress", name: "Start Progress" },
      { from: "In Progress", to: "In Review", name: "Submit for Review" },
      { from: "In Review", to: "Resolved", name: "Resolve" },
      { from: "Resolved", to: "Closed", name: "Close" },
      { from: "Resolved", to: "Reopened", name: "Reopen" },
      { from: "Closed", to: "Reopened", name: "Reopen" },
      { from: "Reopened", to: "In Progress", name: "Start Progress" },
    ],
  },
} as const;

// ── Permissions ──────────────────────────────────────────────────────────────

export const DEFAULT_ROLES = ["administrator", "member", "viewer"] as const;

export const DEFAULT_PERMISSIONS = {
  administrator: [
    "browse_project", "create_issues", "edit_issues", "delete_issues",
    "transition_issues", "assign_issues", "add_comments", "delete_comments_own",
    "delete_comments_all", "add_attachments", "log_time", "edit_time_all",
    "manage_sprints", "manage_board", "manage_gantt", "manage_checklists",
    "manage_test_cases", "manage_assets", "manage_automation", "manage_scripts",
    "administer_project",
  ],
  member: [
    "browse_project", "create_issues", "edit_issues", "transition_issues",
    "assign_issues", "add_comments", "delete_comments_own", "add_attachments",
    "log_time", "manage_sprints", "manage_gantt", "manage_checklists",
    "manage_test_cases",
  ],
  viewer: ["browse_project"],
} as const;

// ── Board Configuration ─────────────────────────────────────────────────────

export const DEFAULT_BOARD_CONFIG = {
  columns: [
    { name: "To Do", statuses: ["To Do"], wipLimit: null },
    { name: "In Progress", statuses: ["In Progress"], wipLimit: null },
    { name: "Done", statuses: ["Done"], wipLimit: null },
  ],
  cardFields: ["key", "summary", "priority", "assignee", "storyPoints"],
  cardColor: "priority",
  quickFilters: [
    { name: "Only My Issues", aql: "assignee = currentUser()" },
    { name: "Recently Updated", aql: "updatedDate >= -1d" },
  ],
} as const;

// ── SLA Configurations ──────────────────────────────────────────────────────

export const DEFAULT_SLA_CONFIGS = {
  serviceRequest: [
    {
      name: "Time to First Response",
      metric: "first_response",
      targetDuration: 4 * 60 * 60 * 1000, // 4 business hours in ms
      startCondition: { event: "issue_created" },
      stopCondition: { event: "first_agent_comment" },
      pauseConditions: [{ status: "Waiting for Customer" }],
    },
    {
      name: "Time to Resolution",
      metric: "resolution",
      targetDuration: 8 * 60 * 60 * 1000, // 8 business hours
      startCondition: { event: "issue_created" },
      stopCondition: { statusCategory: "DONE" },
      pauseConditions: [{ status: "Waiting for Customer" }],
    },
  ],
  incident: [
    {
      name: "Time to First Response",
      metric: "first_response",
      targetDuration: 1 * 60 * 60 * 1000, // 1 business hour
      startCondition: { event: "issue_created" },
      stopCondition: { event: "first_agent_comment" },
      pauseConditions: [{ status: "Waiting for Customer" }],
    },
    {
      name: "Time to Resolution",
      metric: "resolution",
      targetDuration: 4 * 60 * 60 * 1000, // 4 business hours
      startCondition: { event: "issue_created" },
      stopCondition: { statusCategory: "DONE" },
      pauseConditions: [{ status: "Waiting for Customer" }],
    },
  ],
} as const;

// ── Issue Link Types ────────────────────────────────────────────────────────

export const DEFAULT_LINK_TYPES = [
  { name: "blocks", outward: "blocks", inward: "is blocked by" },
  { name: "clones", outward: "clones", inward: "is cloned by" },
  { name: "duplicates", outward: "duplicates", inward: "is duplicated by" },
  { name: "relates", outward: "relates to", inward: "relates to" },
  { name: "causes", outward: "causes", inward: "is caused by" },
  { name: "epic", outward: "has epic", inward: "is epic of" },
  { name: "parent", outward: "is parent of", inward: "is child of" },
] as const;

// ── Business Hours Calendar ─────────────────────────────────────────────────

export const DEFAULT_BUSINESS_HOURS = {
  timezone: "UTC",
  schedule: {
    monday: { start: "09:00", end: "17:00" },
    tuesday: { start: "09:00", end: "17:00" },
    wednesday: { start: "09:00", end: "17:00" },
    thursday: { start: "09:00", end: "17:00" },
    friday: { start: "09:00", end: "17:00" },
    saturday: null,
    sunday: null,
  },
  holidays: [],
} as const;

// ── Project Templates ───────────────────────────────────────────────────────

export const DEFAULT_PROJECT_TEMPLATES = [
  { key: "kanban", name: "Kanban Software", description: "Kanban board with backlog and story points" },
  { key: "scrum", name: "Scrum Software", description: "Sprint-based development with velocity tracking" },
  { key: "bug-tracking", name: "Bug Tracking", description: "Simple bug tracking with classic workflow" },
  { key: "itsm", name: "IT Service Management", description: "Service desk with queues, SLAs, forms, and approvals" },
  { key: "blank", name: "Blank Project", description: "Minimal project with tasks only" },
] as const;

// ── Dashboard Widgets ───────────────────────────────────────────────────────

export const DEFAULT_DASHBOARD_WIDGETS = [
  { type: "assigned_to_me", title: "Assigned to Me" },
  { type: "activity_stream", title: "Activity Stream", config: { days: 7 } },
  { type: "created_vs_resolved", title: "Created vs Resolved", config: { days: 30 } },
  { type: "pie_by_priority", title: "Issues by Priority" },
] as const;

// ── Demo Users ──────────────────────────────────────────────────────────────

export const DEMO_USERS = [
  { name: "Alex Morgan", email: "alex.morgan@ordolix.dev", role: "administrator" },
  { name: "Jordan Lee", email: "jordan.lee@ordolix.dev", role: "member" },
  { name: "Casey Smith", email: "casey.smith@ordolix.dev", role: "member" },
  { name: "Riley Johnson", email: "riley.johnson@ordolix.dev", role: "member" },
  { name: "Taylor Brown", email: "taylor.brown@ordolix.dev", role: "viewer" },
] as const;
