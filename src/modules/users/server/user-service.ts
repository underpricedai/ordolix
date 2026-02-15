/**
 * @module users/server/user-service
 * @description Business logic for the Users module.
 * Handles profile management, notification preferences, API token lifecycle,
 * user listing, invitation, role management, and deactivation.
 */

import type { PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "crypto";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import type {
  UpdateProfileInput,
  UpdateNotificationPrefsInput,
  CreateApiTokenInput,
  ListUsersInput,
  InviteUserInput,
  UpdateUserRoleInput,
} from "../types/schemas";

/**
 * Retrieves a user profile by ID, including organization memberships.
 * @param db - Prisma client instance
 * @param userId - ID of the user to retrieve
 * @returns User with organization memberships
 * @throws NotFoundError if the user does not exist
 */
export async function getProfile(db: PrismaClient, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      organizationMembers: {
        include: { organization: true },
      },
    },
  });

  if (!user) {
    throw new NotFoundError("User", userId);
  }

  return user;
}

/**
 * Updates the current user's profile fields.
 * @param db - Prisma client instance
 * @param userId - ID of the user to update
 * @param input - Partial profile fields to update
 * @returns Updated user record
 * @throws NotFoundError if the user does not exist
 */
export async function updateProfile(
  db: PrismaClient,
  userId: string,
  input: UpdateProfileInput,
) {
  const existing = await db.user.findUnique({ where: { id: userId } });
  if (!existing) {
    throw new NotFoundError("User", userId);
  }

  return db.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.avatarUrl !== undefined && { image: input.avatarUrl }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.locale !== undefined && { locale: input.locale }),
    },
  });
}

/**
 * Upserts notification preferences for a user within an organization.
 * Stores global preferences as separate NotificationPreference records per channel.
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param userId - User to update preferences for
 * @param input - Notification preference fields
 * @returns Array of upserted preference records
 */
export async function updateNotificationPrefs(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: UpdateNotificationPrefsInput,
) {
  const channels: string[] = [];
  if (input.emailEnabled === true) channels.push("email");
  if (input.inAppEnabled === true) channels.push("in_app");
  if (input.slackEnabled === true) channels.push("slack");

  // If all are explicitly false, pass empty channels array
  if (
    input.emailEnabled === false &&
    input.inAppEnabled === false &&
    input.slackEnabled === false
  ) {
    // channels stays empty
  } else if (channels.length === 0 && input.emailEnabled === undefined) {
    // No channel prefs specified — only updating digestFrequency
  }

  const event = "global";

  return db.notificationPreference.upsert({
    where: {
      userId_projectId_event: {
        userId,
        projectId: null as unknown as string,
        event,
      },
    },
    create: {
      organizationId,
      userId,
      event,
      channels: JSON.stringify(channels),
      digestFrequency: input.digestFrequency ?? "instant",
    },
    update: {
      ...(channels.length > 0 || input.emailEnabled !== undefined
        ? { channels: JSON.stringify(channels) }
        : {}),
      ...(input.digestFrequency !== undefined && {
        digestFrequency: input.digestFrequency,
      }),
    },
  });
}

/**
 * Creates a new API token for the user.
 * Generates a random token with "oxt_" prefix, hashes it for storage,
 * and returns the plaintext token (shown only once).
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param userId - Owner of the token
 * @param input - Token name and optional expiry in days
 * @returns Object with the token record and the plaintext token
 */
export async function createApiToken(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: CreateApiTokenInput,
) {
  const rawToken = `oxt_${randomUUID().replace(/-/g, "")}`;
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const record = await db.apiToken.create({
    data: {
      organizationId,
      userId,
      name: input.name,
      tokenHash,
      expiresAt,
    },
  });

  return {
    ...record,
    plainToken: rawToken,
  };
}

/**
 * Revokes (deletes) an API token belonging to the user.
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param userId - Owner of the token
 * @param tokenId - ID of the token to revoke
 * @throws NotFoundError if the token does not exist or doesn't belong to the user
 */
export async function revokeToken(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  tokenId: string,
) {
  const existing = await db.apiToken.findFirst({
    where: { id: tokenId, userId, organizationId },
  });

  if (!existing) {
    throw new NotFoundError("ApiToken", tokenId);
  }

  await db.apiToken.delete({ where: { id: tokenId } });
}

