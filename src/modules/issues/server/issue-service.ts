import type { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError, PermissionError, ValidationError } from "@/server/lib/errors";
import type {
  CreateIssueInput,
  UpdateIssueInput,
  ListIssuesInput,
  ListHistoryInput,
  CreateLinkInput,
  CreateCommentInput,
  UpdateCommentInput,
  ListCommentsInput,
} from "../types/schemas";

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

  const initialStatus = workflow?.workflowStatuses?.find(
    (ws) => ws.status?.category === "TO_DO",
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

export async function getIssueById(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const issue = await db.issue.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: ISSUE_INCLUDE,
  });

  if (!issue) {
    throw new NotFoundError("Issue", id);
  }

  return issue;
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

// ── History ────────────────────────────────────────────────────────────────

export async function getIssueHistory(
  db: PrismaClient,
  organizationId: string,
  issueId: string,
  input: ListHistoryInput,
) {
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  const items = await db.issueHistory.findMany({
    where: { issueId, organizationId },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });

  return {
    items,
    nextCursor: items.length === input.limit ? items[items.length - 1]?.id : undefined,
  };
}

// ── Watchers ───────────────────────────────────────────────────────────────

export async function toggleWatch(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  issueId: string,
) {
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  const existing = await db.issueWatcher.findUnique({
    where: { issueId_userId: { issueId, userId } },
  });

  if (existing) {
    await db.issueWatcher.delete({ where: { id: existing.id } });
    return { watching: false };
  }

  await db.issueWatcher.create({ data: { issueId, userId } });
  return { watching: true };
}

export async function addWatcher(
  db: PrismaClient,
  organizationId: string,
  issueId: string,
  userId: string,
) {
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  return db.issueWatcher.upsert({
    where: { issueId_userId: { issueId, userId } },
    create: { issueId, userId },
    update: {},
  });
}

export async function removeWatcher(
  db: PrismaClient,
  organizationId: string,
  issueId: string,
  userId: string,
) {
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  const existing = await db.issueWatcher.findUnique({
    where: { issueId_userId: { issueId, userId } },
  });
  if (!existing) {
    throw new NotFoundError("IssueWatcher", `${issueId}:${userId}`);
  }

  await db.issueWatcher.delete({ where: { id: existing.id } });
}

export async function listWatchers(
  db: PrismaClient,
  organizationId: string,
  issueId: string,
) {
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  return db.issueWatcher.findMany({
    where: { issueId },
    include: { user: { select: { id: true, name: true, image: true } } },
  });
}

// ── Voting ─────────────────────────────────────────────────────────────────

export async function toggleVote(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  issueId: string,
) {
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  const existing = await db.vote.findUnique({
    where: { issueId_userId: { issueId, userId } },
  });

  if (existing) {
    await db.vote.delete({ where: { id: existing.id } });
  } else {
    await db.vote.create({ data: { issueId, userId } });
  }

  const count = await db.vote.count({ where: { issueId } });
  return { voted: !existing, count };
}

export async function getVoteStatus(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  issueId: string,
) {
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  const [existing, count] = await Promise.all([
    db.vote.findUnique({ where: { issueId_userId: { issueId, userId } } }),
    db.vote.count({ where: { issueId } }),
  ]);

  return { voted: !!existing, count };
}

// ── Comments ───────────────────────────────────────────────────────────────

export async function listComments(
  db: PrismaClient,
  organizationId: string,
  input: ListCommentsInput,
) {
  const items = await db.comment.findMany({
    where: { issueId: input.issueId, organizationId },
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });

  return {
    items,
    nextCursor: items.length === input.limit ? items[items.length - 1]?.id : undefined,
  };
}

