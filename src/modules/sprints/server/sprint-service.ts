import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError, ConflictError } from "@/server/lib/errors";
import type {
  CreateSprintInput,
  UpdateSprintInput,
  ListSprintsInput,
  StartSprintInput,
  CompleteSprintInput,
  AddIssuesToSprintInput,
  RemoveIssuesFromSprintInput,
  GetVelocityInput,
} from "../types/schemas";

const SPRINT_ISSUE_INCLUDE = {
  issueType: true,
  status: true,
  priority: true,
  assignee: true,
} as const;

/**
 * Creates a new sprint for a project.
 * Auto-generates the sprint name ("Sprint N") if not provided.
 * @param db - Prisma client instance
 * @param organizationId - Current organization ID
 * @param userId - ID of the user creating the sprint
 * @param input - Sprint creation input
 * @returns The created sprint
 * @throws NotFoundError if the project does not exist in the organization
 */
export async function createSprint(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: CreateSprintInput,
) {
  const project = await db.project.findFirst({
    where: { id: input.projectId, organizationId },
  });
  if (!project) {
    throw new NotFoundError("Project", input.projectId);
  }

  let name = input.name;
  if (!name) {
    const count = await db.sprint.count({
      where: { projectId: input.projectId },
    });
    name = `Sprint ${count + 1}`;
  }

  const sprint = await db.sprint.create({
    data: {
      organizationId,
      projectId: input.projectId,
      name,
      goal: input.goal,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "planning",
    },
  });

  await db.auditLog.create({
    data: {
      organizationId,
      userId,
      entityType: "Sprint",
      entityId: sprint.id,
      action: "CREATED",
      diff: { name: sprint.name, projectId: input.projectId },
    },
  });

  return sprint;
}

/**
 * Updates a sprint's details.
 * Only allows updates when the sprint is in "planning" status.
 * @param db - Prisma client instance
 * @param organizationId - Current organization ID
 * @param input - Sprint update input
 * @returns The updated sprint
 * @throws NotFoundError if the sprint does not exist in the organization
 * @throws ValidationError if the sprint is not in "planning" status
 */
export async function updateSprint(
  db: PrismaClient,
  organizationId: string,
  input: UpdateSprintInput,
) {
  const sprint = await db.sprint.findFirst({
    where: {
      id: input.id,
      project: { organizationId },
    },
  });
  if (!sprint) {
    throw new NotFoundError("Sprint", input.id);
  }

  if (sprint.status !== "planning") {
    throw new ValidationError(
      "Sprint can only be updated while in planning status",
    );
  }

  const { id, ...updates } = input;
  return db.sprint.update({
    where: { id },
    data: updates,
  });
}

/**
 * Lists sprints for a project with optional status filter.
 * Includes a count of issues per sprint.
 * @param db - Prisma client instance
 * @param organizationId - Current organization ID
 * @param input - List sprints input with optional status filter
 * @returns Array of sprints with issue counts
 */
