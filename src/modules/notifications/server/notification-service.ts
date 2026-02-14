import type { PrismaClient, Prisma } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";
import type {
  CreateNotificationInput,
  ListNotificationsInput,
  UpdatePreferenceInput,
} from "../types/schemas";

export async function createNotification(
  db: PrismaClient,
  organizationId: string,
  input: CreateNotificationInput,
) {
  return db.notificationRecord.create({
    data: {
      organizationId,
      userId: input.userId,
      event: input.type,
      title: input.title,
      body: input.body ?? "",
      issueId: input.issueId,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
    },
  });
}

export async function listNotifications(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: ListNotificationsInput,
) {
  return db.notificationRecord.findMany({
    where: {
      organizationId,
      userId,
      ...(input.isRead !== undefined ? { isRead: input.isRead } : {}),
    },
    orderBy: { sentAt: "desc" as const },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });
}

export async function markRead(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  id: string,
) {
  const notification = await db.notificationRecord.findFirst({
    where: { id, organizationId, userId },
  });
  if (!notification) {
    throw new NotFoundError("Notification", id);
  }

  return db.notificationRecord.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function markAllRead(
  db: PrismaClient,
  organizationId: string,
  userId: string,
) {
  return db.notificationRecord.updateMany({
    where: { organizationId, userId, isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function getUnreadCount(
  db: PrismaClient,
  organizationId: string,
  userId: string,
) {
  return db.notificationRecord.count({
    where: { organizationId, userId, isRead: false },
  });
}

export async function updatePreference(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: UpdatePreferenceInput,
) {
  return db.notificationPreference.upsert({
    where: {
      userId_projectId_event: {
        userId,
        projectId: "",
        event: input.eventType,
      },
    },
    create: {
      organizationId,
      userId,
      event: input.eventType,
      channels: JSON.stringify([input.channel]),
    },
    update: {
      channels: JSON.stringify([input.channel]),
    },
  });
}

export async function listPreferences(
  db: PrismaClient,
  organizationId: string,
  userId: string,
) {
  return db.notificationPreference.findMany({
    where: { organizationId, userId },
  });
}

export async function deleteNotification(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  id: string,
) {
  const notification = await db.notificationRecord.findFirst({
    where: { id, organizationId, userId },
  });
  if (!notification) {
    throw new NotFoundError("Notification", id);
  }

  return db.notificationRecord.delete({
    where: { id },
  });
}
