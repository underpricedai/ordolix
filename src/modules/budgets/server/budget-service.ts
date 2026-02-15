/**
 * Budget service — CRUD for budgets, cost rates, and budget summaries.
 * @module budget-service
 */

import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";

// ── Budget CRUD ────────────────────────────────────────────────────────────

/**
 * Creates a new budget for a project.
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization id
 * @param input - Budget creation fields
 * @returns The newly created budget
 */
export async function createBudget(
  db: PrismaClient,
  organizationId: string,
  input: {
    projectId: string;
    name: string;
    amount: number;
    currency?: string;
    costType?: string;
    periodStart: Date;
    periodEnd: Date;
    alertThreshold?: number;
  },
) {
  return db.budget.create({
    data: {
      organizationId,
      projectId: input.projectId,
      name: input.name,
      amount: input.amount,
      currency: input.currency ?? "USD",
      costType: input.costType ?? "opex",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      alertThreshold: input.alertThreshold ?? 80,
    },
  });
}

/**
 * Retrieves a single budget by id, including its entries.
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization id
 * @param id - Budget id
 * @returns The budget with entries
 * @throws NotFoundError if the budget does not exist
 */
export async function getBudget(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const budget = await db.budget.findFirst({
    where: { id, organizationId },
    include: { entries: true },
  });
  if (!budget) throw new NotFoundError("Budget", id);
  return budget;
}

/**
 * Lists budgets for an organization, optionally filtered by project.
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization id
 * @param projectId - Optional project id filter
 * @returns Array of budgets
 */
export async function listBudgets(
  db: PrismaClient,
  organizationId: string,
  projectId?: string,
) {
  const where: { organizationId: string; projectId?: string } = {
    organizationId,
  };
  if (projectId) where.projectId = projectId;
  return db.budget.findMany({ where, orderBy: { createdAt: "desc" } });
}

/**
 * Updates an existing budget.
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization id
 * @param id - Budget id
 * @param updates - Fields to update
 * @returns The updated budget
 * @throws NotFoundError if the budget does not exist
 */
export async function updateBudget(
  db: PrismaClient,
  organizationId: string,
  id: string,
  updates: {
    name?: string;
    amount?: number;
    currency?: string;
    costType?: string;
    periodStart?: Date;
    periodEnd?: Date;
    alertThreshold?: number;
  },
) {
  const existing = await db.budget.findFirst({
    where: { id, organizationId },
  });
  if (!existing) throw new NotFoundError("Budget", id);
  return db.budget.update({ where: { id }, data: updates });
}

/**
 * Deletes a budget by id.
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization id
 * @param id - Budget id
 * @throws NotFoundError if the budget does not exist
 */
export async function deleteBudget(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const existing = await db.budget.findFirst({
    where: { id, organizationId },
  });
  if (!existing) throw new NotFoundError("Budget", id);
  await db.budget.delete({ where: { id } });
}

// ── Cost Rates ─────────────────────────────────────────────────────────────

/**
 * Creates a new cost rate for a user or project role.
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization id
 * @param input - Cost rate creation fields
 * @returns The newly created cost rate
 */
export async function setCostRate(
  db: PrismaClient,
  organizationId: string,
  input: {
    userId?: string;
    projectRoleId?: string;
    ratePerHour: number;
    currency?: string;
    effectiveFrom: Date;
    effectiveTo?: Date;
  },
) {
  return db.costRate.create({
    data: {
      organizationId,
      userId: input.userId,
      projectRoleId: input.projectRoleId,
      ratePerHour: input.ratePerHour,
      currency: input.currency ?? "USD",
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
    },
  });
}

/**
 * Lists all cost rates for an organization.
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization id
 * @returns Array of cost rates ordered by effectiveFrom descending
 */
export async function listCostRates(
  db: PrismaClient,
  organizationId: string,
) {
  return db.costRate.findMany({
    where: { organizationId },
    orderBy: { effectiveFrom: "desc" },
  });
}

/**
 * Deletes a cost rate by id.
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization id
 * @param id - Cost rate id
 * @throws NotFoundError if the cost rate does not exist
 */
export async function deleteCostRate(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const existing = await db.costRate.findFirst({
    where: { id, organizationId },
  });
  if (!existing) throw new NotFoundError("CostRate", id);
  await db.costRate.delete({ where: { id } });
}

// ── Budget Summary ─────────────────────────────────────────────────────────

/**
 * Computes a summary for a single budget including actual cost, remaining, and threshold status.
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization id
 * @param budgetId - Budget id
 * @returns Budget summary with cost metrics
 * @throws NotFoundError if the budget does not exist
 */
export async function getBudgetSummary(
  db: PrismaClient,
  organizationId: string,
  budgetId: string,
) {
  const budget = await db.budget.findFirst({
    where: { id: budgetId, organizationId },
    include: { entries: true },
  });
  if (!budget) throw new NotFoundError("Budget", budgetId);

  const actualCost = budget.entries.reduce((sum, e) => sum + e.cost, 0);
  const remaining = budget.amount - actualCost;
  const percentUsed =
    budget.amount > 0 ? Math.round((actualCost / budget.amount) * 100) : 0;
  const isOverBudget = actualCost > budget.amount;
  const isNearThreshold = percentUsed >= budget.alertThreshold;

  return {
    budget,
    actualCost,
    remaining,
    percentUsed,
    isOverBudget,
    isNearThreshold,
  };
}

/**
 * Computes an aggregate cost summary for an entire project across all its budgets.
 * @param db - Prisma client instance
 * @param organizationId - Tenant organization id
 * @param projectId - Project id
 * @returns Project-level cost summary with capex/opex breakdown
 */
export async function getProjectCostSummary(
  db: PrismaClient,
  organizationId: string,
  projectId: string,
) {
  const budgets = await db.budget.findMany({
    where: { organizationId, projectId },
    include: { entries: true },
  });

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalActual = budgets.reduce(
    (sum, b) => sum + b.entries.reduce((s, e) => s + e.cost, 0),
    0,
  );
  const capexActual = budgets
    .filter((b) => b.costType === "capex")
    .reduce((sum, b) => sum + b.entries.reduce((s, e) => s + e.cost, 0), 0);
  const opexActual = budgets
    .filter((b) => b.costType === "opex")
    .reduce((sum, b) => sum + b.entries.reduce((s, e) => s + e.cost, 0), 0);

  return {
    totalBudgeted,
    totalActual,
    remaining: totalBudgeted - totalActual,
    capexActual,
    opexActual,
  };
}
