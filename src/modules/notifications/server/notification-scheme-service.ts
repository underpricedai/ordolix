/**
 * Service for NotificationScheme CRUD operations.
 *
 * @module notifications/server/notification-scheme-service
 */

import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ConflictError } from "@/server/lib/errors";
import type {
  CreateNotificationSchemeInput,
  UpdateNotificationSchemeInput,
  AddNotificationSchemeEntryInput,
} from "../types/schemas";

const SCHEME_INCLUDE = {
  entries: {
    orderBy: { event: "asc" as const },
  },
  _count: { select: { projects: true } },
} as const;

export async function listNotificationSchemes(
  db: PrismaClient,
  organizationId: string,
) {
  return db.notificationScheme.findMany({
    where: { organizationId },
    include: {
      _count: { select: { entries: true, projects: true } },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getNotificationScheme(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const scheme = await db.notificationScheme.findFirst({
    where: { id, organizationId },
    include: SCHEME_INCLUDE,
  });
  if (!scheme) throw new NotFoundError("NotificationScheme", id);
  return scheme;
}

export async function createNotificationScheme(
  db: PrismaClient,
  organizationId: string,
  input: CreateNotificationSchemeInput,
) {
  return db.notificationScheme.create({
    data: {
      organizationId,
      name: input.name,
      description: input.description,
    },
    include: SCHEME_INCLUDE,
  });
}

export async function updateNotificationScheme(
  db: PrismaClient,
  organizationId: string,
  input: UpdateNotificationSchemeInput,
) {
  const existing = await db.notificationScheme.findFirst({
    where: { id: input.id, organizationId },
  });
  if (!existing) throw new NotFoundError("NotificationScheme", input.id);

  const { id, ...updates } = input;
  return db.notificationScheme.update({
    where: { id },
    data: updates,
    include: SCHEME_INCLUDE,
  });
}

export async function deleteNotificationScheme(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const scheme = await db.notificationScheme.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { projects: true } } },
  });
  if (!scheme) throw new NotFoundError("NotificationScheme", id);
  if (scheme._count.projects > 0) {
    throw new ConflictError(
      `Cannot delete scheme used by ${scheme._count.projects} project(s)`,
    );
  }
  await db.notificationScheme.delete({ where: { id } });
}

export async function addEntry(
  db: PrismaClient,
  organizationId: string,
  input: AddNotificationSchemeEntryInput,
) {
  const scheme = await db.notificationScheme.findFirst({
    where: { id: input.notificationSchemeId, organizationId },
  });
  if (!scheme) throw new NotFoundError("NotificationScheme", input.notificationSchemeId);

  return db.notificationSchemeEntry.create({
    data: {
      notificationSchemeId: input.notificationSchemeId,
      event: input.event,
      recipientType: input.recipientType,
      recipientId: input.recipientId ?? null,
      channels: input.channels,
    },
  });
}

export async function removeEntry(db: PrismaClient, id: string) {
  await db.notificationSchemeEntry.delete({ where: { id } });
}

export async function assignToProject(
  db: PrismaClient,
  organizationId: string,
  schemeId: string,
  projectId: string,
) {
  const scheme = await db.notificationScheme.findFirst({
    where: { id: schemeId, organizationId },
  });
  if (!scheme) throw new NotFoundError("NotificationScheme", schemeId);

  await db.project.update({
    where: { id: projectId },
    data: { notificationSchemeId: schemeId },
  });
}
