import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { seedDefaults } from "../tests/fixtures/scenarios";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/** Demo issue summaries grouped by project for realistic seed data */
const DEMO_ISSUES = {
  DEMO: [
    { summary: "Set up CI/CD pipeline", priority: "High", storyPoints: 5 },
    { summary: "Design landing page wireframes", priority: "Medium", storyPoints: 3 },
    { summary: "Implement user authentication flow", priority: "Highest", storyPoints: 8 },
    { summary: "Add dark mode support", priority: "Low", storyPoints: 3 },
    { summary: "Write API documentation", priority: "Medium", storyPoints: 2 },
  ],
  ENG: [
    { summary: "Refactor database connection pooling", priority: "High", storyPoints: 5 },
    { summary: "Add Redis caching layer", priority: "Medium", storyPoints: 5 },
    { summary: "Fix memory leak in WebSocket handler", priority: "Highest", storyPoints: 3 },
    { summary: "Upgrade Node.js to v22", priority: "Low", storyPoints: 2 },
    { summary: "Implement rate limiting middleware", priority: "High", storyPoints: 3 },
  ],
  IT: [
    { summary: "Provision staging environment", priority: "High", storyPoints: 5 },
    { summary: "Update SSL certificates", priority: "Highest", storyPoints: 1 },
    { summary: "Configure monitoring alerts", priority: "Medium", storyPoints: 3 },
    { summary: "Audit user access permissions", priority: "Medium", storyPoints: 2 },
    { summary: "Set up automated backups", priority: "High", storyPoints: 3 },
  ],
} as const;

