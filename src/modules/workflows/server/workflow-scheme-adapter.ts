/**
 * SchemeAdapter implementation for Workflow.
 *
 * @description Workflows use many-to-many with Project (via _ProjectWorkflows),
 * so fork = clone workflow + disconnect old from project + connect clone.
 *
 * @module workflows/server/workflow-scheme-adapter
 */

import type { PrismaClient } from "@prisma/client";
import type { SchemeAdapter } from "@/shared/lib/scheme-sharing-service";

type WorkflowWithEntries = Awaited<ReturnType<typeof findSchemeWithEntries>>;

async function findSchemeWithEntries(
  db: PrismaClient,
  schemeId: string,
  organizationId: string,
) {
  return db.workflow.findFirst({
    where: { id: schemeId, organizationId },
    include: {
      workflowStatuses: true,
      transitions: true,
    },
  });
}

export const workflowSchemeAdapter: SchemeAdapter<
  NonNullable<WorkflowWithEntries>
> = {
  schemeType: "Workflow",

  findSchemeWithEntries,

  async getProjectCount(db, schemeId, organizationId) {
    return db.project.count({
      where: {
        organizationId,
        workflows: { some: { id: schemeId } },
      },
    });
  },

  async cloneScheme(db, scheme, newName, organizationId) {
    return db.workflow.create({
      data: {
        organizationId,
        name: newName,
        description: scheme.description,
        isDefault: false,
        isActive: scheme.isActive,
        parentId: scheme.id,
        workflowStatuses: {
          create: scheme.workflowStatuses.map((ws) => ({
            statusId: ws.statusId,
            position: ws.position,
          })),
        },
        transitions: {
          create: scheme.transitions.map((t) => ({
            name: t.name,
            fromStatusId: t.fromStatusId,
            toStatusId: t.toStatusId,
            validators: t.validators ?? [],
            conditions: t.conditions ?? [],
            postFunctions: t.postFunctions ?? [],
          })),
        },
      },
      include: {
        workflowStatuses: true,
        transitions: true,
      },
    });
  },

  async assignToProject(db, schemeId, projectId) {
    // Disconnect all existing workflows and connect the new one
    const existing = await db.project.findUniqueOrThrow({
      where: { id: projectId },
      include: { workflows: { select: { id: true } } },
    });

    await db.project.update({
      where: { id: projectId },
      data: {
        workflows: {
          disconnect: existing.workflows.map((w) => ({ id: w.id })),
          connect: { id: schemeId },
        },
        defaultWorkflowId: schemeId,
      },
    });
  },
};
