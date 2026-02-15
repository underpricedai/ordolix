import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ConflictError } from "@/server/lib/errors";

export async function listIssueTypes(db: PrismaClient, organizationId: string) {
  return db.issueType.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
}

export async function createIssueType(
  db: PrismaClient, organizationId: string,
  input: { name: string; icon: string; color: string; isSubtask?: boolean; hierarchyLevel?: number; category?: string },
) {
  return db.issueType.create({
    data: {
      organizationId, name: input.name, icon: input.icon, color: input.color,
      isSubtask: input.isSubtask ?? false, hierarchyLevel: input.hierarchyLevel ?? 0,
      category: input.category ?? "software",
    },
  });
}

export async function updateIssueType(
  db: PrismaClient, organizationId: string, id: string,
  updates: { name?: string; icon?: string; color?: string; isSubtask?: boolean; hierarchyLevel?: number; category?: string },
) {
  const existing = await db.issueType.findFirst({ where: { id, organizationId } });
  if (!existing) throw new NotFoundError("IssueType", id);
  return db.issueType.update({ where: { id }, data: updates });
}

export async function deleteIssueType(db: PrismaClient, organizationId: string, id: string) {
  const existing = await db.issueType.findFirst({ where: { id, organizationId } });
  if (!existing) throw new NotFoundError("IssueType", id);
  const issueCount = await db.issue.count({ where: { issueTypeId: id, organizationId } });
  if (issueCount > 0) throw new ConflictError("Cannot delete issue type that is in use by issues");
  await db.issueType.delete({ where: { id } });
}
