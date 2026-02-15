/**
 * SchemeAdapter implementation for IssueSecurityScheme.
 *
 * @module permissions/server/issue-security-scheme-adapter
 */

import type { PrismaClient } from "@prisma/client";
import type { SchemeAdapter } from "@/shared/lib/scheme-sharing-service";

type SecuritySchemeWithLevels = Awaited<
  ReturnType<typeof findSchemeWithEntries>
>;

async function findSchemeWithEntries(
  db: PrismaClient,
  schemeId: string,
  organizationId: string,
) {
  return db.issueSecurityScheme.findFirst({
    where: { id: schemeId, organizationId },
    include: {
      levels: {
        include: { members: true },
      },
    },
  });
}

export const issueSecuritySchemeAdapter: SchemeAdapter<
  NonNullable<SecuritySchemeWithLevels>
> = {
  schemeType: "IssueSecurityScheme",

  findSchemeWithEntries,

  async getProjectCount(db, schemeId, organizationId) {
    return db.project.count({
      where: { organizationId, issueSecuritySchemeId: schemeId },
    });
  },

  async cloneScheme(db, scheme, newName, organizationId) {
    return db.issueSecurityScheme.create({
      data: {
        organizationId,
        name: newName,
        description: scheme.description,
        isDefault: false,
        parentId: scheme.id,
        levels: {
          create: scheme.levels.map((level) => ({
            name: level.name,
            description: level.description,
            orderIndex: level.orderIndex,
            members: {
              create: level.members.map((m) => ({
                holderType: m.holderType,
                projectRoleId: m.projectRoleId,
                groupId: m.groupId,
                userId: m.userId,
              })),
            },
          })),
        },
      },
      include: {
        levels: {
          include: { members: true },
        },
      },
    });
  },

  async assignToProject(db, schemeId, projectId) {
    await db.project.update({
      where: { id: projectId },
      data: { issueSecuritySchemeId: schemeId },
    });
  },
};
