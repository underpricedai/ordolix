import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";

export async function listComponents(db: PrismaClient, organizationId: string, projectId: string) {
  return db.component.findMany({
    where: { projectId, organizationId },
    orderBy: { name: "asc" },
  });
}

export async function createComponent(
  db: PrismaClient, organizationId: string,
  input: { projectId: string; name: string; description?: string; lead?: string },
) {
  return db.component.create({
    data: { organizationId, projectId: input.projectId, name: input.name, description: input.description, lead: input.lead },
  });
}

export async function updateComponent(
  db: PrismaClient, organizationId: string, id: string,
  updates: { name?: string; description?: string | null; lead?: string | null },
) {
  const existing = await db.component.findFirst({ where: { id, organizationId } });
  if (!existing) throw new NotFoundError("Component", id);
  return db.component.update({ where: { id }, data: updates });
}

export async function deleteComponent(db: PrismaClient, organizationId: string, id: string) {
  const existing = await db.component.findFirst({ where: { id, organizationId } });
  if (!existing) throw new NotFoundError("Component", id);
  await db.component.delete({ where: { id } });
}
