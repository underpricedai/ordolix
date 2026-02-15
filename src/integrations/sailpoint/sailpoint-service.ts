/**
 * SailPoint IdentityNow integration service.
 *
 * Manages SailPoint group-to-Ordolix role/group mappings and membership sync.
 * SailPoint API calls are structured but return mock data when not configured.
 *
 * @module integrations/sailpoint/sailpoint-service
 */

import type { PrismaClient } from "@prisma/client";
import { NotFoundError, IntegrationError, ValidationError } from "@/server/lib/errors";
import type {
  CreateMappingInput,
  GetSyncLogsInput,
  ListSailPointGroupsInput,
  SailPointEventPayload,
} from "./schemas";

// ── Types ───────────────────────────────────────────────────────────────────

/** SailPoint API client configuration. */
export interface SailPointClientConfig {
  tenantUrl: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
}

/** SailPoint access group / workgroup. */
export interface SailPointGroup {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  type: string;
}

/** SailPoint group member identity. */
export interface SailPointGroupMember {
  id: string;
  email: string;
  displayName: string;
}

/** Sync action types for logging. */
export type SyncAction =
  | "user_added"
  | "user_removed"
  | "group_synced"
  | "full_sync"
  | "error";

// ── SailPoint API Client ────────────────────────────────────────────────────

/**
 * Create a SailPoint IdentityNow HTTP client wrapper.
 *
 * @param config - SailPoint tenant URL and OAuth credentials
 * @returns Client configuration ready for API calls
 */
export function createSailPointClient(config: SailPointClientConfig): SailPointClientConfig {
  if (!config.tenantUrl || !config.clientId || !config.clientSecret) {
    throw new IntegrationError(
      "sailpoint",
      "Missing required SailPoint configuration (tenantUrl, clientId, clientSecret)",
    );
  }
  return {
    ...config,
    tenantUrl: config.tenantUrl.replace(/\/+$/, ""),
  };
}

/**
 * List available SailPoint access groups / workgroups.
 *
 * Returns mock data when SailPoint API is not configured or unreachable.
 *
 * @param db - Prisma client instance
 * @param organizationId - The organization to query
 * @param input - Optional search and limit parameters
 * @returns Array of SailPoint groups
 */
export async function listSailPointGroups(
  db: PrismaClient,
  organizationId: string,
  input?: ListSailPointGroupsInput,
): Promise<SailPointGroup[]> {
  const config = await getClientConfig(db, organizationId);

  if (!config) {
    return getMockGroups(input?.search, input?.limit);
  }

  // Structured API call - returns mock data for now
  // In production, this would call: GET {tenantUrl}/v3/workgroups
  return getMockGroups(input?.search, input?.limit);
}

/**
 * Get members of a SailPoint group.
 *
 * @param db - Prisma client instance
 * @param organizationId - The organization to query
 * @param groupId - SailPoint group identifier
 * @returns Array of group members
 */
export async function getSailPointGroupMembers(
  db: PrismaClient,
  organizationId: string,
  groupId: string,
): Promise<SailPointGroupMember[]> {
  const config = await getClientConfig(db, organizationId);

  if (!config) {
    return getMockGroupMembers(groupId);
  }

  // Structured API call - returns mock data for now
  // In production: GET {tenantUrl}/v3/workgroups/{groupId}/members
  return getMockGroupMembers(groupId);
}

// ── Mapping CRUD ────────────────────────────────────────────────────────────

/**
 * Create a mapping between a SailPoint group and an Ordolix target.
 *
 * @param db - Prisma client instance
 * @param organizationId - The organization owning the mapping
 * @param input - Mapping configuration
 * @returns The created mapping record
 */
export async function createMapping(
  db: PrismaClient,
  organizationId: string,
  input: CreateMappingInput,
) {
  // Validate the target exists
  await validateTarget(db, organizationId, input.targetType, input.targetId);

  return db.sailPointMapping.create({
    data: {
      organizationId,
      sailPointGroupId: input.sailPointGroupId,
      sailPointGroupName: input.sailPointGroupName,
      targetType: input.targetType,
      targetId: input.targetId,
      roleName: input.roleName ?? null,
      syncDirection: input.syncDirection ?? "pull",
    },
  });
}

/**
 * Delete a SailPoint mapping.
 *
 * @param db - Prisma client instance
 * @param organizationId - The organization owning the mapping
 * @param id - Mapping ID to delete
 */
