/**
 * Permission resolution service for the Ordolix RBAC system.
 *
 * @description Resolves effective permissions for a user in a project context
 * by evaluating permission schemes, project roles, groups, and global permissions.
 * Results are cached in Redis with a 5-minute TTL.
 *
 * @module permission-checker
 */

import type { PrismaClient } from "@prisma/client";
import { cacheProvider } from "@/server/providers/cache";

const CACHE_TTL = 300; // 5 minutes
const MAX_INHERITANCE_DEPTH = 5;

/**
 * Walks the scheme inheritance chain (child → parent → grandparent, etc.)
 * and returns all scheme IDs whose grants should be merged.
 * Stops after MAX_INHERITANCE_DEPTH levels to prevent cycles.
 */
async function resolveSchemeChain(
  db: PrismaClient,
  schemeId: string,
): Promise<string[]> {
  const ids: string[] = [schemeId];
  let currentId: string | null = schemeId;

  for (let i = 0; i < MAX_INHERITANCE_DEPTH && currentId; i++) {
    const scheme: { parentId: string | null } | null = await db.permissionScheme.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!scheme?.parentId || ids.includes(scheme.parentId)) break;
    ids.push(scheme.parentId);
    currentId = scheme.parentId;
  }

  return ids;
}

/**
 * Resolves the set of project-level permission keys a user holds in a project.
 *
 * @param db - Prisma client instance
 * @param userId - User to resolve permissions for
 * @param projectId - Project context
 * @param organizationId - Organization context
 * @returns Set of permission key strings the user holds
 */
export async function resolveProjectPermissions(
  db: PrismaClient,
  userId: string,
  projectId: string,
  organizationId: string,
): Promise<Set<string>> {
  const cacheKey = `perms:${organizationId}:${projectId}:${userId}`;

  const cached = await cacheProvider.get<string[]>(cacheKey);
  if (cached) {
    return new Set(cached);
  }

  // 1. Find the project's permission scheme (or org default)
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { permissionSchemeId: true },
  });

  let schemeId = project?.permissionSchemeId;
  if (!schemeId) {
    const defaultScheme = await db.permissionScheme.findFirst({
      where: { organizationId, isDefault: true },
      select: { id: true },
    });
    schemeId = defaultScheme?.id ?? null;
  }

  if (!schemeId) {
    return new Set();
  }

  // 2. Find user's project role in this project
  const projectMember = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { projectRoleId: true },
  });
  const projectRoleId = projectMember?.projectRoleId;

  // 3. Find user's groups
  const groupMembers = await db.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = groupMembers.map((gm) => gm.groupId);

  // 4. Collect grants from this scheme + inherited parent chain (max 5 levels)
  const allSchemeIds = await resolveSchemeChain(db, schemeId);
  const grants = await db.permissionGrant.findMany({
    where: { permissionSchemeId: { in: allSchemeIds } },
    select: { permissionKey: true, holderType: true, projectRoleId: true, groupId: true, userId: true },
  });

  const permissions = new Set<string>();

  for (const grant of grants) {
    switch (grant.holderType) {
      case "anyone":
        permissions.add(grant.permissionKey);
        break;
      case "projectRole":
        if (projectRoleId && grant.projectRoleId === projectRoleId) {
          permissions.add(grant.permissionKey);
        }
        break;
      case "group":
        if (grant.groupId && groupIds.includes(grant.groupId)) {
          permissions.add(grant.permissionKey);
        }
        break;
      case "user":
        if (grant.userId === userId) {
          permissions.add(grant.permissionKey);
        }
        break;
    }
  }

  // 5. Cache result
  await cacheProvider.set(cacheKey, [...permissions], CACHE_TTL);

  return permissions;
}

/**
 * Checks whether a user holds a specific project-level permission.
 *
 * @param db - Prisma client instance
 * @param userId - User to check
 * @param projectId - Project context
 * @param organizationId - Organization context
 * @param permissionKey - Permission key to check
 * @returns true if the user has the permission
 */
