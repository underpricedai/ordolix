/**
 * SchemeAdapter implementation for IssueTypeScheme.
 *
 * @module admin/server/issue-type-scheme-adapter
 */

import type { PrismaClient } from "@prisma/client";
import type { SchemeAdapter } from "@/shared/lib/scheme-sharing-service";

type IssueTypeSchemeWithEntries = Awaited<
  ReturnType<typeof findSchemeWithEntries>
>;

async function findSchemeWithEntries(
  db: PrismaClient,
  schemeId: string,
  organizationId: string,
) {
  return db.issueTypeScheme.findFirst({
    where: { id: schemeId, organizationId },
    include: { entries: true },
  });
}

export const issueTypeSchemeAdapter: SchemeAdapter<
  NonNullable<IssueTypeSchemeWithEntries>
> = {
  schemeType: "IssueTypeScheme",

  findSchemeWithEntries,

  async getProjectCount(db, schemeId, organizationId) {
    return db.project.count({
      where: { organizationId, issueTypeSchemeId: schemeId },
    });
  },

  async cloneScheme(db, scheme, newName, organizationId) {
    return db.issueTypeScheme.create({
      data: {
        organizationId,
        name: newName,
        description: scheme.description,
        isDefault: false,
        parentId: scheme.id,
        entries: {
          create: scheme.entries.map((e) => ({
            issueTypeId: e.issueTypeId,
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
      data: { issueTypeSchemeId: schemeId },
    });
  },
};
