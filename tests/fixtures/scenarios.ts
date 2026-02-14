/**
 * Scenario functions that write to DB for integration tests and seeding.
 * Each scenario composes multiple factory calls and persists data.
 */

import type { PrismaClient } from "@prisma/client";
import {
  DEFAULT_ISSUE_TYPES,
  DEFAULT_STATUSES,
  DEFAULT_PRIORITIES,
  DEFAULT_RESOLUTIONS,
  DEFAULT_WORKFLOWS,
  DEFAULT_BOARD_CONFIG,
  DEMO_USERS,
} from "./defaults";

/**
 * Seeds all default types, statuses, priorities, resolutions, and workflows
 * for a given organization. Called during onboarding.
 */
export async function seedDefaults(prisma: PrismaClient, organizationId: string) {
  // Create all issue types
  const allIssueTypes = [
    ...DEFAULT_ISSUE_TYPES.software,
    ...DEFAULT_ISSUE_TYPES.serviceManagement,
  ];
  await prisma.issueType.createMany({
    data: allIssueTypes.map((t) => ({ ...t, organizationId })),
    skipDuplicates: true,
  });

  // Create all statuses (deduplicated by name)
  const allStatuses = [
    ...DEFAULT_STATUSES.simplified,
    ...DEFAULT_STATUSES.classic,
    ...DEFAULT_STATUSES.serviceManagement,
  ];
  const uniqueStatuses = Array.from(
    new Map(allStatuses.map((s) => [s.name, s])).values(),
  );
  await prisma.status.createMany({
    data: uniqueStatuses.map((s) => ({ ...s, organizationId })),
    skipDuplicates: true,
  });

  // Create priorities
  await prisma.priority.createMany({
    data: DEFAULT_PRIORITIES.map((p) => ({ ...p, organizationId })),
    skipDuplicates: true,
  });

  // Create resolutions
  await prisma.resolution.createMany({
    data: DEFAULT_RESOLUTIONS.map((r) => ({ ...r, organizationId })),
    skipDuplicates: true,
  });

  // Create workflows with statuses and transitions
  const statuses = await prisma.status.findMany({
    where: { organizationId },
  });
  const statusMap = new Map(statuses.map((s) => [s.name, s.id]));

  for (const [key, wfDef] of Object.entries(DEFAULT_WORKFLOWS)) {
    const workflow = await prisma.workflow.create({
      data: {
        organizationId,
        name: wfDef.name,
        description: wfDef.description,
        isDefault: key === "simplified",
      },
    });

    // Determine which statuses this workflow uses
    const wfStatusNames = new Set(
      wfDef.transitions.flatMap((t) => [t.from, t.to]),
    );

    // Link statuses to workflow
    let position = 0;
    for (const name of wfStatusNames) {
      const statusId = statusMap.get(name);
      if (statusId) {
        await prisma.workflowStatus.create({
          data: { workflowId: workflow.id, statusId, position: position++ },
        });
      }
    }

    // Create transitions
    for (const t of wfDef.transitions) {
      const fromId = statusMap.get(t.from);
      const toId = statusMap.get(t.to);
      if (fromId && toId) {
        await prisma.transition.create({
          data: {
            workflowId: workflow.id,
            name: t.name,
            fromStatusId: fromId,
            toStatusId: toId,
          },
        });
      }
    }
  }
}

/**
 * Creates a project with a Kanban board and default workflow.
 */
