/**
 * Tooltip content dictionary for the permissions module.
 *
 * @module permissions-tooltips
 */

export const permissionTooltips = {
  projectRole: "Named roles assigned to users within a project (e.g. Administrator, Developer, Viewer). Each role maps to a set of permissions via a permission scheme.",
  group: "Named groups of users (e.g. jira-administrators, developers). Groups can be granted permissions in permission schemes and issue security levels.",
  permissionScheme: "A reusable set of permission grants that can be assigned to one or more projects. Each grant maps a permission key to a role, group, or user.",
  permissionGrant: "A single entry that grants a specific permission to a holder (project role, group, user, or anyone) within a permission scheme.",
  globalPermission: "An org-wide permission that is not tied to a specific project (e.g. ADMINISTER, CREATE_PROJECT).",
  issueSecurityScheme: "A set of security levels that restrict who can see issues. Assigned to projects to control issue visibility.",
  issueSecurityLevel: "A named visibility tier within a security scheme (e.g. Internal, Confidential). Issues with a security level are only visible to members of that level.",
} as const;
