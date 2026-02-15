/**
 * Tooltip content dictionary for the Admin module.
 * @module admin-tooltips
 */

const tooltips = {
  systemSettings: "Configure global platform settings and defaults",
  manageOrganization: "Update organization name, logo, and preferences",
  auditLog: "View a chronological record of all system changes",
  licenseManagement: "Review active licenses and seat allocation",
  securityPolicies: "Configure password, session, and access policies",
  dataRetention: "Set how long deleted and archived data is retained",
} as const;

export default tooltips;
