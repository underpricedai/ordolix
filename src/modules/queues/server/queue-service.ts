/**
 * @description Queue (Service Desk) service layer.
 * Provides CRUD operations for queues, filtered issue listing, and assignment.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";
import type {
  CreateQueueInput,
  UpdateQueueInput,
  ListQueuesInput,
  GetQueueIssuesInput,
  AssignFromQueueInput,
  QueueFilter,
  QueueSortOrder,
} from "../types/schemas";

const ISSUE_INCLUDE = {
  issueType: true,
  status: true,
  priority: true,
  assignee: true,
} as const;

/**
 * Map a QueueSortOrder value to a Prisma orderBy clause.
 * @param sortOrder - The sort order enum value
 * @returns Prisma-compatible orderBy object
 */
function mapSortOrder(sortOrder: QueueSortOrder): Record<string, string> {
  switch (sortOrder) {
    case "created_asc":
      return { createdAt: "asc" };
    case "created_desc":
      return { createdAt: "desc" };
    case "priority_desc":
      return { priorityId: "desc" };
    case "updated_desc":
      return { updatedAt: "desc" };
    case "sla_breach_asc":
      return { dueDate: "asc" };
  }
}

/**
 * Build a Prisma where clause from a QueueFilter.
 * @param filter - The queue filter config
 * @param organizationId - Org scope
 * @param projectId - Project scope
 * @returns Prisma IssueWhereInput
 */
function buildFilterWhere(
  filter: QueueFilter,
  organizationId: string,
  projectId: string,
): Prisma.IssueWhereInput {
  const where: Prisma.IssueWhereInput = {
    organizationId,
    projectId,
    deletedAt: null,
  };

  if (filter.issueTypeIds?.length) {
    where.issueTypeId = { in: filter.issueTypeIds };
  }
  if (filter.priorityIds?.length) {
    where.priorityId = { in: filter.priorityIds };
  }
  if (filter.statusIds?.length) {
    where.statusId = { in: filter.statusIds };
  }
  if (filter.assigneeIds?.length) {
    where.assigneeId = { in: filter.assigneeIds };
  }
  if (filter.labels?.length) {
    where.labels = { hasSome: filter.labels };
  }

  return where;
}

/**
 * Create a new queue for a project.
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param userId - User creating the queue
 * @param input - Queue creation input
 * @returns The created queue record
 * @throws NotFoundError if project does not exist in org
 */
export async function createQueue(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: CreateQueueInput,
) {
  const project = await db.project.findFirst({
    where: { id: input.projectId, organizationId },
  });
  if (!project) {
    throw new NotFoundError("Project", input.projectId);
  }

  const queue = await db.queue.create({
    data: {
      organizationId,
      projectId: input.projectId,
      name: input.name,
      filterQuery: JSON.stringify(input.filter),
      sortBy: "priority",
      assignmentRule: (input.description
        ? { description: input.description }
        : {}) as unknown as Prisma.InputJsonValue,
    },
  });

  await db.auditLog.create({
    data: {
      organizationId,
      userId,
      entityType: "Queue",
      entityId: queue.id,
      action: "create",
      diff: { name: input.name } as unknown as Prisma.InputJsonValue,
    },
  });

  return queue;
}

/**
 * Update an existing queue.
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param input - Queue update input (includes id)
 * @returns The updated queue record
 * @throws NotFoundError if queue does not exist in org
 */