export async function addComment(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: CreateCommentInput,
) {
  const issue = await db.issue.findFirst({
    where: { id: input.issueId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!issue) {
    throw new NotFoundError("Issue", input.issueId);
  }

  return db.comment.create({
    data: {
      organizationId,
      issueId: input.issueId,
      authorId: userId,
      body: input.body,
      isInternal: input.isInternal ?? false,
    },
    include: { author: { select: { id: true, name: true, image: true } } },
  });
}

export async function editComment(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: UpdateCommentInput,
) {
  const comment = await db.comment.findFirst({
    where: { id: input.id, organizationId },
  });
  if (!comment) {
    throw new NotFoundError("Comment", input.id);
  }
  if (comment.authorId !== userId) {
    throw new PermissionError("You can only edit your own comments");
  }

  return db.comment.update({
    where: { id: input.id },
    data: { body: input.body },
    include: { author: { select: { id: true, name: true, image: true } } },
  });
}

export async function deleteComment(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  id: string,
) {
  const comment = await db.comment.findFirst({
    where: { id, organizationId },
  });
  if (!comment) {
    throw new NotFoundError("Comment", id);
  }
  if (comment.authorId !== userId) {
    throw new PermissionError("You can only delete your own comments");
  }

  await db.comment.delete({ where: { id } });
}

// ── Subtasks (Children) ────────────────────────────────────────────────────

export async function getChildren(
  db: PrismaClient,
  organizationId: string,
  issueId: string,
) {
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  return db.issue.findMany({
    where: { parentId: issueId, organizationId, deletedAt: null },
    include: {
      issueType: true,
      status: true,
      priority: true,
      assignee: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

// ── Issue Linking ──────────────────────────────────────────────────────────

const VALID_LINK_TYPES = [
  "blocks",
  "is-blocked-by",
  "duplicates",
  "is-duplicated-by",
  "relates-to",
  "clones",
  "is-cloned-by",
] as const;

export async function createLink(
  db: PrismaClient,
  organizationId: string,
  input: CreateLinkInput,
) {
  if (input.fromIssueId === input.toIssueId) {
    throw new ValidationError("Cannot link an issue to itself");
  }

  if (!VALID_LINK_TYPES.includes(input.linkType as (typeof VALID_LINK_TYPES)[number])) {
    throw new ValidationError(`Invalid link type: ${input.linkType}`);
  }

  // Verify both issues exist in the org
  const [from, to] = await Promise.all([
    db.issue.findFirst({ where: { id: input.fromIssueId, organizationId, deletedAt: null }, select: { id: true } }),
    db.issue.findFirst({ where: { id: input.toIssueId, organizationId, deletedAt: null }, select: { id: true } }),
  ]);
  if (!from) throw new NotFoundError("Issue", input.fromIssueId);
  if (!to) throw new NotFoundError("Issue", input.toIssueId);

  return db.issueLink.create({
    data: {
      linkType: input.linkType,
      fromIssueId: input.fromIssueId,
      toIssueId: input.toIssueId,
    },
    include: {
      fromIssue: { select: { id: true, key: true, summary: true } },
      toIssue: { select: { id: true, key: true, summary: true } },
    },
  });
}

export async function deleteLink(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const link = await db.issueLink.findFirst({
    where: { id },
    include: { fromIssue: { select: { organizationId: true } } },
  });
  if (!link || link.fromIssue.organizationId !== organizationId) {
    throw new NotFoundError("IssueLink", id);
  }

  await db.issueLink.delete({ where: { id } });
}

export async function getLinks(
  db: PrismaClient,
  organizationId: string,
  issueId: string,
) {
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  const issueSelect = { id: true, key: true, summary: true, status: { select: { name: true, category: true } } };

  const [outbound, inbound] = await Promise.all([
    db.issueLink.findMany({
      where: { fromIssueId: issueId },
      include: { toIssue: { select: issueSelect } },
    }),
    db.issueLink.findMany({
      where: { toIssueId: issueId },
      include: { fromIssue: { select: issueSelect } },
    }),
  ]);

  return { outbound, inbound };
}

// ── Attachments ────────────────────────────────────────────────────────────

export async function listAttachments(
  db: PrismaClient,
  organizationId: string,
  issueId: string,
) {
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  return db.attachment.findMany({
    where: { issueId, organizationId },
    include: { uploader: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteAttachment(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  id: string,
) {
  const attachment = await db.attachment.findFirst({
    where: { id, organizationId },
  });
  if (!attachment) {
    throw new NotFoundError("Attachment", id);
  }
  if (attachment.uploaderId !== userId) {
    throw new PermissionError("You can only delete your own attachments");
  }

  await db.attachment.delete({ where: { id } });
  return attachment;
}
