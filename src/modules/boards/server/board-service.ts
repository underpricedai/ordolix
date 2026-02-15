import type { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";
import type {
  CreateBoardInput,
  UpdateBoardInput,
  GetBoardDataInput,
  BoardColumn,
} from "../types/schemas";

const ISSUE_INCLUDE = {
  issueType: true,
  status: true,
  priority: true,
  assignee: true,
} as const;

export async function createBoard(
  db: PrismaClient,
  organizationId: string,
  input: CreateBoardInput,
) {
  const project = await db.project.findFirst({
    where: { id: input.projectId, organizationId },
  });
  if (!project) {
    throw new NotFoundError("Project", input.projectId);
  }

  let columns: BoardColumn[] | undefined = input.columns;
  if (!columns) {
    const workflow = await db.workflow.findFirst({
      where: {
        organizationId,
        OR: [
          { projects: { some: { id: input.projectId } } },
          { isDefault: true },
        ],
        isActive: true,
      },
      include: {
        workflowStatuses: {
          include: { status: true },
          orderBy: { position: "asc" as const },
        },
      },
    });
    if (workflow) {
      columns = workflow.workflowStatuses.map((ws) => ({
        id: crypto.randomUUID(),
        name: ws.status.name,
        statusIds: [ws.statusId],
      }));
    }
  }

  return db.board.create({
    data: {
      organizationId,
      projectId: input.projectId,
      name: input.name,
      boardType: input.boardType,
      columns: (columns ?? []) as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function listByProject(
  db: PrismaClient,
  organizationId: string,
  projectId: string,
) {
  return db.board.findMany({
    where: { organizationId, projectId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getBoard(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const board = await db.board.findFirst({
    where: { id, organizationId },
  });
  if (!board) {
    throw new NotFoundError("Board", id);
  }
  return board;
}

export async function getBoardData(
  db: PrismaClient,
  organizationId: string,
  input: GetBoardDataInput,
) {
  const board = await getBoard(db, organizationId, input.id);
  const columns = board.columns as unknown as BoardColumn[];
  const allStatusIds = columns.flatMap((c) => c.statusIds);

  const where: Prisma.IssueWhereInput = {
    organizationId,
    projectId: board.projectId,
    statusId: { in: allStatusIds },
    deletedAt: null,
  };
  if (input.sprintId) where.sprintId = input.sprintId;
  if (input.assigneeId) where.assigneeId = input.assigneeId;
  if (input.issueTypeId) where.issueTypeId = input.issueTypeId;

  const issues = await db.issue.findMany({
    where,
    include: ISSUE_INCLUDE,
  });

  return {
    board,
    columns: columns.map((col) => ({
      ...col,
      issues: issues.filter((i) => col.statusIds.includes(i.statusId)),
    })),
  };
}

export async function updateBoard(
  db: PrismaClient,
  organizationId: string,
  id: string,
  updates: Omit<UpdateBoardInput, "id">,
) {
  const existing = await db.board.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("Board", id);
  }

  const data: Prisma.BoardUpdateInput = {};
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.columns !== undefined)
    data.columns = updates.columns as unknown as Prisma.InputJsonValue;
  if (updates.swimlanes !== undefined)
    data.swimlanes = updates.swimlanes as unknown as Prisma.InputJsonValue;
  if (updates.cardFields !== undefined)
    data.cardFields = updates.cardFields as unknown as Prisma.InputJsonValue;
  if (updates.cardColor !== undefined) data.cardColor = updates.cardColor;
  if (updates.quickFilters !== undefined)
    data.quickFilters =
      updates.quickFilters as unknown as Prisma.InputJsonValue;

  return db.board.update({ where: { id }, data });
}

export async function deleteBoard(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const existing = await db.board.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("Board", id);
  }
  await db.board.delete({ where: { id } });
}
