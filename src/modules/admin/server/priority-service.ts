import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ConflictError } from "@/server/lib/errors";

export async function listPriorities(db: PrismaClient, organizationId: string) {
  return db.priority.findMany({
    where: { organizationId },
    orderBy: { rank: "asc" },
  });
}

export async function createPriority(
  db: PrismaClient, organizationId: string,
  input: { name: string; rank: number; color: string; slaMultiplier?: number },
) {
  return db.priority.create({
    data: { organizationId, name: input.name, rank: input.rank, color: input.color, slaMultiplier: input.slaMultiplier ?? 1.0 },
  });
}

export async function updatePriority(
  db: PrismaClient, organizationId: string,
  id: string, updates: { name?: string; color?: string; slaMultiplier?: number },
) {
  const existing = await db.priority.findFirst({ where: { id, organizationId } });
  if (!existing) throw new NotFoundError("Priority", id);
  return db.priority.update({ where: { id }, data: updates });
}

export async function deletePriority(db: PrismaClient, organizationId: string, id: string) {
  const existing = await db.priority.findFirst({ where: { id, organizationId } });
  if (!existing) throw new NotFoundError("Priority", id);
  const issueCount = await db.issue.count({ where: { priorityId: id, organizationId } });
  if (issueCount > 0) throw new ConflictError("Cannot delete priority that is in use by issues");
  await db.priority.delete({ where: { id } });
}

export async function reorderPriorities(
  db: PrismaClient, organizationId: string,
  orderedIds: string[],
) {
  return db.$transaction(
    orderedIds.map((id, index) =>
      db.priority.update({ where: { id }, data: { rank: index + 1 } }),
    ),
  );
}
