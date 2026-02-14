import type { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";
import type { CreateIssueInput, UpdateIssueInput, ListIssuesInput } from "../types/schemas";

const ISSUE_INCLUDE = {
  issueType: true,
  status: true,
  priority: true,
  assignee: true,
  reporter: true,
  parent: { select: { id: true, key: true, summary: true } },
} as const;

export async function createIssue(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: CreateIssueInput,
) {
  // Verify project exists in org
  const project = await db.project.findFirst({
    where: { id: input.projectId, organizationId },
  });
  if (!project) {
    throw new NotFoundError("Project", input.projectId);
  }

  // Verify issue type exists in org
  const issueType = await db.issueType.findFirst({
    where: { id: input.issueTypeId, organizationId },
  });
  if (!issueType) {
    throw new NotFoundError("IssueType", input.issueTypeId);
  }

  // Resolve priority — use provided or default to Medium
  let priorityId = input.priorityId;
  if (!priorityId) {
    const defaultPriority = await db.priority.findFirst({
      where: { organizationId, name: "Medium" },
    });
    if (!defaultPriority) {
      throw new NotFoundError("Priority", "Medium");
    }
    priorityId = defaultPriority.id;
  }

  // Resolve initial status — first TO_DO status from default workflow
  const workflow = await db.workflow.findFirst({
    where: {
      organizationId,
      OR: [
        { projects: { some: { id: project.id } } },
        { isDefault: true },
      ],
    },
    include: {
      workflowStatuses: {
        include: { status: true },
        orderBy: { position: "asc" },
      },
    },
  });

  const initialStatus = workflow?.workflowStatuses.find(
    (ws) => ws.status.category === "TO_DO",
  )?.status;

  if (!initialStatus) {
    throw new NotFoundError("Status", "initial TO_DO status");
  }

  // Atomic: increment counter + create issue + audit log
  return db.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: project.id },
      data: { issueCounter: { increment: 1 } },
    });

    const key = `${project.key}-${updated.issueCounter}`;

    const issue = await tx.issue.create({
      data: {
        organizationId,
        projectId: project.id,
        key,
        summary: input.summary,
        description: input.description,
        issueTypeId: input.issueTypeId,
        statusId: initialStatus.id,
        priorityId,
        reporterId: userId,
        assigneeId: input.assigneeId,
        parentId: input.parentId,
        sprintId: input.sprintId,
        labels: input.labels,
        storyPoints: input.storyPoints,
        dueDate: input.dueDate,
        startDate: input.startDate,
        customFieldValues: input.customFieldValues as Prisma.InputJsonValue,
      },
      include: ISSUE_INCLUDE,
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        entityType: "Issue",
        entityId: issue.id,
        action: "CREATED",
        diff: { key, summary: input.summary },
      },
    });

    return issue;
  });
}

export async function getIssueByKey(
  db: PrismaClient,
  organizationId: string,
  key: string,
) {
  const issue = await db.issue.findFirst({
    where: { key, organizationId, deletedAt: null },
    include: ISSUE_INCLUDE,
  });

  if (!issue) {
    throw new NotFoundError("Issue", key);
  }

  return issue;
}