export async function checkPermission(
  db: PrismaClient,
  userId: string,
  projectId: string,
  organizationId: string,
  permissionKey: string,
): Promise<boolean> {
  // Global admins bypass project permissions
  const isAdmin = await checkGlobalPermission(db, userId, organizationId, "ADMINISTER");
  if (isAdmin) return true;

  const permissions = await resolveProjectPermissions(db, userId, projectId, organizationId);
  return permissions.has(permissionKey);
}

/**
 * Checks whether a user holds a global (org-level) permission.
 *
 * @param db - Prisma client instance
 * @param userId - User to check
 * @param organizationId - Organization context
 * @param permissionKey - Global permission key
 * @returns true if the user has the global permission
 */
export async function checkGlobalPermission(
  db: PrismaClient,
  userId: string,
  organizationId: string,
  permissionKey: string,
): Promise<boolean> {
  const cacheKey = `gperms:${organizationId}:${userId}`;

  let globalPerms = await cacheProvider.get<string[]>(cacheKey);
  if (!globalPerms) {
    // Get user's groups
    const groupMembers = await db.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    const groupIds = groupMembers.map((gm) => gm.groupId);

    // Get all global permissions for this org
    const grants = await db.globalPermission.findMany({
      where: { organizationId },
      select: { permissionKey: true, holderType: true, groupId: true, userId: true },
    });

    const perms = new Set<string>();
    for (const grant of grants) {
      if (grant.holderType === "user" && grant.userId === userId) {
        perms.add(grant.permissionKey);
      } else if (grant.holderType === "group" && grant.groupId && groupIds.includes(grant.groupId)) {
        perms.add(grant.permissionKey);
      }
    }

    globalPerms = [...perms];
    await cacheProvider.set(cacheKey, globalPerms, CACHE_TTL);
  }

  return globalPerms.includes(permissionKey);
}

/**
 * Checks whether a user can see an issue based on its security level.
 *
 * @param db - Prisma client instance
 * @param userId - User to check
 * @param issueId - Issue to check visibility for
 * @param organizationId - Organization context
 * @returns true if the user can see the issue
 */
export async function checkIssueSecurityAccess(
  db: PrismaClient,
  userId: string,
  issueId: string,
  organizationId: string,
): Promise<boolean> {
  const issue = await db.issue.findUnique({
    where: { id: issueId },
    select: { securityLevelId: true, reporterId: true, assigneeId: true, projectId: true },
  });

  if (!issue) return false;

  // No security level → visible to anyone with BROWSE_PROJECTS
  if (!issue.securityLevelId) return true;

  // Get level members
  const levelMembers = await db.issueSecurityLevelMember.findMany({
    where: { issueSecurityLevelId: issue.securityLevelId },
  });

  // Get user's project role and groups
  const projectMember = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId: issue.projectId, userId } },
    select: { projectRoleId: true },
  });
  const projectRoleId = projectMember?.projectRoleId;

  const groupMembers = await db.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = groupMembers.map((gm) => gm.groupId);

  for (const member of levelMembers) {
    switch (member.holderType) {
      case "projectRole":
        if (projectRoleId && member.projectRoleId === projectRoleId) return true;
        break;
      case "group":
        if (member.groupId && groupIds.includes(member.groupId)) return true;
        break;
      case "user":
        if (member.userId === userId) return true;
        break;
      case "reporter":
        if (issue.reporterId === userId) return true;
        break;
      case "assignee":
        if (issue.assigneeId === userId) return true;
        break;
    }
  }

  return false;
}

/**
 * Invalidates cached permissions for a user.
 *
 * @param organizationId - Organization context
 * @param userId - User whose cache to invalidate (if undefined, invalidates all)
 */
export async function invalidatePermissionCache(
  organizationId: string,
  userId?: string,
): Promise<void> {
  if (userId) {
    await cacheProvider.del(`perms:${organizationId}:*:${userId}`);
    await cacheProvider.del(`gperms:${organizationId}:${userId}`);
    // Also invalidate wildcard patterns
    await cacheProvider.invalidatePattern(`perms:${organizationId}:*:${userId}`);
  } else {
    await cacheProvider.invalidatePattern(`perms:${organizationId}:*`);
    await cacheProvider.invalidatePattern(`gperms:${organizationId}:*`);
  }
}