export async function deleteMapping(
  db: PrismaClient,
  organizationId: string,
  id: string,
): Promise<void> {
  const mapping = await db.sailPointMapping.findFirst({
    where: { id, organizationId },
  });

  if (!mapping) {
    throw new NotFoundError("SailPointMapping", id);
  }

  await db.sailPointMapping.delete({ where: { id } });
}

/**
 * List all SailPoint mappings for an organization.
 *
 * @param db - Prisma client instance
 * @param organizationId - The organization to query
 * @returns Array of mapping records
 */
export async function listMappings(db: PrismaClient, organizationId: string) {
  return db.sailPointMapping.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

// ── Sync Logic ──────────────────────────────────────────────────────────────

/**
 * Sync a single mapping: pull SailPoint group members and update Ordolix
 * group membership, project role assignments, or organization roles.
 *
 * @param db - Prisma client instance
 * @param organizationId - The organization context
 * @param mappingId - The mapping to sync
 * @returns Sync results with counts of added/removed members
 */
export async function syncMapping(
  db: PrismaClient,
  organizationId: string,
  mappingId: string,
): Promise<{ added: number; removed: number }> {
  const mapping = await db.sailPointMapping.findFirst({
    where: { id: mappingId, organizationId },
  });

  if (!mapping) {
    throw new NotFoundError("SailPointMapping", mappingId);
  }

  try {
    const members = await getSailPointGroupMembers(db, organizationId, mapping.sailPointGroupId);
    const result = await applySync(db, organizationId, mapping, members);

    // Update last sync timestamp
    await db.sailPointMapping.update({
      where: { id: mappingId },
      data: { lastSyncAt: new Date() },
    });

    await logSyncAction(db, organizationId, mappingId, "group_synced", {
      groupId: mapping.sailPointGroupId,
      groupName: mapping.sailPointGroupName,
      targetType: mapping.targetType,
      targetId: mapping.targetId,
      added: result.added,
      removed: result.removed,
    });

    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown sync error";
    await logSyncAction(
      db,
      organizationId,
      mappingId,
      "error",
      { groupId: mapping.sailPointGroupId },
      "failure",
      errorMessage,
    );
    throw err;
  }
}

/**
 * Full sync of all mappings for an organization.
 *
 * @param db - Prisma client instance
 * @param organizationId - The organization to sync
 * @returns Summary with total added/removed counts and any errors
 */
export async function syncAll(
  db: PrismaClient,
  organizationId: string,
): Promise<{ totalAdded: number; totalRemoved: number; errors: string[] }> {
  const mappings = await db.sailPointMapping.findMany({
    where: { organizationId },
  });

  let totalAdded = 0;
  let totalRemoved = 0;
  const errors: string[] = [];

  for (const mapping of mappings) {
    try {
      const result = await syncMapping(db, organizationId, mapping.id);
      totalAdded += result.added;
      totalRemoved += result.removed;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Mapping ${mapping.id}: ${errorMessage}`);
    }
  }

  await logSyncAction(db, organizationId, null, "full_sync", {
    mappingCount: mappings.length,
    totalAdded,
    totalRemoved,
    errorCount: errors.length,
  });

  return { totalAdded, totalRemoved, errors };
}

/**
 * Process a SailPoint event (access request approved/revoked).
 *
 * @param db - Prisma client instance
 * @param organizationId - The organization context
 * @param payload - SailPoint event payload
 * @returns Processing result
 */
export async function handleSailPointEvent(
  db: PrismaClient,
  organizationId: string,
  payload: SailPointEventPayload,
): Promise<{ processed: boolean; action?: string }> {
  const { eventType, userEmail, groupId, action } = payload;

  if (!groupId || !userEmail) {
    await logSyncAction(db, organizationId, null, "error", {
      eventType,
      reason: "Missing groupId or userEmail in event payload",
    }, "failure", "Incomplete event payload");
    return { processed: false };
  }

  // Find all mappings for this SailPoint group
  const mappings = await db.sailPointMapping.findMany({
    where: { organizationId, sailPointGroupId: groupId },
  });

  if (mappings.length === 0) {
    return { processed: false };
  }

  // Find the user by email
  const user = await db.user.findFirst({
    where: { email: userEmail },
    select: { id: true },
  });

  if (!user) {
    await logSyncAction(db, organizationId, null, "error", {
      eventType,
      userEmail,
      reason: "User not found in Ordolix",
    }, "failure", `User ${userEmail} not found`);
    return { processed: false };
  }

  for (const mapping of mappings) {
    try {
      if (action === "approved") {
        await addUserToTarget(db, organizationId, mapping, user.id);
        await logSyncAction(db, organizationId, mapping.id, "user_added", {
          userId: user.id,
          userEmail,
          targetType: mapping.targetType,
          targetId: mapping.targetId,
        });
      } else if (action === "revoked") {
        await removeUserFromTarget(db, organizationId, mapping, user.id);
        await logSyncAction(db, organizationId, mapping.id, "user_removed", {
          userId: user.id,
          userEmail,
          targetType: mapping.targetType,
          targetId: mapping.targetId,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await logSyncAction(db, organizationId, mapping.id, "error", {
        eventType,
        userEmail,
        action,
      }, "failure", errorMessage);
    }
  }

  return { processed: true, action: action ?? eventType };
}

// ── Sync Logging ────────────────────────────────────────────────────────────

/**
 * Write a sync action to the SailPointSyncLog table.
 *
 * @param db - Prisma client instance
 * @param organizationId - The organization context
 * @param mappingId - Optional mapping ID associated with the action
 * @param action - The sync action type
 * @param details - JSON details about the action
 * @param status - Status of the action (default: "success")
 * @param error - Optional error message
 */
export async function logSyncAction(
  db: PrismaClient,
  organizationId: string,
  mappingId: string | null,
  action: SyncAction,
  details: Record<string, unknown>,
  status: string = "success",
  error?: string,
): Promise<void> {
  await db.sailPointSyncLog.create({
    data: {
      organizationId,
      mappingId,
      action,
      details: details as Record<string, string | number | boolean | null>,
      status,
      error: error ?? null,
    },
  });
}

/**
 * Get paginated sync logs.
 *
 * @param db - Prisma client instance
 * @param organizationId - The organization to query
 * @param input - Pagination and filter parameters
 * @returns Array of sync log entries
 */
export async function getSyncLogs(
  db: PrismaClient,
  organizationId: string,
  input: GetSyncLogsInput,
) {
  const where: Record<string, unknown> = { organizationId };
  if (input.mappingId) {
    where.mappingId = input.mappingId;
  }

  return db.sailPointSyncLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: input.limit ?? 50,
    ...(input.cursor
      ? {
          skip: 1,
          cursor: { id: input.cursor },
        }
      : {}),
  });
}

// ── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Get the SailPoint client config from the integration config table.
 * Returns null if not configured.
 */
async function getClientConfig(
  db: PrismaClient,
  organizationId: string,
): Promise<SailPointClientConfig | null> {
  const record = await db.integrationConfig.findFirst({
    where: { organizationId, provider: "sailpoint", isActive: true },
    select: { config: true },
  });

  if (!record?.config) return null;

  const cfg = record.config as Record<string, unknown>;
  if (!cfg.tenantUrl || !cfg.clientId || !cfg.clientSecret) return null;

  return {
    tenantUrl: String(cfg.tenantUrl),
    clientId: String(cfg.clientId),
    clientSecret: String(cfg.clientSecret),
  };
}

/**
 * Validate that the target entity exists for a mapping.
 */
async function validateTarget(
  db: PrismaClient,
  organizationId: string,
  targetType: string,
  targetId: string,
): Promise<void> {
  switch (targetType) {
    case "group": {
      const group = await db.group.findFirst({
        where: { id: targetId, organizationId },
      });
      if (!group) throw new ValidationError(`Group '${targetId}' not found`);
      break;
    }
    case "projectRole": {
      const role = await db.projectRole.findFirst({
        where: { id: targetId, organizationId },
      });
      if (!role) throw new ValidationError(`ProjectRole '${targetId}' not found`);
      break;
    }
    case "organizationRole": {
      // targetId is the role name for org-level roles ("admin", "member", "viewer")
      const validRoles = ["admin", "member", "viewer"];
      if (!validRoles.includes(targetId)) {
        throw new ValidationError(
          `Invalid organization role '${targetId}'. Must be one of: ${validRoles.join(", ")}`,
        );
      }
      break;
    }
    default:
      throw new ValidationError(`Unknown target type: ${targetType}`);
  }
}

/**
 * Apply the sync diff for a single mapping.
 * Returns counts of added and removed users.
 */
async function applySync(
  db: PrismaClient,
  organizationId: string,
  mapping: {
    targetType: string;
    targetId: string;
    sailPointGroupId: string;
  },
  sailPointMembers: SailPointGroupMember[],
): Promise<{ added: number; removed: number }> {
  // Resolve SailPoint member emails to Ordolix user IDs
  const sailPointEmails = sailPointMembers.map((m) => m.email.toLowerCase());
  const ordolixUsers = await db.user.findMany({
    where: { email: { in: sailPointEmails } },
    select: { id: true, email: true },
  });
  const sailPointUserIds = new Set(ordolixUsers.map((u) => u.id));

  let added = 0;
  let removed = 0;

  switch (mapping.targetType) {
    case "group": {
      const existingMembers = await db.groupMember.findMany({
        where: { groupId: mapping.targetId },
        select: { userId: true },
      });
      const existingIds = new Set(existingMembers.map((m) => m.userId));

      // Add members not yet in the group
      for (const userId of sailPointUserIds) {
        if (!existingIds.has(userId)) {
          await db.groupMember.create({
            data: { groupId: mapping.targetId, userId },
          });
          added++;
        }
      }

      // Remove members no longer in SailPoint group
      for (const existing of existingMembers) {
        if (!sailPointUserIds.has(existing.userId)) {
          await db.groupMember.deleteMany({
            where: { groupId: mapping.targetId, userId: existing.userId },
          });
          removed++;
        }
      }
      break;
    }

    case "projectRole": {
      // Find projects that use this role, and sync membership
      const existingMembers = await db.projectMember.findMany({
        where: { projectRoleId: mapping.targetId },
        select: { userId: true, id: true, projectId: true },
      });
      const existingIds = new Set(existingMembers.map((m) => m.userId));

      // For new members, we need a projectId. Get it from the role.
      const role = await db.projectRole.findUnique({
        where: { id: mapping.targetId },
        select: { id: true },
      });
      if (!role) break;

      // Get projects using this role
      const projectMembers = await db.projectMember.findMany({
        where: { projectRoleId: mapping.targetId },
        select: { projectId: true },
      });
      const projectIds = [...new Set(projectMembers.map((pm) => pm.projectId))];

      // If no projects, add to all org projects
      if (projectIds.length === 0) {
        const projects = await db.project.findMany({
          where: { organizationId },
          select: { id: true },
          take: 1,
        });
        if (projects.length > 0) {
          projectIds.push(projects[0]!.id);
        }
      }

      if (projectIds.length > 0) {
        for (const userId of sailPointUserIds) {
          if (!existingIds.has(userId)) {
            await db.projectMember.create({
              data: {
                projectId: projectIds[0]!,
                userId,
                projectRoleId: mapping.targetId,
              },
            });
            added++;
          }
        }
      }

      // Remove members no longer in SailPoint group
      for (const existing of existingMembers) {
        if (!sailPointUserIds.has(existing.userId)) {
          await db.projectMember.delete({ where: { id: existing.id } });
          removed++;
        }
      }
      break;
    }

    case "organizationRole": {
      // targetId is the role name ("admin", "member", "viewer")
      const orgMembers = await db.organizationMember.findMany({
        where: { organizationId },
        select: { userId: true, role: true, id: true },
      });
      const existingIds = new Set(orgMembers.map((m) => m.userId));

      for (const userId of sailPointUserIds) {
        const existingMember = orgMembers.find((m) => m.userId === userId);
        if (existingMember) {
          // Update role if different
          if (existingMember.role !== mapping.targetId) {
            await db.organizationMember.update({
              where: { id: existingMember.id },
              data: { role: mapping.targetId },
            });
            added++;
          }
        }
        // Note: We don't create new OrgMembers from SailPoint - they must be invited first
      }
      break;
    }
  }

  return { added, removed };
}

/**
 * Add a single user to the mapping target.
 */
async function addUserToTarget(
  db: PrismaClient,
  organizationId: string,
  mapping: { targetType: string; targetId: string },
  userId: string,
): Promise<void> {
  switch (mapping.targetType) {
    case "group": {
      const existing = await db.groupMember.findFirst({
        where: { groupId: mapping.targetId, userId },
      });
      if (!existing) {
        await db.groupMember.create({
          data: { groupId: mapping.targetId, userId },
        });
      }
      break;
    }
    case "projectRole": {
      const existing = await db.projectMember.findFirst({
        where: { projectRoleId: mapping.targetId, userId },
      });
      if (!existing) {
        const projects = await db.project.findMany({
          where: { organizationId },
          select: { id: true },
          take: 1,
        });
        if (projects.length > 0) {
          await db.projectMember.create({
            data: {
              projectId: projects[0]!.id,
              userId,
              projectRoleId: mapping.targetId,
            },
          });
        }
      }
      break;
    }
    case "organizationRole": {
      const member = await db.organizationMember.findFirst({
        where: { organizationId, userId },
      });
      if (member) {
        await db.organizationMember.update({
          where: { id: member.id },
          data: { role: mapping.targetId },
        });
      }
      break;
    }
  }
}

/**
 * Remove a single user from the mapping target.
 */
async function removeUserFromTarget(
  db: PrismaClient,
  _organizationId: string,
  mapping: { targetType: string; targetId: string },
  userId: string,
): Promise<void> {
  switch (mapping.targetType) {
    case "group": {
      await db.groupMember.deleteMany({
        where: { groupId: mapping.targetId, userId },
      });
      break;
    }
    case "projectRole": {
      await db.projectMember.deleteMany({
        where: { projectRoleId: mapping.targetId, userId },
      });
      break;
    }
    case "organizationRole": {
      // Revoke: set back to default "member" role
      const member = await db.organizationMember.findFirst({
        where: { organizationId: _organizationId, userId },
      });
      if (member) {
        await db.organizationMember.update({
          where: { id: member.id },
          data: { role: "member" },
        });
      }
      break;
    }
  }
}

// ── Mock Data ───────────────────────────────────────────────────────────────

/**
 * Returns mock SailPoint groups for development/demo purposes.
 */
function getMockGroups(search?: string, limit?: number): SailPointGroup[] {
  const groups: SailPointGroup[] = [
    {
      id: "sp-grp-001",
      name: "Engineering Team",
      description: "Software engineering security group",
      memberCount: 25,
      type: "workgroup",
    },
    {
      id: "sp-grp-002",
      name: "DevOps Access",
      description: "DevOps tooling and infrastructure access",
      memberCount: 12,
      type: "access_profile",
    },
    {
      id: "sp-grp-003",
      name: "QA Engineers",
      description: "Quality assurance team access group",
      memberCount: 8,
      type: "workgroup",
    },
    {
      id: "sp-grp-004",
      name: "Project Managers",
      description: "Project management access and tools",
      memberCount: 6,
      type: "workgroup",
    },
    {
      id: "sp-grp-005",
      name: "IT Administrators",
      description: "Full administrative access group",
      memberCount: 4,
      type: "access_profile",
    },
    {
      id: "sp-grp-006",
      name: "Security Team",
      description: "Information security team access",
      memberCount: 7,
      type: "workgroup",
    },
  ];

  let filtered = groups;
  if (search) {
    const lower = search.toLowerCase();
    filtered = groups.filter(
      (g) =>
        g.name.toLowerCase().includes(lower) ||
        g.description.toLowerCase().includes(lower),
    );
  }

  return filtered.slice(0, limit ?? 50);
}

/**
 * Returns mock SailPoint group members for development/demo purposes.
 */
function getMockGroupMembers(groupId: string): SailPointGroupMember[] {
  const membersByGroup: Record<string, SailPointGroupMember[]> = {
    "sp-grp-001": [
      { id: "sp-usr-001", email: "alice@example.com", displayName: "Alice Johnson" },
      { id: "sp-usr-002", email: "bob@example.com", displayName: "Bob Smith" },
      { id: "sp-usr-003", email: "carol@example.com", displayName: "Carol Williams" },
    ],
    "sp-grp-002": [
      { id: "sp-usr-001", email: "alice@example.com", displayName: "Alice Johnson" },
      { id: "sp-usr-004", email: "dave@example.com", displayName: "Dave Brown" },
    ],
    "sp-grp-003": [
      { id: "sp-usr-005", email: "eve@example.com", displayName: "Eve Davis" },
      { id: "sp-usr-006", email: "frank@example.com", displayName: "Frank Miller" },
    ],
  };

  return membersByGroup[groupId] ?? [];
}
