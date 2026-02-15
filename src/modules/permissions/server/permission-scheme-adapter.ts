/**
 * SchemeAdapter implementation for PermissionScheme.
 *
 * @module permissions/server/permission-scheme-adapter
 */

import type { PrismaClient } from "@prisma/client";
import type { SchemeAdapter } from "@/shared/lib/scheme-sharing-service";

type PermissionSchemeWithGrants = Awaited<
  ReturnType<typeof findSchemeWithEntries>
>;

async function findSchemeWithEntries(
  db: PrismaClient,
  schemeId: string,
  organizationId: string,
) {
  return db.permissionScheme.findFirst({
    where: { id: schemeId, organizationId },
    include: { grants: true },
  });
}

export const permissionSchemeAdapter: SchemeAdapter<
  NonNullable<PermissionSchemeWithGrants>
> = {
  schemeType: "PermissionScheme",

  findSchemeWithEntries,

  async getProjectCount(db, schemeId, organizationId) {
    return db.project.count({
      where: { organizationId, permissionSchemeId: schemeId },
    });
  },

  async cloneScheme(db, scheme, newName, organizationId) {
    return db.permissionScheme.create({
      data: {
        organizationId,
        name: newName,
        description: scheme.description,
        isDefault: false,
        parentId: scheme.id,
        grants: {
          create: scheme.grants.map((g) => ({
            permissionKey: g.permissionKey,
            holderType: g.holderType,
            projectRoleId: g.projectRoleId,
            groupId: g.groupId,
            userId: g.userId,
          })),
        },
      },
      include: { grants: true },
    });
  },

  async assignToProject(db, schemeId, projectId) {
    await db.project.update({
      where: { id: projectId },
      data: { permissionSchemeId: schemeId },
    });
  },
};
