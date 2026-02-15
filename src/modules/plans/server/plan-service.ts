/**
 * Plan service — business logic for cross-project roadmap plans.
 * @module plan-service
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";

/**
 * Creates a new plan.
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param userId - Owner of the plan
 * @param input - Plan creation data
 * @returns The newly created plan
 */
export async function createPlan(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: { name: string; description?: string; isShared?: boolean },
) {
  return db.plan.create({
    data: {
      organizationId,
      name: input.name,
      description: input.description,
      ownerId: userId,
      isShared: input.isShared ?? false,
    },
  });
}

/**
 * Retrieves a single plan by id with its scopes and scenarios.
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param id - Plan id
 * @returns The plan with included scopes and scenarios
 * @throws NotFoundError if plan does not exist
 */
export async function getPlan(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const plan = await db.plan.findFirst({
    where: { id, organizationId },
    include: { scopes: true, scenarios: true },
  });
  if (!plan) throw new NotFoundError("Plan", id);
  return plan;
}

/**
 * Lists all active plans for an organization.
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @returns Array of active plans ordered by most recently updated
 */
export async function listPlans(
  db: PrismaClient,
  organizationId: string,
) {
  return db.plan.findMany({
    where: { organizationId, status: "active" },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Updates an existing plan.
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param id - Plan id
 * @param updates - Fields to update
 * @returns The updated plan
 * @throws NotFoundError if plan does not exist
 */
export async function updatePlan(
  db: PrismaClient,
  organizationId: string,
  id: string,
  updates: {
    name?: string;
    description?: string;
    isShared?: boolean;
    status?: string;
  },
) {
  const existing = await db.plan.findFirst({ where: { id, organizationId } });
  if (!existing) throw new NotFoundError("Plan", id);
  return db.plan.update({ where: { id }, data: updates });
}

/**
 * Deletes a plan.
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param id - Plan id
 * @throws NotFoundError if plan does not exist
 */
export async function deletePlan(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const existing = await db.plan.findFirst({ where: { id, organizationId } });
  if (!existing) throw new NotFoundError("Plan", id);
  await db.plan.delete({ where: { id } });
}

/**
 * Adds a project/issue scope to a plan.
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param input - Scope creation data
 * @returns The newly created scope
 * @throws NotFoundError if the parent plan does not exist
 */
export async function addScope(
  db: PrismaClient,
  organizationId: string,
  input: {
    planId: string;
    projectId: string;
    issueId?: string;
    position?: number;
  },
) {
  const plan = await db.plan.findFirst({
    where: { id: input.planId, organizationId },
  });
  if (!plan) throw new NotFoundError("Plan", input.planId);
  return db.planIssueScope.create({
    data: {
      planId: input.planId,
      projectId: input.projectId,
      issueId: input.issueId ?? null,
      position: input.position ?? 0,
    },
  });
}

/**
 * Removes a scope entry from a plan.
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param id - PlanIssueScope id
 * @throws NotFoundError if scope does not exist or belongs to another org
 */
export async function removeScope(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const scope = await db.planIssueScope.findFirst({
    where: { id },
    include: { plan: { select: { organizationId: true } } },
  });
  if (!scope || scope.plan.organizationId !== organizationId) {
    throw new NotFoundError("PlanIssueScope", id);
  }
  await db.planIssueScope.delete({ where: { id } });
}

/**
 * Builds timeline data for a plan: the plan itself, its issues, and project ids.
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param planId - Plan id
 * @returns Object containing plan, issues, and projectIds
 * @throws NotFoundError if plan does not exist
 */
export async function getTimeline(
  db: PrismaClient,
  organizationId: string,
  planId: string,
) {
  const plan = await db.plan.findFirst({
    where: { id: planId, organizationId },
    include: {
      scopes: true,
      scenarios: { where: { isBaseline: true }, take: 1 },
    },
  });
  if (!plan) throw new NotFoundError("Plan", planId);

  const projectIds = [...new Set(plan.scopes.map((s) => s.projectId))];
  const issues = await db.issue.findMany({
    where: {
      projectId: { in: projectIds },
      organizationId,
      deletedAt: null,
    },
    include: {
      issueType: true,
      status: true,
      priority: true,
      assignee: { select: { id: true, name: true, image: true } },
      ganttDepsSource: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return { plan, issues, projectIds };
}

/**
 * Creates a new scenario for a plan.
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param input - Scenario creation data
 * @returns The newly created scenario
 * @throws NotFoundError if parent plan does not exist
 */
export async function createScenario(
  db: PrismaClient,
  organizationId: string,
  input: {
    planId: string;
    name: string;
    isDraft?: boolean;
    isBaseline?: boolean;
  },
) {
  const plan = await db.plan.findFirst({
    where: { id: input.planId, organizationId },
  });
  if (!plan) throw new NotFoundError("Plan", input.planId);
  return db.planScenario.create({
    data: {
      planId: input.planId,
      name: input.name,
      isDraft: input.isDraft ?? true,
      isBaseline: input.isBaseline ?? false,
    },
  });
}

/**
 * Updates an existing scenario.
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param id - Scenario id
 * @param updates - Fields to update
 * @returns The updated scenario
 * @throws NotFoundError if scenario does not exist or belongs to another org
 */
export async function updateScenario(
  db: PrismaClient,
  organizationId: string,
  id: string,
  updates: {
    name?: string;
    isDraft?: boolean;
    isBaseline?: boolean;
    overrides?: Prisma.InputJsonValue;
  },
) {
  const scenario = await db.planScenario.findFirst({
    where: { id },
    include: { plan: { select: { organizationId: true } } },
  });
  if (!scenario || scenario.plan.organizationId !== organizationId) {
    throw new NotFoundError("PlanScenario", id);
  }
  return db.planScenario.update({ where: { id }, data: updates });
}

/**
 * Deletes a scenario.
 * @param db - Prisma client
 * @param organizationId - Tenant scope
 * @param id - Scenario id
 * @throws NotFoundError if scenario does not exist or belongs to another org
 */
export async function deleteScenario(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const scenario = await db.planScenario.findFirst({
    where: { id },
    include: { plan: { select: { organizationId: true } } },
  });
  if (!scenario || scenario.plan.organizationId !== organizationId) {
    throw new NotFoundError("PlanScenario", id);
  }
  await db.planScenario.delete({ where: { id } });
}
