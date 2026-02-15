/**
 * Project service — business logic for project CRUD and membership.
 *
 * @description All functions take the Prisma client and organizationId
 * as first parameters for multi-tenant row-level isolation.
 *
 * @module projects/server/project-service
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError, ConflictError } from "@/server/lib/errors";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ListProjectsInput,
  AddProjectMemberInput,
  RemoveProjectMemberInput,
} from "../types/schemas";

const PROJECT_INCLUDE = {
  members: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  _count: { select: { issues: true, members: true } },
} as const;

/**
 * Creates a new project within an organization.
 *
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param userId - User performing the action
 * @param input - Validated project creation input
 * @returns The newly created project
 * @throws ConflictError if key already exists within org
 */
export async function createProject(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: CreateProjectInput,
) {
  // Verify key uniqueness within org
  const existing = await db.project.findFirst({
    where: { organizationId, key: input.key },
  });
  if (existing) {
    throw new ConflictError(
      `Project with key '${input.key}' already exists in this organization`,
    );
  }

  return db.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        organizationId,
        name: input.name,
        key: input.key,
        description: input.description,
        projectType: input.projectTypeKey,
        templateKey: input.templateKey ?? "kanban",
        lead: input.leadId,
      },
      include: PROJECT_INCLUDE,
    });

    // If a template key is provided, link default workflow and create default board
    if (input.templateKey) {
      const defaultWorkflow = await tx.workflow.findFirst({
        where: { organizationId, isDefault: true },
      });
      if (defaultWorkflow) {
        await tx.project.update({
          where: { id: project.id },
          data: {
            workflows: { connect: { id: defaultWorkflow.id } },
            defaultWorkflowId: defaultWorkflow.id,
          },
        });
      }

      await tx.board.create({
        data: {
          organizationId,
          projectId: project.id,
          name: `${input.name} Board`,
          boardType: input.templateKey === "scrum" ? "scrum" : "kanban",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        entityType: "Project",
        entityId: project.id,
        action: "CREATED",
        diff: { name: input.name, key: input.key },
      },
    });

    return project;
  });
}

/**
 * Updates an existing project.
 *
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param userId - User performing the action
 * @param input - Validated project update input
 * @returns The updated project
 * @throws NotFoundError if project not found in org
 */
export async function updateProject(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: UpdateProjectInput,
) {
  const existing = await db.project.findFirst({
    where: { id: input.id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("Project", input.id);
  }

  const { id, ...updates } = input;

  // Build Prisma-compatible update data
  const data: Prisma.ProjectUpdateInput = {};
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.description !== undefined) data.description = updates.description;
  if (updates.leadId !== undefined) data.lead = updates.leadId;
  if (updates.isArchived !== undefined) data.isArchived = updates.isArchived;

  return db.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id },
      data,
      include: PROJECT_INCLUDE,
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        entityType: "Project",
        entityId: id,
        action: "UPDATED",
        diff: updates as unknown as Prisma.InputJsonValue,
      },
    });

    return project;
  });
}

/**
 * Lists projects for an organization with cursor pagination.
 *
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param input - Validated list input with pagination, search, and filters
 * @returns Object with items array and total count
 */
export async function listProjects(
  db: PrismaClient,
  organizationId: string,
  input: ListProjectsInput,
) {
  const where: Prisma.ProjectWhereInput = {
    organizationId,
    isArchived: input.isArchived,
  };

  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: "insensitive" } },
      { key: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    db.project.findMany({
      where,
      include: {
        _count: { select: { issues: true, members: true } },
      },
      orderBy: { name: "asc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.project.count({ where }),
  ]);

  return { items, total };
}

/**
 * Gets a single project by id or key.
 *
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param input - Either { id } or { key }
 * @returns The project with lead and counts
 * @throws NotFoundError if not found
 */
export async function getProject(
  db: PrismaClient,
  organizationId: string,
  input: { id?: string; key?: string },
) {
  const where: Prisma.ProjectWhereInput = { organizationId };
  if ("id" in input && input.id) {
    where.id = input.id;
  } else if ("key" in input && input.key) {
    where.key = input.key;
  }

  const project = await db.project.findFirst({
    where,
    include: PROJECT_INCLUDE,
  });

  if (!project) {
    const identifier = input.id ?? input.key ?? "unknown";
    throw new NotFoundError("Project", identifier);
  }

  return project;
}

/**
 * Archives a project.
 *
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param userId - User performing the action
 * @param id - Project id to archive
 * @throws NotFoundError if project not found in org
 */
export async function archiveProject(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  id: string,
) {
  const existing = await db.project.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("Project", id);
  }

  return db.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id },
      data: { isArchived: true },
      include: PROJECT_INCLUDE,
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        entityType: "Project",
        entityId: id,
        action: "UPDATED",
        diff: { isArchived: true, key: existing.key },
      },
    });

    return project;
  });
}

/**
 * Adds a member to a project.
 *
 * @param db - Prisma client
 * @param organizationId - Tenant scope (used to verify user exists)
 * @param input - Validated add member input
 * @returns The created ProjectMember record
 * @throws NotFoundError if project or user not found
 * @throws ConflictError if user is already a member
 */
export async function addMember(
  db: PrismaClient,
  organizationId: string,
  input: AddProjectMemberInput,
) {
  // Verify project exists in org
  const project = await db.project.findFirst({
    where: { id: input.projectId, organizationId },
  });
  if (!project) {
    throw new NotFoundError("Project", input.projectId);
  }

  // Verify user exists
  const user = await db.user.findUnique({
    where: { id: input.userId },
  });
  if (!user) {
    throw new NotFoundError("User", input.userId);
  }

  // Check for existing membership
  const existingMember = await db.projectMember.findFirst({
    where: { projectId: input.projectId, userId: input.userId },
  });
  if (existingMember) {
    throw new ConflictError(
      `User '${input.userId}' is already a member of project '${input.projectId}'`,
    );
  }

  return db.projectMember.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      role: input.roleId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

/**
 * Removes a member from a project.
 *
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param input - Validated remove member input
 * @throws NotFoundError if project not found or user is not a member
 */
export async function removeMember(
  db: PrismaClient,
  organizationId: string,
  input: RemoveProjectMemberInput,
) {
  // Verify project exists in org
  const project = await db.project.findFirst({
    where: { id: input.projectId, organizationId },
  });
  if (!project) {
    throw new NotFoundError("Project", input.projectId);
  }

  const member = await db.projectMember.findFirst({
    where: { projectId: input.projectId, userId: input.userId },
  });
  if (!member) {
    throw new NotFoundError("ProjectMember", input.userId);
  }

  await db.projectMember.delete({
    where: { id: member.id },
  });
}
