import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

export async function listVersions(db: PrismaClient, organizationId: string, projectId: string) {
  return db.version.findMany({
    where: { projectId, organizationId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createVersion(
  db: PrismaClient, organizationId: string,
  input: { projectId: string; name: string; description?: string; startDate?: Date; releaseDate?: Date },
) {
  return db.version.create({
    data: {
      organizationId, projectId: input.projectId, name: input.name,
      description: input.description, startDate: input.startDate, releaseDate: input.releaseDate,
    },
  });
}

export async function updateVersion(
  db: PrismaClient, organizationId: string, id: string,
  updates: { name?: string; description?: string | null; startDate?: Date | null; releaseDate?: Date | null; status?: string },
) {
  const existing = await db.version.findFirst({ where: { id, organizationId } });
  if (!existing) throw new NotFoundError("Version", id);
  return db.version.update({ where: { id }, data: updates });
}

export async function deleteVersion(db: PrismaClient, organizationId: string, id: string) {
  const existing = await db.version.findFirst({ where: { id, organizationId } });
  if (!existing) throw new NotFoundError("Version", id);
  await db.version.delete({ where: { id } });
}

export async function releaseVersion(db: PrismaClient, organizationId: string, id: string) {
  const existing = await db.version.findFirst({ where: { id, organizationId } });
  if (!existing) throw new NotFoundError("Version", id);
  if (existing.status === "released") throw new ValidationError("Version is already released");
  return db.version.update({
    where: { id },
    data: { status: "released", releaseDate: new Date() },
  });
}
