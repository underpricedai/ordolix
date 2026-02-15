/**
 * Service for IssueTypeScheme CRUD operations.
 *
 * @module admin/server/issue-type-scheme-service
 */

import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ConflictError } from "@/server/lib/errors";
import type {
  CreateIssueTypeSchemeInput,
  UpdateIssueTypeSchemeInput,
  AddIssueTypeSchemeEntryInput,
} from "../types/schemas";

const SCHEME_INCLUDE = {
  entries: {
    include: { issueType: true },
    orderBy: { position: "asc" as const },
  },
  _count: { select: { projects: true } },
} as const;

export async function listIssueTypeSchemes(
  db: PrismaClient,
  organizationId: string,
) {
  return db.issueTypeScheme.findMany({
    where: { organizationId },
    include: {
      _count: { select: { entries: true, projects: true } },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getIssueTypeScheme(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const scheme = await db.issueTypeScheme.findFirst({
    where: { id, organizationId },
    include: SCHEME_INCLUDE,
  });
  if (!scheme) throw new NotFoundError("IssueTypeScheme", id);
  return scheme;
}

export async function createIssueTypeScheme(
  db: PrismaClient,
  organizationId: string,
  input: CreateIssueTypeSchemeInput,
) {
  return db.issueTypeScheme.create({
    data: {
      organizationId,
      name: input.name,
      description: input.description,
    },
    include: SCHEME_INCLUDE,
  });
}

export async function updateIssueTypeScheme(
  db: PrismaClient,
  organizationId: string,
  input: UpdateIssueTypeSchemeInput,
) {
  const existing = await db.issueTypeScheme.findFirst({
    where: { id: input.id, organizationId },
  });
  if (!existing) throw new NotFoundError("IssueTypeScheme", input.id);

  const { id, ...updates } = input;
  return db.issueTypeScheme.update({
    where: { id },
    data: updates,
    include: SCHEME_INCLUDE,
  });
}

export async function deleteIssueTypeScheme(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const scheme = await db.issueTypeScheme.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { projects: true } } },
  });
  if (!scheme) throw new NotFoundError("IssueTypeScheme", id);
  if (scheme._count.projects > 0) {
    throw new ConflictError(
      `Cannot delete scheme used by ${scheme._count.projects} project(s)`,
    );
  }
  await db.issueTypeScheme.delete({ where: { id } });
}

export async function addEntry(
  db: PrismaClient,
  organizationId: string,
  input: AddIssueTypeSchemeEntryInput,
) {
  // Verify scheme and issue type belong to org
  const scheme = await db.issueTypeScheme.findFirst({
    where: { id: input.issueTypeSchemeId, organizationId },
  });
  if (!scheme) throw new NotFoundError("IssueTypeScheme", input.issueTypeSchemeId);

  return db.issueTypeSchemeEntry.create({
    data: {
      issueTypeSchemeId: input.issueTypeSchemeId,
      issueTypeId: input.issueTypeId,
      isDefault: input.isDefault ?? false,
      position: input.position ?? 0,
    },
    include: { issueType: true },
  });
}

export async function removeEntry(db: PrismaClient, id: string) {
  await db.issueTypeSchemeEntry.delete({ where: { id } });
}

export async function assignToProject(
  db: PrismaClient,
  organizationId: string,
  schemeId: string,
  projectId: string,
) {
  const scheme = await db.issueTypeScheme.findFirst({
    where: { id: schemeId, organizationId },
  });
  if (!scheme) throw new NotFoundError("IssueTypeScheme", schemeId);

  await db.project.update({
    where: { id: projectId },
    data: { issueTypeSchemeId: schemeId },
  });
}
