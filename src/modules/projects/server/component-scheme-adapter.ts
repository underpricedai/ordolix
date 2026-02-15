/**
 * SchemeAdapter implementation for ComponentScheme.
 *
 * @module projects/server/component-scheme-adapter
 */

import type { PrismaClient } from "@prisma/client";
import type { SchemeAdapter } from "@/shared/lib/scheme-sharing-service";

type ComponentSchemeWithEntries = Awaited<
  ReturnType<typeof findSchemeWithEntries>
>;

async function findSchemeWithEntries(
  db: PrismaClient,
  schemeId: string,
  organizationId: string,
) {
  return db.componentScheme.findFirst({
    where: { id: schemeId, organizationId },
    include: { entries: true },
  });
}

export const componentSchemeAdapter: SchemeAdapter<
  NonNullable<ComponentSchemeWithEntries>
> = {
  schemeType: "ComponentScheme",

  findSchemeWithEntries,

  async getProjectCount(db, schemeId, organizationId) {
    return db.project.count({
      where: { organizationId, componentSchemeId: schemeId },
    });
  },

  async cloneScheme(db, scheme, newName, organizationId) {
    return db.componentScheme.create({
      data: {
        organizationId,
        name: newName,
        description: scheme.description,
        isDefault: false,
        parentId: scheme.id,
        entries: {
          create: scheme.entries.map((e) => ({
            componentId: e.componentId,
            isDefault: e.isDefault,
            position: e.position,
          })),
        },
      },
      include: { entries: true },
    });
  },

  async assignToProject(db, schemeId, projectId) {
    await db.project.update({
      where: { id: projectId },
      data: { componentSchemeId: schemeId },
    });
  },
};
