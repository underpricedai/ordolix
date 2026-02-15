/**
 * Service for ComponentScheme CRUD operations.
 *
 * @module projects/server/component-scheme-service
 */

import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ConflictError } from "@/server/lib/errors";

export interface CreateComponentSchemeInput {
  name: string;
  description?: string;
}

export interface UpdateComponentSchemeInput {
  id: string;
  name?: string;
  description?: string | null;
}

export interface AddComponentSchemeEntryInput {
  componentSchemeId: string;
  componentId: string;
  isDefault?: boolean;
  position?: number;
}

const SCHEME_INCLUDE = {
  entries: {
    include: { component: true },
    orderBy: { position: "asc" as const },
  },
  _count: { select: { projects: true } },
} as const;

export async function listComponentSchemes(
  db: PrismaClient,
  organizationId: string,
) {
  return db.componentScheme.findMany({
    where: { organizationId },
    include: {
      _count: { select: { entries: true, projects: true } },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getComponentScheme(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const scheme = await db.componentScheme.findFirst({
    where: { id, organizationId },
    include: SCHEME_INCLUDE,
  });
  if (!scheme) throw new NotFoundError("ComponentScheme", id);
  return scheme;
}

export async function createComponentScheme(
  db: PrismaClient,
  organizationId: string,
  input: CreateComponentSchemeInput,
) {
  return db.componentScheme.create({
    data: {
      organizationId,
      name: input.name,
      description: input.description,
    },
    include: SCHEME_INCLUDE,
  });
}

export async function updateComponentScheme(
  db: PrismaClient,
  organizationId: string,
  input: UpdateComponentSchemeInput,
) {
  const existing = await db.componentScheme.findFirst({
    where: { id: input.id, organizationId },
  });
  if (!existing) throw new NotFoundError("ComponentScheme", input.id);

  const { id, ...updates } = input;
  return db.componentScheme.update({
    where: { id },
    data: updates,
    include: SCHEME_INCLUDE,
  });
}

export async function deleteComponentScheme(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const scheme = await db.componentScheme.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { projects: true } } },
  });
  if (!scheme) throw new NotFoundError("ComponentScheme", id);
  if (scheme._count.projects > 0) {
    throw new ConflictError(
      `Cannot delete scheme used by ${scheme._count.projects} project(s)`,
    );
  }
  await db.componentScheme.delete({ where: { id } });
}

export async function addEntry(
  db: PrismaClient,
  organizationId: string,
  input: AddComponentSchemeEntryInput,
) {
  const scheme = await db.componentScheme.findFirst({
    where: { id: input.componentSchemeId, organizationId },
  });
  if (!scheme) throw new NotFoundError("ComponentScheme", input.componentSchemeId);

  return db.componentSchemeEntry.create({
    data: {
      componentSchemeId: input.componentSchemeId,
      componentId: input.componentId,
      isDefault: input.isDefault ?? false,
      position: input.position ?? 0,
    },
    include: { component: true },
  });
}

export async function removeEntry(db: PrismaClient, id: string) {
  await db.componentSchemeEntry.delete({ where: { id } });
}

export async function assignToProject(
  db: PrismaClient,
  organizationId: string,
  schemeId: string,
  projectId: string,
) {
  const scheme = await db.componentScheme.findFirst({
    where: { id: schemeId, organizationId },
  });
  if (!scheme) throw new NotFoundError("ComponentScheme", schemeId);

  await db.project.update({
    where: { id: projectId },
    data: { componentSchemeId: schemeId },
  });
}