export async function listIssues(
  db: PrismaClient,
  organizationId: string,
  input: ListIssuesInput,
) {
  const where: Prisma.IssueWhereInput = {
    organizationId,
    projectId: input.projectId,
    deletedAt: null,
  };

  if (input.statusId) where.statusId = input.statusId;
  if (input.assigneeId) where.assigneeId = input.assigneeId;
  if (input.issueTypeId) where.issueTypeId = input.issueTypeId;
  if (input.search) {
    where.summary = { contains: input.search, mode: "insensitive" };
  }

  const orderBy: Prisma.IssueOrderByWithRelationInput = {};
  if (input.sortBy === "priority") {
    orderBy.priority = { rank: input.sortOrder };
  } else {
    orderBy[input.sortBy] = input.sortOrder;
  }

  const [items, total] = await Promise.all([
    db.issue.findMany({
      where,
      include: ISSUE_INCLUDE,
      orderBy,
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.issue.count({ where }),
  ]);

  return { items, total };
}

export async function updateIssue(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  id: string,
  updates: Omit<UpdateIssueInput, "id">,
) {
  const existing = await db.issue.findFirst({
    where: { id, organizationId, deletedAt: null },
  });

  if (!existing) {
    throw new NotFoundError("Issue", id);
  }

  // Build history records for changed fields
  const historyRecords: Array<{
    organizationId: string;
    issueId: string;
    userId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }> = [];

  const fieldsToTrack = [
    "summary",
    "description",
    "issueTypeId",
    "priorityId",
    "assigneeId",
    "parentId",
    "sprintId",
    "storyPoints",
    "dueDate",
    "startDate",
  ] as const;

  for (const field of fieldsToTrack) {
    if (field in updates) {
      const oldVal = existing[field];
      const newVal = updates[field as keyof typeof updates];
      if (oldVal !== newVal) {
        historyRecords.push({
          organizationId,
          issueId: id,
          userId,
          field,
          oldValue: oldVal != null ? String(oldVal) : null,
          newValue: newVal != null ? String(newVal) : null,
        });
      }
    }
  }

  // Handle labels separately (array comparison)
  if (updates.labels) {
    const oldLabels = existing.labels as string[];
    if (JSON.stringify(oldLabels) !== JSON.stringify(updates.labels)) {
      historyRecords.push({
        organizationId,
        issueId: id,
        userId,
        field: "labels",
        oldValue: JSON.stringify(oldLabels),
        newValue: JSON.stringify(updates.labels),
      });
    }
  }

  // Build Prisma-compatible update data
  const data: Prisma.IssueUpdateInput = {};
  if (updates.summary !== undefined) data.summary = updates.summary;
  if (updates.description !== undefined) data.description = updates.description;
  if (updates.labels !== undefined) data.labels = updates.labels;
  if (updates.storyPoints !== undefined) data.storyPoints = updates.storyPoints;
  if (updates.dueDate !== undefined) data.dueDate = updates.dueDate;
  if (updates.startDate !== undefined) data.startDate = updates.startDate;
  if (updates.customFieldValues !== undefined) {
    data.customFieldValues = updates.customFieldValues as Prisma.InputJsonValue;
  }
  // Relation fields use connect/disconnect
  if (updates.issueTypeId !== undefined) {
    data.issueType = { connect: { id: updates.issueTypeId } };
  }
  if (updates.priorityId !== undefined) {
    data.priority = { connect: { id: updates.priorityId } };
  }
  if (updates.assigneeId !== undefined) {
    data.assignee = updates.assigneeId
      ? { connect: { id: updates.assigneeId } }
      : { disconnect: true };
  }
  if (updates.parentId !== undefined) {
    data.parent = updates.parentId
      ? { connect: { id: updates.parentId } }
      : { disconnect: true };
  }
  if (updates.sprintId !== undefined) {
    data.sprint = updates.sprintId
      ? { connect: { id: updates.sprintId } }
      : { disconnect: true };
  }

  return db.$transaction(async (tx) => {
    if (historyRecords.length > 0) {
      await tx.issueHistory.createMany({ data: historyRecords });
    }

    const issue = await tx.issue.update({
      where: { id },
      data,
      include: ISSUE_INCLUDE,
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        entityType: "Issue",
        entityId: id,
        action: "UPDATED",
        diff: updates as unknown as Prisma.InputJsonValue,
      },
    });

    return issue;
  });
}

export async function deleteIssue(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  id: string,
) {
  const existing = await db.issue.findFirst({
    where: { id, organizationId, deletedAt: null },
  });

  if (!existing) {
    throw new NotFoundError("Issue", id);
  }

  await db.$transaction(async (tx) => {
    await tx.issue.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        entityType: "Issue",
        entityId: id,
        action: "DELETED",
        diff: { key: existing.key },
      },
    });
  });
}