export async function listSprints(
  db: PrismaClient,
  organizationId: string,
  input: ListSprintsInput,
) {
  const where: {
    projectId: string;
    project: { organizationId: string };
    status?: string;
  } = {
    projectId: input.projectId,
    project: { organizationId },
  };

  if (input.status) {
    where.status = input.status;
  }

  return db.sprint.findMany({
    where,
    include: {
      _count: { select: { issues: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

/**
 * Gets a single sprint with its issues.
 * @param db - Prisma client instance
 * @param organizationId - Current organization ID
 * @param sprintId - ID of the sprint to retrieve
 * @returns The sprint with its issues
 * @throws NotFoundError if the sprint does not exist in the organization
 */
export async function getSprint(
  db: PrismaClient,
  organizationId: string,
  sprintId: string,
) {
  const sprint = await db.sprint.findFirst({
    where: {
      id: sprintId,
      project: { organizationId },
    },
    include: {
      issues: {
        include: SPRINT_ISSUE_INCLUDE,
        where: { deletedAt: null },
      },
    },
  });

  if (!sprint) {
    throw new NotFoundError("Sprint", sprintId);
  }

  return sprint;
}

/**
 * Starts a sprint, setting its status to "active".
 * Ensures no other sprint is already active for the same project.
 * @param db - Prisma client instance
 * @param organizationId - Current organization ID
 * @param userId - ID of the user starting the sprint
 * @param input - Start sprint input with endDate
 * @returns The started sprint
 * @throws NotFoundError if the sprint does not exist
 * @throws ValidationError if the sprint is not in "planning" status
 * @throws ConflictError if another sprint is already active for the project
 */
export async function startSprint(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: StartSprintInput,
) {
  const sprint = await db.sprint.findFirst({
    where: {
      id: input.id,
      project: { organizationId },
    },
  });
  if (!sprint) {
    throw new NotFoundError("Sprint", input.id);
  }

  if (sprint.status !== "planning") {
    throw new ValidationError("Only sprints in planning status can be started");
  }

  const activeSprint = await db.sprint.findFirst({
    where: {
      projectId: sprint.projectId,
      status: "active",
    },
  });
  if (activeSprint) {
    throw new ConflictError(
      `Project already has an active sprint: ${activeSprint.name}`,
    );
  }

  const startDate = input.startDate ?? new Date();
  const updated = await db.sprint.update({
    where: { id: input.id },
    data: {
      status: "active",
      startDate,
      endDate: input.endDate,
    },
  });

  await db.auditLog.create({
    data: {
      organizationId,
      userId,
      entityType: "Sprint",
      entityId: sprint.id,
      action: "UPDATED",
      diff: { action: "started", name: sprint.name },
    },
  });

  return updated;
}

/**
 * Completes an active sprint.
 * Moves incomplete issues to the target sprint or back to backlog.
 * @param db - Prisma client instance
 * @param organizationId - Current organization ID
 * @param userId - ID of the user completing the sprint
 * @param input - Complete sprint input with optional moveToSprintId
 * @returns Object with completedCount and movedCount
 * @throws NotFoundError if the sprint does not exist
 * @throws ValidationError if the sprint is not in "active" status
 */
export async function completeSprint(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: CompleteSprintInput,
) {
  const sprint = await db.sprint.findFirst({
    where: {
      id: input.id,
      project: { organizationId },
    },
    include: {
      issues: {
        include: { status: true },
        where: { deletedAt: null },
      },
    },
  });
  if (!sprint) {
    throw new NotFoundError("Sprint", input.id);
  }

  if (sprint.status !== "active") {
    throw new ValidationError(
      "Only active sprints can be completed",
    );
  }

  const incompleteIssues = sprint.issues.filter(
    (issue) => issue.status.category !== "DONE",
  );
  const completedCount = sprint.issues.length - incompleteIssues.length;
  const movedCount = incompleteIssues.length;

  if (incompleteIssues.length > 0) {
    const incompleteIds = incompleteIssues.map((i) => i.id);
    await db.issue.updateMany({
      where: { id: { in: incompleteIds } },
      data: { sprintId: input.moveToSprintId ?? null },
    });
  }

  await db.sprint.update({
    where: { id: input.id },
    data: {
      status: "completed",
    },
  });

  await db.auditLog.create({
    data: {
      organizationId,
      userId,
      entityType: "Sprint",
      entityId: sprint.id,
      action: "UPDATED",
      diff: {
        action: "completed",
        name: sprint.name,
        completedCount,
        movedCount,
      },
    },
  });

  return { completedCount, movedCount };
}

/**
 * Adds issues to a sprint.
 * Sprint must be in "planning" or "active" status.
 * @param db - Prisma client instance
 * @param organizationId - Current organization ID
 * @param input - Input with sprintId and issueIds
 * @returns The count of updated issues
 * @throws NotFoundError if the sprint does not exist
 * @throws ValidationError if the sprint is not in a valid status
 */
export async function addIssuesToSprint(
  db: PrismaClient,
  organizationId: string,
  input: AddIssuesToSprintInput,
) {
  const sprint = await db.sprint.findFirst({
    where: {
      id: input.sprintId,
      project: { organizationId },
    },
  });
  if (!sprint) {
    throw new NotFoundError("Sprint", input.sprintId);
  }

  if (sprint.status !== "planning" && sprint.status !== "active") {
    throw new ValidationError(
      "Issues can only be added to sprints in planning or active status",
    );
  }

  const result = await db.issue.updateMany({
    where: { id: { in: input.issueIds }, organizationId },
    data: { sprintId: input.sprintId },
  });

  return { count: result.count };
}

/**
 * Removes issues from a sprint by setting their sprintId to null.
 * @param db - Prisma client instance
 * @param organizationId - Current organization ID
 * @param input - Input with sprintId and issueIds
 * @returns The count of updated issues
 */
export async function removeIssuesFromSprint(
  db: PrismaClient,
  organizationId: string,
  input: RemoveIssuesFromSprintInput,
) {
  const result = await db.issue.updateMany({
    where: {
      id: { in: input.issueIds },
      sprintId: input.sprintId,
      organizationId,
    },
    data: { sprintId: null },
  });

  return { count: result.count };
}

/**
 * Gets velocity data for the last N completed sprints.
 * @param db - Prisma client instance
 * @param organizationId - Current organization ID
 * @param input - Input with projectId and optional sprintCount
 * @returns Array of velocity data per sprint
 */
export async function getVelocity(
  db: PrismaClient,
  organizationId: string,
  input: GetVelocityInput,
) {
  const sprints = await db.sprint.findMany({
    where: {
      projectId: input.projectId,
      project: { organizationId },
      status: "completed",
    },
    orderBy: { updatedAt: "desc" },
    take: input.sprintCount,
    include: {
      issues: {
        include: { status: true },
        where: { deletedAt: null },
      },
    },
  });

  return sprints.map((sprint) => {
    const doneIssues = sprint.issues.filter(
      (issue) => issue.status.category === "DONE",
    );
    const completedPoints = doneIssues.reduce(
      (sum, issue) => sum + (issue.storyPoints ?? 0),
      0,
    );

    return {
      sprintName: sprint.name,
      completedPoints,
      completedCount: doneIssues.length,
    };
  });
}
