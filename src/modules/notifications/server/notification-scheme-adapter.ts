/**
 * SchemeAdapter implementation for NotificationScheme.
 *
 * @module notifications/server/notification-scheme-adapter
 */

import type { PrismaClient } from "@prisma/client";
import type { SchemeAdapter } from "@/shared/lib/scheme-sharing-service";

type NotificationSchemeWithEntries = Awaited<
  ReturnType<typeof findSchemeWithEntries>
>;

async function findSchemeWithEntries(
  db: PrismaClient,
  schemeId: string,
  organizationId: string,
) {
  return db.notificationScheme.findFirst({
    where: { id: schemeId, organizationId },
    include: { entries: true },
  });
}

export const notificationSchemeAdapter: SchemeAdapter<
  NonNullable<NotificationSchemeWithEntries>
> = {
  schemeType: "NotificationScheme",

  findSchemeWithEntries,

  async getProjectCount(db, schemeId, organizationId) {
    return db.project.count({
      where: { organizationId, notificationSchemeId: schemeId },
    });
  },

  async cloneScheme(db, scheme, newName, organizationId) {
    return db.notificationScheme.create({
      data: {
        organizationId,
        name: newName,
        description: scheme.description,
        isDefault: false,
        parentId: scheme.id,
        entries: {
          create: scheme.entries.map((e) => ({
            event: e.event,
            recipientType: e.recipientType,
            recipientId: e.recipientId,
            channels: e.channels ?? ["in_app", "email"],
          })),
        },
      },
      include: { entries: true },
    });
  },

  async assignToProject(db, schemeId, projectId) {
    await db.project.update({
      where: { id: projectId },
      data: { notificationSchemeId: schemeId },
    });
  },
};
