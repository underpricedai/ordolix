import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";
import type {
  CreateChecklistInput,
  AddChecklistItemInput,
} from "../types/schemas";

export async function createChecklist(
  db: PrismaClient,
  organizationId: string,
  input: CreateChecklistInput,
) {
  const issue = await db.issue.findFirst({
    where: { id: input.issueId, organizationId },
  });
  if (!issue) {
    throw new NotFoundError("Issue", input.issueId);
  }

  return db.checklist.create({
    data: {
      organizationId,
      issueId: input.issueId,
      title: input.title ?? "Checklist",
      position: input.position ?? 0,
    },
  });
}

export async function getChecklists(
  db: PrismaClient,
  organizationId: string,
  issueId: string,
) {
  return db.checklist.findMany({
    where: { organizationId, issueId },
    include: {
      items: { orderBy: { position: "asc" as const } },
    },
    orderBy: { position: "asc" as const },
  });
}

export async function updateChecklist(
  db: PrismaClient,
  organizationId: string,
  id: string,
  updates: { title?: string; position?: number },
) {
  const existing = await db.checklist.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("Checklist", id);
  }

  const data: Record<string, unknown> = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.position !== undefined) data.position = updates.position;

  return db.checklist.update({ where: { id }, data });
}

export async function deleteChecklist(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const existing = await db.checklist.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("Checklist", id);
  }
  await db.checklist.delete({ where: { id } });
}

export async function addItem(
  db: PrismaClient,
  organizationId: string,
  input: AddChecklistItemInput,
) {
  const checklist = await db.checklist.findFirst({
    where: { id: input.checklistId, organizationId },
  });
  if (!checklist) {
    throw new NotFoundError("Checklist", input.checklistId);
  }

  return db.checklistItem.create({
    data: {
      checklistId: input.checklistId,
      text: input.text,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ?? null,
      position: input.position ?? 0,
    },
  });
}

export async function updateItem(
  db: PrismaClient,
  organizationId: string,
  id: string,
  updates: {
    text?: string;
    isChecked?: boolean;
    assigneeId?: string | null;
    dueDate?: Date | null;
    position?: number;
  },
) {
  const item = await db.checklistItem.findFirst({
    where: {
      id,
      checklist: { organizationId },
    },
  });
  if (!item) {
    throw new NotFoundError("ChecklistItem", id);
  }

  const data: Record<string, unknown> = {};
  if (updates.text !== undefined) data.text = updates.text;
  if (updates.isChecked !== undefined) data.isChecked = updates.isChecked;
  if (updates.assigneeId !== undefined) data.assigneeId = updates.assigneeId;
  if (updates.dueDate !== undefined) data.dueDate = updates.dueDate;
  if (updates.position !== undefined) data.position = updates.position;

  return db.checklistItem.update({ where: { id }, data });
}

export async function deleteItem(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const item = await db.checklistItem.findFirst({
    where: {
      id,
      checklist: { organizationId },
    },
  });
  if (!item) {
    throw new NotFoundError("ChecklistItem", id);
  }
  await db.checklistItem.delete({ where: { id } });
}
