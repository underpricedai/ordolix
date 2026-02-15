/**
 * Generic scheme sharing service — fork-or-propagate pattern.
 *
 * @description Provides a unified adapter interface for scheme types
 * (PermissionScheme, Workflow, IssueTypeScheme, FieldConfigurationScheme,
 * NotificationScheme, IssueSecurityScheme). Enables checking if a scheme
 * is shared, forking it for a single project, or cloning independently.
 *
 * @module shared/lib/scheme-sharing-service
 */

import type { PrismaClient } from "@prisma/client";

/**
 * Adapter interface that each scheme type must implement.
 * Enables generic fork/clone/share operations across all scheme types.
 */
export interface SchemeAdapter<TScheme> {
  /** Human-readable name for error messages and UI. */
  readonly schemeType: string;

  /** Load the scheme with all child entries/grants. */
  findSchemeWithEntries(
    db: PrismaClient,
    schemeId: string,
    organizationId: string,
  ): Promise<TScheme | null>;

  /** Count how many projects reference this scheme. */
  getProjectCount(
    db: PrismaClient,
    schemeId: string,
    organizationId: string,
  ): Promise<number>;

  /**
   * Deep-clone the scheme and all entries.
   * Sets parentId on clone to point back at original (fork tracking).
   *
   * @returns The newly created clone
   */
  cloneScheme(
    db: PrismaClient,
    scheme: TScheme,
    newName: string,
    organizationId: string,
  ): Promise<TScheme>;

  /** Assign a scheme to a project (set the FK on Project). */
  assignToProject(
    db: PrismaClient,
    schemeId: string,
    projectId: string,
  ): Promise<void>;
}

export interface SharingStatus {
  shared: boolean;
  projectCount: number;
}

/**
 * Checks whether a scheme is shared by multiple projects.
 *
 * @param adapter - Scheme-specific adapter
 * @param db - Prisma client
 * @param schemeId - ID of the scheme to check
 * @param organizationId - Tenant scope
 * @returns Sharing status with project count
 */
export async function isSchemeShared<TScheme>(
  adapter: SchemeAdapter<TScheme>,
  db: PrismaClient,
  schemeId: string,
  organizationId: string,
): Promise<SharingStatus> {
  const projectCount = await adapter.getProjectCount(db, schemeId, organizationId);
  return { shared: projectCount > 1, projectCount };
}

/**
 * Forks a shared scheme for a single project.
 * Clones the scheme, assigns the clone to the project, and leaves
 * all other projects pointing at the original.
 *
 * @param adapter - Scheme-specific adapter
 * @param db - Prisma client
 * @param schemeId - ID of the scheme to fork
 * @param projectId - Project that gets the forked copy
 * @param organizationId - Tenant scope
 * @returns The newly created forked scheme
 * @throws Error if scheme not found
 */
export async function forkScheme<TScheme>(
  adapter: SchemeAdapter<TScheme>,
  db: PrismaClient,
  schemeId: string,
  projectId: string,
  organizationId: string,
): Promise<TScheme> {
  const scheme = await adapter.findSchemeWithEntries(db, schemeId, organizationId);
  if (!scheme) {
    throw new Error(`${adapter.schemeType} with id '${schemeId}' not found`);
  }

  const schemeName = (scheme as Record<string, unknown>).name as string;
  const newName = `${schemeName} (Custom)`;

  const clone = await adapter.cloneScheme(db, scheme, newName, organizationId);
  const cloneId = (clone as Record<string, unknown>).id as string;
  await adapter.assignToProject(db, cloneId, projectId);

  return clone;
}

/**
 * Clones a scheme as an independent copy (e.g., for project creation "mirror" flow).
 * The clone is not automatically assigned to any project.
 *
 * @param adapter - Scheme-specific adapter
 * @param db - Prisma client
 * @param sourceId - ID of the source scheme
 * @param newName - Name for the clone
 * @param organizationId - Tenant scope
 * @returns The newly created scheme clone
 * @throws Error if source scheme not found
 */
export async function cloneSchemeIndependent<TScheme>(
  adapter: SchemeAdapter<TScheme>,
  db: PrismaClient,
  sourceId: string,
  newName: string,
  organizationId: string,
): Promise<TScheme> {
  const scheme = await adapter.findSchemeWithEntries(db, sourceId, organizationId);
  if (!scheme) {
    throw new Error(`${adapter.schemeType} with id '${sourceId}' not found`);
  }

  return adapter.cloneScheme(db, scheme, newName, organizationId);
}

/** All supported scheme types for the unified router. */
export const SCHEME_TYPES = [
  "permissionScheme",
  "workflow",
  "issueTypeScheme",
  "fieldConfigurationScheme",
  "notificationScheme",
  "issueSecurityScheme",
  "componentScheme",
] as const;

export type SchemeType = (typeof SCHEME_TYPES)[number];
