/**
 * Tooltip content dictionary for the Users module.
 * @module users-tooltips
 */

const tooltips = {
  inviteUser: "Send an invitation to add a new member to this organization",
  userRole: "The permission level assigned to this user",
  deactivateUser: "Revoke access while preserving the user's history",
  userGroups: "Teams and groups this user belongs to",
  profileSettings: "Update display name, avatar, and personal preferences",
} as const;

export default tooltips;