export async function createProjectWithBoard(
  prisma: PrismaClient,
  organizationId: string,
  overrides: { name?: string; key?: string } = {},
) {
  const workflow = await prisma.workflow.findFirst({
    where: { organizationId, isDefault: true },
  });

  const project = await prisma.project.create({
    data: {
      organizationId,
      name: overrides.name ?? "Demo Project",
      key: overrides.key ?? "DEMO",
      projectType: "software",
      templateKey: "kanban",
      defaultWorkflowId: workflow?.id,
    },
  });

  await prisma.board.create({
    data: {
      organizationId,
      projectId: project.id,
      name: `${project.name} Board`,
      boardType: "kanban",
      columns: DEFAULT_BOARD_CONFIG.columns,
      cardFields: DEFAULT_BOARD_CONFIG.cardFields,
      cardColor: DEFAULT_BOARD_CONFIG.cardColor,
      quickFilters: DEFAULT_BOARD_CONFIG.quickFilters,
    },
  });

  return project;
}

/**
 * Creates a sprint with N issues in varied statuses.
 */
export async function createSprintWithIssues(
  prisma: PrismaClient,
  organizationId: string,
  projectId: string,
  count = 10,
) {
  const sprint = await prisma.sprint.create({
    data: {
      organizationId,
      projectId,
      name: "Sprint 1",
      status: "active",
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  const statuses = await prisma.status.findMany({
    where: { organizationId, name: { in: ["To Do", "In Progress", "Done"] } },
  });
  const taskType = await prisma.issueType.findFirst({
    where: { organizationId, name: "Task" },
  });
  const mediumPriority = await prisma.priority.findFirst({
    where: { organizationId, name: "Medium" },
  });

  if (!taskType || !mediumPriority || statuses.length === 0) {
    throw new Error("Run seedDefaults first");
  }

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
  });

  for (let i = 1; i <= count; i++) {
    const status = statuses[i % statuses.length]!;
    await prisma.project.update({
      where: { id: projectId },
      data: { issueCounter: { increment: 1 } },
    });

    await prisma.issue.create({
      data: {
        organizationId,
        projectId,
        key: `${project.key}-${project.issueCounter + i}`,
        summary: `Sprint task ${i}`,
        issueTypeId: taskType.id,
        statusId: status.id,
        priorityId: mediumPriority.id,
        reporterId: "system",
        sprintId: sprint.id,
        storyPoints: Math.ceil(Math.random() * 8),
      },
    });
  }

  return sprint;
}

/**
 * Creates a service desk project with queues and SLAs.
 */
export async function createServiceDeskProject(
  prisma: PrismaClient,
  organizationId: string,
) {
  const project = await prisma.project.create({
    data: {
      organizationId,
      name: "IT Service Management",
      key: "ITSM",
      projectType: "service_management",
      templateKey: "itsm",
    },
  });

  await prisma.queue.create({
    data: {
      organizationId,
      projectId: project.id,
      name: "All Open Requests",
      sortBy: "priority",
    },
  });

  return project;
}

/**
 * Creates a full demo dataset for stakeholder demos.
 * Includes 3 projects, 50+ issues, epics, dependencies, time logs.
 */
export async function createDemoDataset(prisma: PrismaClient, organizationId: string) {
  // Create demo users
  const users = [];
  for (const u of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email },
    });
    users.push(user);

    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId, userId: user.id },
      },
      update: {},
      create: { organizationId, userId: user.id, role: u.role },
    });
  }

  // Seed defaults if not already done
  const existingTypes = await prisma.issueType.count({ where: { organizationId } });
  if (existingTypes === 0) {
    await seedDefaults(prisma, organizationId);
  }

  // Create projects
  const ordolixProject = await createProjectWithBoard(prisma, organizationId, {
    name: "Ordolix",
    key: "ORDOLIX",
  });

  const infraProject = await createProjectWithBoard(prisma, organizationId, {
    name: "Infrastructure",
    key: "INFRA",
  });

  const itsmProject = await createServiceDeskProject(prisma, organizationId);

  // Add project members
  const admin = users[0]!;
  for (const project of [ordolixProject, infraProject, itsmProject]) {
    await prisma.projectMember.create({
      data: { projectId: project.id, userId: admin.id, role: "administrator" },
    });
  }

  return {
    projects: [ordolixProject, infraProject, itsmProject],
    users,
  };
}
