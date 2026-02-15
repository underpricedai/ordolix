/**
 * SchemeAdapter implementation for FieldConfigurationScheme.
 *
 * @module custom-fields/server/field-config-scheme-adapter
 */

import type { PrismaClient } from "@prisma/client";
import type { SchemeAdapter } from "@/shared/lib/scheme-sharing-service";

type FieldConfigSchemeWithEntries = Awaited<
  ReturnType<typeof findSchemeWithEntries>
>;

async function findSchemeWithEntries(
  db: PrismaClient,
  schemeId: string,
  organizationId: string,
) {
  return db.fieldConfigurationScheme.findFirst({
    where: { id: schemeId, organizationId },
    include: { entries: true },
  });
}

export const fieldConfigSchemeAdapter: SchemeAdapter<
  NonNullable<FieldConfigSchemeWithEntries>
> = {
  schemeType: "FieldConfigurationScheme",

  findSchemeWithEntries,

  async getProjectCount(db, schemeId, organizationId) {
    return db.project.count({
      where: { organizationId, fieldConfigurationSchemeId: schemeId },
    });
  },

  async cloneScheme(db, scheme, newName, organizationId) {
    return db.fieldConfigurationScheme.create({
      data: {
        organizationId,
        name: newName,
        description: scheme.description,
        isDefault: false,
        parentId: scheme.id,
        entries: {
          create: scheme.entries.map((e) => ({
            customFieldId: e.customFieldId,
            isVisible: e.isVisible,
            isRequired: e.isRequired,
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
      data: { fieldConfigurationSchemeId: schemeId },
    });
  },
};
