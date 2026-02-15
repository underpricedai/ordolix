/**
 * @module users/types/schemas
 * @description Zod validation schemas for the Users module.
 * Covers profile management, notification preferences, API token lifecycle,
 * user listing, invitation, role updates, and deactivation.
 */

import { z } from "zod";

/** Schema for updating the current user's profile. */
export const updateProfileInput = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  timezone: z.string().min(1).max(100).optional(),
  locale: z.string().min(2).max(10).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

/** Schema for updating notification preferences. */
export const updateNotificationPrefsInput = z.object({
  emailEnabled: z.boolean().optional(),
  slackEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  digestFrequency: z.enum(["none", "daily", "weekly"]).optional(),
});

export type UpdateNotificationPrefsInput = z.infer<typeof updateNotificationPrefsInput>;

/** Schema for creating a new API token. */
export const createApiTokenInput = z.object({
  name: z.string().min(1).max(255),
  expiresInDays: z.number().int().positive().optional(),
});

export type CreateApiTokenInput = z.infer<typeof createApiTokenInput>;

/** Schema for revoking an existing API token. */
export const revokeApiTokenInput = z.object({
  tokenId: z.string().min(1),
});

export type RevokeApiTokenInput = z.infer<typeof revokeApiTokenInput>;

/** Schema for listing the current user's API tokens. Empty input — uses session user. */
export const listApiTokensInput = z.object({});

export type ListApiTokensInput = z.infer<typeof listApiTokensInput>;

/** Schema for listing organization users with optional filtering. */
export const listUsersInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  role: z.string().optional(),
});

export type ListUsersInput = z.infer<typeof listUsersInput>;

/** Schema for inviting a new user to the organization. */
export const inviteUserInput = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255).optional(),
  roleId: z.string().optional(),
});

export type InviteUserInput = z.infer<typeof inviteUserInput>;

/** Schema for updating a user's role within the organization. */
export const updateUserRoleInput = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleInput>;

/** Schema for deactivating a user in the organization. */
export const deactivateUserInput = z.object({
  userId: z.string().min(1),
});

export type DeactivateUserInput = z.infer<typeof deactivateUserInput>;