/**
 * Lists API tokens for the current user.
 * Returns name, createdAt, expiresAt, and last 4 characters of the hash (NOT the full hash).
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param userId - Owner of the tokens
 * @returns Array of token summaries
 */
export async function listTokens(
  db: PrismaClient,
  organizationId: string,
  userId: string,
) {
  const tokens = await db.apiToken.findMany({
    where: { userId, organizationId },
    orderBy: { createdAt: "desc" },
  });

  return tokens.map((t) => ({
    id: t.id,
    name: t.name,
    createdAt: t.createdAt,
    expiresAt: t.expiresAt,
    lastUsedAt: t.lastUsedAt,
    last4: t.tokenHash.slice(-4),
  }));
}

/**
 * Lists organization members with user info, supporting cursor pagination and search.
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param input - Pagination, search, and role filter params
 * @returns Object with items array and total count
 */
export async function listUsers(
  db: PrismaClient,
  organizationId: string,
  input: ListUsersInput,
) {
  const where: {
    organizationId: string;
    role?: string;
    user?: { OR: Array<{ name?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" } }> };
  } = {
    organizationId,
  };

  if (input.role) {
    where.role = input.role;
  }

  if (input.search) {
    where.user = {
      OR: [
        { name: { contains: input.search, mode: "insensitive" } },
        { email: { contains: input.search, mode: "insensitive" } },
      ],
    };
  }

  const [items, total] = await Promise.all([
    db.organizationMember.findMany({
      where,
      include: { user: true },
      orderBy: { joinedAt: "desc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.organizationMember.count({ where }),
  ]);

  return { items, total };
}

/**
 * Invites a user to the organization. Finds or creates the user record,
 * then creates an OrganizationMember record. Logs the action in the audit log.
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param userId - ID of the user performing the invitation
 * @param input - Email, optional name, and optional role
 * @returns The created OrganizationMember record
 * @throws ValidationError if the user is already a member
 */
export async function inviteUser(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: InviteUserInput,
) {
  // Find or create the user
  let targetUser = await db.user.findUnique({
    where: { email: input.email },
  });

  if (!targetUser) {
    targetUser = await db.user.create({
      data: {
        email: input.email,
        name: input.name ?? null,
      },
    });
  }

  // Check if already a member
  const existingMember = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: targetUser.id,
      },
    },
  });

  if (existingMember) {
    throw new ValidationError("User is already a member of this organization");
  }

  const member = await db.organizationMember.create({
    data: {
      organizationId,
      userId: targetUser.id,
      role: input.roleId ?? "member",
    },
    include: { user: true },
  });

  await db.auditLog.create({
    data: {
      organizationId,
      userId,
      entityType: "User",
      entityId: targetUser.id,
      action: "INVITED",
      diff: { email: input.email, role: input.roleId ?? "member" },
    },
  });

  return member;
}

/**
 * Updates a user's role within the organization.
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param input - userId and new roleId
 * @returns Updated OrganizationMember record
 * @throws NotFoundError if the membership does not exist
 */
export async function updateUserRole(
  db: PrismaClient,
  organizationId: string,
  input: UpdateUserRoleInput,
) {
  const member = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: input.userId,
      },
    },
  });

  if (!member) {
    throw new NotFoundError("OrganizationMember", input.userId);
  }

  return db.organizationMember.update({
    where: { id: member.id },
    data: { role: input.roleId },
    include: { user: true },
  });
}

/**
 * Deactivates a user by removing their organization membership.
 * Creates an audit log entry for the action.
 * @param db - Prisma client instance
 * @param organizationId - Organization scope
 * @param userId - ID of the user performing the deactivation
 * @param input - userId of the user to deactivate
 * @throws NotFoundError if the membership does not exist
 */
export async function deactivateUser(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: { userId: string },
) {
  const member = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: input.userId,
      },
    },
  });

  if (!member) {
    throw new NotFoundError("OrganizationMember", input.userId);
  }

  await db.organizationMember.delete({
    where: { id: member.id },
  });

  await db.auditLog.create({
    data: {
      organizationId,
      userId,
      entityType: "User",
      entityId: input.userId,
      action: "DEACTIVATED",
      diff: { userId: input.userId },
    },
  });
}
