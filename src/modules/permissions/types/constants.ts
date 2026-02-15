/**
 * Permission key constants for the Ordolix RBAC system.
 *
 * @description Defines all project-level and global permission keys,
 * mirroring Jira Cloud's permission model.
 *
 * @module permission-constants
 */

/** Project-level permission keys (scoped to a project via PermissionScheme). */
export const PROJECT_PERMISSIONS = {
  BROWSE_PROJECTS: "BROWSE_PROJECTS",
  CREATE_ISSUES: "CREATE_ISSUES",
  EDIT_ISSUES: "EDIT_ISSUES",
  DELETE_ISSUES: "DELETE_ISSUES",
  ASSIGN_ISSUES: "ASSIGN_ISSUES",
  ASSIGNABLE_USER: "ASSIGNABLE_USER",
  CLOSE_ISSUES: "CLOSE_ISSUES",
  TRANSITION_ISSUES: "TRANSITION_ISSUES",
  SCHEDULE_ISSUES: "SCHEDULE_ISSUES",
  MOVE_ISSUES: "MOVE_ISSUES",
  SET_ISSUE_SECURITY: "SET_ISSUE_SECURITY",
  LINK_ISSUES: "LINK_ISSUES",
  CREATE_ATTACHMENTS: "CREATE_ATTACHMENTS",
  DELETE_ATTACHMENTS: "DELETE_ATTACHMENTS",
  ADD_COMMENTS: "ADD_COMMENTS",
  EDIT_ALL_COMMENTS: "EDIT_ALL_COMMENTS",
  DELETE_ALL_COMMENTS: "DELETE_ALL_COMMENTS",
  EDIT_OWN_COMMENTS: "EDIT_OWN_COMMENTS",
  DELETE_OWN_COMMENTS: "DELETE_OWN_COMMENTS",
  MANAGE_WATCHERS: "MANAGE_WATCHERS",
  VIEW_WATCHERS: "VIEW_WATCHERS",
  VIEW_VOTERS: "VIEW_VOTERS",
  LOG_WORK: "LOG_WORK",
  EDIT_ALL_WORKLOGS: "EDIT_ALL_WORKLOGS",
  DELETE_ALL_WORKLOGS: "DELETE_ALL_WORKLOGS",
  EDIT_OWN_WORKLOGS: "EDIT_OWN_WORKLOGS",
  DELETE_OWN_WORKLOGS: "DELETE_OWN_WORKLOGS",
  ADMINISTER_PROJECTS: "ADMINISTER_PROJECTS",
  MANAGE_SPRINTS: "MANAGE_SPRINTS",
} as const;

export type ProjectPermissionKey =
  (typeof PROJECT_PERMISSIONS)[keyof typeof PROJECT_PERMISSIONS];

/** All project permission keys as an array (useful for iteration). */
export const ALL_PROJECT_PERMISSIONS = Object.values(
  PROJECT_PERMISSIONS,
) as ProjectPermissionKey[];

/** Global permission keys (org-wide, not tied to a specific project). */
export const GLOBAL_PERMISSIONS = {
  ADMINISTER: "ADMINISTER",
  BROWSE_USERS: "BROWSE_USERS",
  CREATE_PROJECT: "CREATE_PROJECT",
  BULK_CHANGE: "BULK_CHANGE",
  MANAGE_GROUP_MEMBERSHIP: "MANAGE_GROUP_MEMBERSHIP",
} as const;

export type GlobalPermissionKey =
  (typeof GLOBAL_PERMISSIONS)[keyof typeof GLOBAL_PERMISSIONS];

export const ALL_GLOBAL_PERMISSIONS = Object.values(
  GLOBAL_PERMISSIONS,
) as GlobalPermissionKey[];

/** Valid holder types for permission grants. */
export const HOLDER_TYPES = {
  PROJECT_ROLE: "projectRole",
  GROUP: "group",
  USER: "user",
  ANYONE: "anyone",
} as const;

export type HolderType = (typeof HOLDER_TYPES)[keyof typeof HOLDER_TYPES];

/** Valid holder types for issue security level members. */
export const SECURITY_HOLDER_TYPES = {
  PROJECT_ROLE: "projectRole",
  GROUP: "group",
  USER: "user",
  REPORTER: "reporter",
  ASSIGNEE: "assignee",
} as const;

export type SecurityHolderType =
  (typeof SECURITY_HOLDER_TYPES)[keyof typeof SECURITY_HOLDER_TYPES];

/** Default project roles that are seeded for every organization. */
export const DEFAULT_PROJECT_ROLES = [
  { name: "Administrator", description: "Full project access", isDefault: false },
  { name: "Project Manager", description: "Manage project settings and team", isDefault: false },
  { name: "Developer", description: "Create and work on issues", isDefault: true },
  { name: "Viewer", description: "Read-only project access", isDefault: false },
] as const;
