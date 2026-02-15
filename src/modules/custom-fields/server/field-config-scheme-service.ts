/**
 * Service for FieldConfigurationScheme CRUD operations.
 *
 * @module custom-fields/server/field-config-scheme-service
 */

import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ConflictError } from "@/server/lib/errors";
import type {
  CreateFieldConfigSchemeInput,
  UpdateFieldConfigSchemeInput,
  AddFieldConfigEntryInput,
  UpdateFieldConfigEntryInput,
} from "../types/schemas";

const SCHEME_INCLUDE = {
  entries: {
    include: { customField: true },
    orderBy: { position: "asc" as const },
  },
  _count: { select: { projects: true } },
} as const;

export async function listFieldConfigSchemes(
  db: PrismaClient,
  organizationId: string,
) {
  return db.fieldConfigurationScheme.findMany({
    where: { organizationId },
    include: {
      _count: { select: { entries: true, projects: true } },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getFieldConfigScheme(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const scheme = await db.fieldConfigurationScheme.findFirst({
    where: { id, organizationId },
    include: SCHEME_INCLUDE,
  });
  if (!scheme) throw new NotFoundError("FieldConfigurationScheme", id);
  return scheme;
}

export async function createFieldConfigScheme(
  db: PrismaClient,
  organizationId: string,
  input: CreateFieldConfigSchemeInput,
) {
  return db.fieldConfigurationScheme.create({
    data: {
      organizationId,
      name: input.name,
      description: input.description,
    },
    include: SCHEME_INCLUDE,
  });
}

export async function updateFieldConfigScheme(
  db: PrismaClient,
  organizationId: string,
  input: UpdateFieldConfigSchemeInput,
) {
  const existing = await db.fieldConfigurationScheme.findFirst({
    where: { id: input.id, organizationId },
  });
  if (!existing) throw new NotFoundError("FieldConfigurationScheme", input.id);

  const { id, ...updates } = input;
  return db.fieldConfigurationScheme.update({
    where: { id },
    data: updates,
    include: SCHEME_INCLUDE,
  });
}

export async function deleteFieldConfigScheme(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const scheme = await db.fieldConfigurationScheme.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { projects: true } } },
  });
  if (!scheme) throw new NotFoundError("FieldConfigurationScheme", id);
  if (scheme._count.projects > 0) {
    throw new ConflictError(
      `Cannot delete scheme used by ${scheme._count.projects} project(s)`,
    );
  }
  await db.fieldConfigurationScheme.delete({ where: { id } });
}

export async function addField(
  db: PrismaClient,
  organizationId: string,
  input: AddFieldConfigEntryInput,
) {
  const scheme = await db.fieldConfigurationScheme.findFirst({
    where: { id: input.fieldConfigurationSchemeId, organizationId },
  });
  if (!scheme) throw new NotFoundError("FieldConfigurationScheme", input.fieldConfigurationSchemeId);

  return db.fieldConfigurationEntry.create({
    data: {
      fieldConfigurationSchemeId: input.fieldConfigurationSchemeId,
      customFieldId: input.customFieldId,
      isVisible: input.isVisible,
      isRequired: input.isRequired,
      position: input.position ?? 0,
    },
    include: { customField: true },
  });
}

export async function updateField(
  db: PrismaClient,
  input: UpdateFieldConfigEntryInput,
) {
  const { id, ...updates } = input;
  return db.fieldConfigurationEntry.update({
    where: { id },
    data: updates,
    include: { customField: true },
  });
}

export async function removeField(db: PrismaClient, id: string) {
  await db.fieldConfigurationEntry.delete({ where: { id } });
}

export async function assignToProject(
  db: PrismaClient,
  organizationId: string,
  schemeId: string,
  projectId: string,
) {
  const scheme = await db.fieldConfigurationScheme.findFirst({
    where: { id: schemeId, organizationId },
  });
  if (!scheme) throw new NotFoundError("FieldConfigurationScheme", schemeId);

  await db.project.update({
    where: { id: projectId },
    data: { fieldConfigurationSchemeId: schemeId },
  });
}