async function main() {
  console.log("Seeding database...");

  const org = await prisma.organization.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      name: "Default Organization",
      slug: "default",
      plan: "free",
    },
  });

  console.log(`Organization: ${org.name} (${org.id})`);

  await seedDefaults(prisma, org.id);

  // Create dev user for local development auth bypass
  const devUser = await prisma.user.upsert({
    where: { email: "dev@ordolix.local" },
    update: {},
    create: {
      name: "Dev User",
      email: "dev@ordolix.local",
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: devUser.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: devUser.id,
      role: "administrator",
    },
  });

  console.log(`Dev user: ${devUser.email} (${devUser.id})`);

  // ── Demo Projects ──────────────────────────────────────────────────────────
  const defaultWorkflow = await prisma.workflow.findFirst({
    where: { organizationId: org.id, isDefault: true },
  });

  const projectDefs = [
    { name: "Demo Project", key: "DEMO", type: "software", template: "kanban" },
    { name: "Engineering", key: "ENG", type: "software", template: "scrum" },
    { name: "IT Operations", key: "IT", type: "software", template: "kanban" },
  ] as const;

  const projects: Array<{ id: string; key: string; issueCounter: number }> = [];

  for (const def of projectDefs) {
    const project = await prisma.project.upsert({
      where: {
        organizationId_key: { organizationId: org.id, key: def.key },
      },
      update: {},
      create: {
        organizationId: org.id,
        name: def.name,
        key: def.key,
        projectType: def.type,
        templateKey: def.template,
        defaultWorkflowId: defaultWorkflow?.id,
      },
    });
    projects.push(project);

    // Create a Kanban board for each project (skip if one already exists)
    const existingBoard = await prisma.board.findFirst({
      where: { organizationId: org.id, projectId: project.id },
    });
    if (!existingBoard) {
      await prisma.board.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          name: `${def.name} Board`,
          boardType: def.template === "scrum" ? "scrum" : "kanban",
          columns: [
            { name: "To Do", statuses: ["To Do"], wipLimit: null },
            { name: "In Progress", statuses: ["In Progress"], wipLimit: null },
            { name: "Done", statuses: ["Done"], wipLimit: null },
          ],
          cardFields: ["key", "summary", "priority", "assignee", "storyPoints"],
          cardColor: "priority",
          quickFilters: [
            { name: "Only My Issues", aql: "assignee = currentUser()" },
            { name: "Recently Updated", aql: "updatedDate >= -1d" },
          ],
        },
      });
    }

    // Add dev user as project member
    const existingMember = await prisma.projectMember.findFirst({
      where: { projectId: project.id, userId: devUser.id },
    });
    if (!existingMember) {
      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: devUser.id,
          role: "administrator",
        },
      });
    }

    console.log(`Project: ${def.name} (${def.key})`);
  }

  // ── Lookup reference data ─────────────────────────────────────────────────
  const statuses = await prisma.status.findMany({
    where: { organizationId: org.id, name: { in: ["To Do", "In Progress", "Done"] } },
  });
  const statusMap = new Map(statuses.map((s) => [s.name, s.id]));

  const priorities = await prisma.priority.findMany({
    where: { organizationId: org.id },
  });
  const priorityMap = new Map(priorities.map((p) => [p.name, p.id]));

  const issueTypes = await prisma.issueType.findMany({
    where: { organizationId: org.id, name: { in: ["Task", "Bug", "Story", "Epic"] } },
  });
  const issueTypeMap = new Map(issueTypes.map((t) => [t.name, t.id]));

  const typeNames = ["Task", "Bug", "Story", "Task", "Task"];
  const statusNames = ["To Do", "In Progress", "Done", "To Do", "In Progress"];

  // ── Demo Issues ────────────────────────────────────────────────────────────
  for (const project of projects) {
    const demoIssues = DEMO_ISSUES[project.key as keyof typeof DEMO_ISSUES];
    if (!demoIssues) continue;

    // Check if issues already exist for this project
    const existingCount = await prisma.issue.count({
      where: { organizationId: org.id, projectId: project.id },
    });
    if (existingCount > 0) {
      console.log(`  Skipping issues for ${project.key} (${existingCount} already exist)`);
      continue;
    }

    for (let i = 0; i < demoIssues.length; i++) {
      const issue = demoIssues[i]!;
      const typeName = typeNames[i % typeNames.length]!;
      const statusName = statusNames[i % statusNames.length]!;
      const issueNumber = project.issueCounter + i + 1;

      const issueTypeId = issueTypeMap.get(typeName);
      const statusId = statusMap.get(statusName);
      const priorityId = priorityMap.get(issue.priority);

      if (!issueTypeId || !statusId || !priorityId) continue;

      await prisma.issue.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          key: `${project.key}-${issueNumber}`,
          summary: issue.summary,
          issueTypeId,
          statusId,
          priorityId,
          reporterId: devUser.id,
          storyPoints: issue.storyPoints,
        },
      });
    }

    // Update the project issue counter
    await prisma.project.update({
      where: { id: project.id },
      data: { issueCounter: project.issueCounter + demoIssues.length },
    });

    console.log(`  Created ${demoIssues.length} issues for ${project.key}`);
  }

  // ── Sprints ────────────────────────────────────────────────────────────────
  const engProject = projects.find((p) => p.key === "ENG");
  if (engProject) {
    const existingSprint = await prisma.sprint.findFirst({
      where: { organizationId: org.id, projectId: engProject.id },
    });
    if (!existingSprint) {
      const now = new Date();
      const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const fourWeeksOut = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

      const sprint1 = await prisma.sprint.create({
        data: {
          organizationId: org.id,
          projectId: engProject.id,
          name: "Sprint 1",
          goal: "Core infrastructure setup and critical bug fixes",
          status: "active",
          startDate: now,
          endDate: twoWeeksOut,
        },
      });

      await prisma.sprint.create({
        data: {
          organizationId: org.id,
          projectId: engProject.id,
          name: "Sprint 2",
          goal: "Performance improvements and Node.js upgrade",
          status: "future",
          startDate: twoWeeksOut,
          endDate: fourWeeksOut,
        },
      });

      // Assign first 3 ENG issues to Sprint 1
      const engIssues = await prisma.issue.findMany({
        where: { organizationId: org.id, projectId: engProject.id },
        take: 3,
        orderBy: { createdAt: "asc" },
      });

      for (const issue of engIssues) {
        await prisma.issue.update({
          where: { id: issue.id },
          data: { sprintId: sprint1.id },
        });
      }

      console.log("  Created 2 sprints for ENG");
    }
  }

  // ── Time Log Entries ───────────────────────────────────────────────────────
  const demoProject = projects.find((p) => p.key === "DEMO");
  if (demoProject) {
    const demoIssues = await prisma.issue.findMany({
      where: { organizationId: org.id, projectId: demoProject.id },
      take: 3,
      orderBy: { createdAt: "asc" },
    });

    const existingLogs = await prisma.timeLog.count({
      where: { organizationId: org.id, userId: devUser.id },
    });

    if (existingLogs === 0 && demoIssues.length > 0) {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const timeEntries = [
        { issueId: demoIssues[0]!.id, date: yesterday, duration: 3600, description: "Initial setup and configuration" },
        { issueId: demoIssues[0]!.id, date: today, duration: 7200, description: "Continued pipeline work" },
        { issueId: demoIssues[1]!.id, date: today, duration: 1800, description: "Wireframe review meeting" },
      ];

      for (const entry of timeEntries) {
        await prisma.timeLog.create({
          data: {
            organizationId: org.id,
            issueId: entry.issueId,
            userId: devUser.id,
            date: entry.date,
            duration: entry.duration,
            description: entry.description,
            billable: true,
          },
        });
      }

      console.log("  Created 3 time log entries");
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
