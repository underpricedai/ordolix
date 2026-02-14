import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import type {
  CreateRetroInput,
  UpdateRetroInput,
  ListRetrosInput,
  AddCardInput,
  UpdateCardInput,
} from "../types/schemas";

const AUTHOR_SELECT = {
  select: { id: true, name: true },
} as const;

export async function createRetro(
  db: PrismaClient,
  organizationId: string,
  input: CreateRetroInput,
) {
  const project = await db.project.findFirst({
    where: { id: input.projectId, organizationId },
  });
  if (!project) {
    throw new NotFoundError("Project", input.projectId);
  }

  return db.retrospective.create({
    data: {
      organizationId,
      projectId: input.projectId,
      name: input.name,
      sprintId: input.sprintId,
      categories: input.categories,
    },
  });
}

export async function getRetro(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const retro = await db.retrospective.findFirst({
    where: { id, organizationId },
    include: {
      cards: {
        include: { author: AUTHOR_SELECT },
        orderBy: { createdAt: "asc" as const },
      },
    },
  });
  if (!retro) {
    throw new NotFoundError("Retrospective", id);
  }
  return retro;
}

export async function listRetros(
  db: PrismaClient,
  organizationId: string,
  input: ListRetrosInput,
) {
  return db.retrospective.findMany({
    where: {
      organizationId,
      projectId: input.projectId,
      ...(input.status ? { status: input.status } : {}),
    },
    include: { _count: { select: { cards: true } } },
    orderBy: { createdAt: "desc" as const },
  });
}

export async function updateRetro(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: Omit<UpdateRetroInput, "id">,
) {
  const retro = await db.retrospective.findFirst({
    where: { id, organizationId },
  });
  if (!retro) {
    throw new NotFoundError("Retrospective", id);
  }

  return db.retrospective.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });
}

export async function deleteRetro(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const retro = await db.retrospective.findFirst({
    where: { id, organizationId },
  });
  if (!retro) {
    throw new NotFoundError("Retrospective", id);
  }

  return db.retrospective.delete({ where: { id } });
}

export async function addCard(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: AddCardInput,
) {
  const retro = await db.retrospective.findFirst({
    where: { id: input.retrospectiveId, organizationId },
  });
  if (!retro) {
    throw new NotFoundError("Retrospective", input.retrospectiveId);
  }
  if (retro.status === "completed") {
    throw new ValidationError("Cannot add cards to a completed retrospective", {
      code: "RETRO_COMPLETED",
    });
  }

  const categories = retro.categories as string[];
  if (!categories.includes(input.category)) {
    throw new ValidationError(
      `Invalid category '${input.category}'. Must be one of: ${categories.join(", ")}`,
      { code: "INVALID_CATEGORY", validCategories: categories },
    );
  }

  return db.retroCard.create({
    data: {
      retrospectiveId: input.retrospectiveId,
      authorId: userId,
      category: input.category,
      text: input.text,
    },
    include: { author: AUTHOR_SELECT },
  });
}

export async function updateCard(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: Omit<UpdateCardInput, "id">,
) {
  const card = await db.retroCard.findFirst({
    where: {
      id,
      retrospective: { organizationId },
    },
  });
  if (!card) {
    throw new NotFoundError("RetroCard", id);
  }

  return db.retroCard.update({
    where: { id },
    data: {
      ...(input.text !== undefined ? { text: input.text } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.linkedIssueId !== undefined
        ? { linkedIssueId: input.linkedIssueId }
        : {}),
    },
    include: { author: AUTHOR_SELECT },
  });
}

export async function voteCard(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const card = await db.retroCard.findFirst({
    where: {
      id,
      retrospective: { organizationId },
    },
  });
  if (!card) {
    throw new NotFoundError("RetroCard", id);
  }

  return db.retroCard.update({
    where: { id },
    data: { votes: { increment: 1 } },
    include: { author: AUTHOR_SELECT },
  });
}

export async function deleteCard(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const card = await db.retroCard.findFirst({
    where: {
      id,
      retrospective: { organizationId },
    },
  });
  if (!card) {
    throw new NotFoundError("RetroCard", id);
  }

  return db.retroCard.delete({ where: { id } });
}