export async function updateQueue(
  db: PrismaClient,
  organizationId: string,
  input: UpdateQueueInput,
) {
  const existing = await db.queue.findFirst({
    where: { id: input.id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("Queue", input.id);
  }

  const data: Prisma.QueueUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.filter !== undefined) {
    data.filterQuery = JSON.stringify(input.filter);
  }
  if (input.sortOrder !== undefined) data.sortBy = input.sortOrder;
  if (input.description !== undefined) {
    data.assignmentRule = {
      ...((existing.assignmentRule as Record<string, unknown>) ?? {}),
      description: input.description,
    } as unknown as Prisma.InputJsonValue;
  }
  if (input.columns !== undefined) {
    data.assignmentRule = {
      ...((existing.assignmentRule as Record<string, unknown>) ?? {}),
      ...(data.assignmentRule as Record<string, unknown> | undefined),
      columns: input.columns,
    } as unknown as Prisma.InputJsonValue;
  }

  return db.queue.update({ where: { id: input.id }, data });
}

/**
 * List all queues for a project, including a count of matching issues.
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param input - List input with projectId
 * @returns Array of queues with issue counts
 */
export async function listQueues(
  db: PrismaClient,
  organizationId: string,
  input: ListQueuesInput,
) {
  const queues = await db.queue.findMany({
    where: { organizationId, projectId: input.projectId },
    orderBy: { createdAt: "asc" as const },
  });

  const results = await Promise.all(
    queues.map(async (queue) => {
      const filter = queue.filterQuery
        ? (JSON.parse(queue.filterQuery) as QueueFilter)
        : {};
      const where = buildFilterWhere(filter, organizationId, input.projectId);
      const issueCount = await db.issue.count({ where });
      return { ...queue, _count: { issues: issueCount } };
    }),
  );

  return results;
}

/**
 * Get a single queue by id.
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param queueId - Queue id
 * @returns The queue record
 * @throws NotFoundError if queue does not exist in org
 */
export async function getQueue(
  db: PrismaClient,
  organizationId: string,
  queueId: string,
) {
  const queue = await db.queue.findFirst({
    where: { id: queueId, organizationId },
  });
  if (!queue) {
    throw new NotFoundError("Queue", queueId);
  }
  return queue;
}

/**
 * Get paginated issues matching a queue's filter.
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param input - Queue issues input with pagination
 * @returns Paginated issues with nextCursor
 * @throws NotFoundError if queue does not exist in org
 */
export async function getQueueIssues(
  db: PrismaClient,
  organizationId: string,
  input: GetQueueIssuesInput,
) {
  const queue = await db.queue.findFirst({
    where: { id: input.queueId, organizationId },
  });
  if (!queue) {
    throw new NotFoundError("Queue", input.queueId);
  }

  const filter = queue.filterQuery
    ? (JSON.parse(queue.filterQuery) as QueueFilter)
    : {};
  const where = buildFilterWhere(filter, organizationId, queue.projectId);

  const sortOrder = (queue.sortBy ?? "priority") as QueueSortOrder;
  const orderBy = input.sortBy
    ? { [input.sortBy]: input.sortOrder }
    : mapSortOrder(
        [
          "created_asc",
          "created_desc",
          "priority_desc",
          "updated_desc",
          "sla_breach_asc",
        ].includes(sortOrder)
          ? sortOrder
          : "priority_desc",
      );

  const take = input.limit + 1;
  const issues = await db.issue.findMany({
    where,
    include: ISSUE_INCLUDE,
    orderBy,
    take,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  let nextCursor: string | undefined;
  if (issues.length > input.limit) {
    const last = issues.pop();
    nextCursor = last?.id;
  }

  return { issues, nextCursor };
}

/**
 * Delete a queue.
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param queueId - Queue id to delete
 * @throws NotFoundError if queue does not exist in org
 */
export async function deleteQueue(
  db: PrismaClient,
  organizationId: string,
  queueId: string,
) {
  const existing = await db.queue.findFirst({
    where: { id: queueId, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("Queue", queueId);
  }
  await db.queue.delete({ where: { id: queueId } });
}

/**
 * Assign an issue to an agent from a queue context.
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param userId - User performing the assignment
 * @param input - Assignment input with issueId and assigneeId
 * @returns The updated issue
 * @throws NotFoundError if issue does not exist in org
 */
export async function assignFromQueue(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: AssignFromQueueInput,
) {
  const issue = await db.issue.findFirst({
    where: { id: input.issueId, organizationId, deletedAt: null },
  });
  if (!issue) {
    throw new NotFoundError("Issue", input.issueId);
  }

  const updated = await db.issue.update({
    where: { id: input.issueId },
    data: { assigneeId: input.assigneeId },
    include: ISSUE_INCLUDE,
  });

  await db.auditLog.create({
    data: {
      organizationId,
      userId,
      entityType: "Issue",
      entityId: input.issueId,
      action: "update",
      diff: {
        field: "assigneeId",
        from: issue.assigneeId,
        to: input.assigneeId,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return updated;
}
