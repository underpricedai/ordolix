import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
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

  // ── Users (5) ───────────────────────────────────────────────────────────────
  const userDefs = [
    { name: "Frank Admin", email: "frank@ordolix.local", orgRole: "administrator" },
    { name: "Sarah PM", email: "sarah@ordolix.local", orgRole: "member" },
    { name: "Mike Developer", email: "mike@ordolix.local", orgRole: "member" },
    { name: "Lisa Viewer", email: "lisa@ordolix.local", orgRole: "member" },
    { name: "External User", email: "external@ordolix.local", orgRole: "member" },
  ] as const;

  const users: Record<string, string> = {};
  const defaultPasswordHash = await bcrypt.hash("password123", 12);

  for (const def of userDefs) {
    const user = await prisma.user.upsert({
      where: { email: def.email },
      update: { name: def.name, passwordHash: defaultPasswordHash },
      create: { name: def.name, email: def.email, passwordHash: defaultPasswordHash },
    });
    users[def.email] = user.id;

    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId: org.id, userId: user.id },
      },
      update: { role: def.orgRole },
      create: { organizationId: org.id, userId: user.id, role: def.orgRole },
    });

    console.log(`  User: ${def.name} (${def.orgRole})`);
  }

  // Keep the old dev user as an alias for frank
  const devUser = await prisma.user.upsert({
    where: { email: "dev@ordolix.local" },
    update: { passwordHash: defaultPasswordHash },
    create: { name: "Dev User", email: "dev@ordolix.local", passwordHash: defaultPasswordHash },
  });
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: devUser.id },
    },
    update: {},
    create: { organizationId: org.id, userId: devUser.id, role: "administrator" },
  });

  const frankId = users["frank@ordolix.local"]!;
  const sarahId = users["sarah@ordolix.local"]!;
  const mikeId = users["mike@ordolix.local"]!;
  const lisaId = users["lisa@ordolix.local"]!;

  // ── Project Roles (4) ──────────────────────────────────────────────────────
  const roleDefs = [
    { name: "Administrator", description: "Full project access", isDefault: false },
    { name: "Project Manager", description: "Manage project settings and team", isDefault: false },
    { name: "Developer", description: "Create and work on issues", isDefault: true },
    { name: "Viewer", description: "Read-only project access", isDefault: false },
  ] as const;

  const roles: Record<string, string> = {};

  for (const def of roleDefs) {
    const role = await prisma.projectRole.upsert({
      where: { organizationId_name: { organizationId: org.id, name: def.name } },
      update: { description: def.description, isDefault: def.isDefault },
      create: { organizationId: org.id, ...def },
    });
    roles[def.name] = role.id;
  }

  console.log("  Created 4 project roles");

  // ── Groups (4) ─────────────────────────────────────────────────────────────
  const groupDefs = [
    { name: "jira-administrators", description: "Organization administrators", memberIds: [frankId] },
    { name: "project-managers", description: "Project management team", memberIds: [frankId, sarahId] },
    { name: "developers", description: "Development team", memberIds: [frankId, sarahId, mikeId] },
    { name: "viewers", description: "Read-only access", memberIds: [frankId, sarahId, mikeId, lisaId] },
  ] as const;

  const groups: Record<string, string> = {};

  for (const def of groupDefs) {
    const group = await prisma.group.upsert({
      where: { organizationId_name: { organizationId: org.id, name: def.name } },
      update: { description: def.description },
      create: { organizationId: org.id, name: def.name, description: def.description },
    });
    groups[def.name] = group.id;

    for (const userId of def.memberIds) {
      await prisma.groupMember.upsert({
        where: { groupId_userId: { groupId: group.id, userId } },
        update: {},
        create: { groupId: group.id, userId },
      });
    }
  }

  console.log("  Created 4 groups with members");

  // ── Permission Schemes ─────────────────────────────────────────────────────
  const defaultScheme = await prisma.permissionScheme.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Default Permission Scheme" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Default Permission Scheme",
      description: "Standard permissions for most projects",
      isDefault: true,
    },
  });

  const restrictedScheme = await prisma.permissionScheme.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Restricted Permission Scheme" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Restricted Permission Scheme",
      description: "Tighter permissions for sensitive projects",
      isDefault: false,
    },
  });

  // Clear existing grants for idempotency
  await prisma.permissionGrant.deleteMany({
    where: { permissionSchemeId: { in: [defaultScheme.id, restrictedScheme.id] } },
  });

  // Default scheme grants
  const defaultGrants: Array<{ key: string; roleNames: string[] }> = [
    { key: "BROWSE_PROJECTS", roleNames: ["Administrator", "Project Manager", "Developer", "Viewer"] },
    { key: "CREATE_ISSUES", roleNames: ["Administrator", "Project Manager", "Developer"] },
    { key: "EDIT_ISSUES", roleNames: ["Administrator", "Project Manager", "Developer"] },
    { key: "DELETE_ISSUES", roleNames: ["Administrator"] },
    { key: "ASSIGN_ISSUES", roleNames: ["Administrator", "Project Manager"] },
    { key: "ASSIGNABLE_USER", roleNames: ["Administrator", "Project Manager", "Developer"] },
    { key: "CLOSE_ISSUES", roleNames: ["Administrator", "Project Manager", "Developer"] },
    { key: "TRANSITION_ISSUES", roleNames: ["Administrator", "Project Manager", "Developer"] },
    { key: "SCHEDULE_ISSUES", roleNames: ["Administrator", "Project Manager"] },
    { key: "MOVE_ISSUES", roleNames: ["Administrator", "Project Manager"] },
    { key: "SET_ISSUE_SECURITY", roleNames: ["Administrator", "Project Manager"] },
    { key: "LINK_ISSUES", roleNames: ["Administrator", "Project Manager", "Developer"] },
    { key: "CREATE_ATTACHMENTS", roleNames: ["Administrator", "Project Manager", "Developer"] },
    { key: "DELETE_ATTACHMENTS", roleNames: ["Administrator", "Project Manager"] },
    { key: "ADD_COMMENTS", roleNames: ["Administrator", "Project Manager", "Developer", "Viewer"] },
    { key: "EDIT_ALL_COMMENTS", roleNames: ["Administrator"] },
    { key: "DELETE_ALL_COMMENTS", roleNames: ["Administrator"] },
    { key: "EDIT_OWN_COMMENTS", roleNames: ["Administrator", "Project Manager", "Developer", "Viewer"] },
    { key: "DELETE_OWN_COMMENTS", roleNames: ["Administrator", "Project Manager", "Developer"] },
    { key: "MANAGE_WATCHERS", roleNames: ["Administrator", "Project Manager"] },
    { key: "VIEW_WATCHERS", roleNames: ["Administrator", "Project Manager", "Developer", "Viewer"] },
    { key: "VIEW_VOTERS", roleNames: ["Administrator", "Project Manager", "Developer", "Viewer"] },
    { key: "LOG_WORK", roleNames: ["Administrator", "Project Manager", "Developer"] },
    { key: "EDIT_ALL_WORKLOGS", roleNames: ["Administrator"] },
    { key: "DELETE_ALL_WORKLOGS", roleNames: ["Administrator"] },
    { key: "EDIT_OWN_WORKLOGS", roleNames: ["Administrator", "Project Manager", "Developer"] },
    { key: "DELETE_OWN_WORKLOGS", roleNames: ["Administrator", "Project Manager", "Developer"] },
    { key: "ADMINISTER_PROJECTS", roleNames: ["Administrator"] },
    { key: "MANAGE_SPRINTS", roleNames: ["Administrator", "Project Manager"] },
  ];

  for (const grant of defaultGrants) {
    for (const roleName of grant.roleNames) {
      const roleId = roles[roleName];
      if (!roleId) continue;
      await prisma.permissionGrant.create({
        data: {
          permissionSchemeId: defaultScheme.id,
          permissionKey: grant.key,
          holderType: "projectRole",
          projectRoleId: roleId,
        },
      });
    }
  }

  // Restricted scheme grants (admin-only for destructive actions)
  const restrictedGrants: Array<{ key: string; roleNames: string[] }> = [
    { key: "BROWSE_PROJECTS", roleNames: ["Administrator", "Project Manager", "Developer", "Viewer"] },
    { key: "CREATE_ISSUES", roleNames: ["Administrator", "Project Manager"] },
    { key: "EDIT_ISSUES", roleNames: ["Administrator", "Project Manager"] },
    { key: "DELETE_ISSUES", roleNames: ["Administrator"] },
    { key: "ASSIGN_ISSUES", roleNames: ["Administrator"] },
    { key: "TRANSITION_ISSUES", roleNames: ["Administrator", "Project Manager"] },
    { key: "ADD_COMMENTS", roleNames: ["Administrator", "Project Manager", "Developer"] },
    { key: "LOG_WORK", roleNames: ["Administrator", "Project Manager"] },
    { key: "ADMINISTER_PROJECTS", roleNames: ["Administrator"] },
  ];

  for (const grant of restrictedGrants) {
    for (const roleName of grant.roleNames) {
      const roleId = roles[roleName];
      if (!roleId) continue;
      await prisma.permissionGrant.create({
        data: {
          permissionSchemeId: restrictedScheme.id,
          permissionKey: grant.key,
          holderType: "projectRole",
          projectRoleId: roleId,
        },
      });
    }
  }

  console.log("  Created 2 permission schemes with grants");

  // ── Global Permissions ─────────────────────────────────────────────────────
  await prisma.globalPermission.deleteMany({
    where: { organizationId: org.id },
  });

  const globalPerms = [
    { key: "ADMINISTER", holderType: "group" as const, groupId: groups["jira-administrators"]! },
    { key: "CREATE_PROJECT", holderType: "group" as const, groupId: groups["jira-administrators"]! },
    { key: "CREATE_PROJECT", holderType: "group" as const, groupId: groups["project-managers"]! },
    { key: "BULK_CHANGE", holderType: "group" as const, groupId: groups["developers"]! },
    { key: "MANAGE_GROUP_MEMBERSHIP", holderType: "group" as const, groupId: groups["jira-administrators"]! },
  ];

  for (const perm of globalPerms) {
    await prisma.globalPermission.create({
      data: {
        organizationId: org.id,
        permissionKey: perm.key,
        holderType: perm.holderType,
        groupId: perm.groupId,
      },
    });
  }

  console.log("  Created 5 global permissions");

  // ── Issue Security Scheme ──────────────────────────────────────────────────
  const securityScheme = await prisma.issueSecurityScheme.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Default Security Scheme" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Default Security Scheme",
      description: "Standard issue security levels",
    },
  });

  // Clear existing levels for idempotency
  await prisma.issueSecurityLevel.deleteMany({
    where: { issueSecuritySchemeId: securityScheme.id },
  });

  const internalLevel = await prisma.issueSecurityLevel.create({
    data: {
      issueSecuritySchemeId: securityScheme.id,
      name: "Internal",
      description: "Visible to developers and project managers",
      orderIndex: 0,
    },
  });

  const confidentialLevel = await prisma.issueSecurityLevel.create({
    data: {
      issueSecuritySchemeId: securityScheme.id,
      name: "Confidential",
      description: "Visible to administrators only",
      orderIndex: 1,
    },
  });

  // Internal level members: developers group + PM role
  await prisma.issueSecurityLevelMember.create({
    data: {
      issueSecurityLevelId: internalLevel.id,
      holderType: "group",
      groupId: groups["developers"]!,
    },
  });
  await prisma.issueSecurityLevelMember.create({
    data: {
      issueSecurityLevelId: internalLevel.id,
      holderType: "projectRole",
      projectRoleId: roles["Project Manager"]!,
    },
  });

  // Confidential level members: administrators group only
  await prisma.issueSecurityLevelMember.create({
    data: {
      issueSecurityLevelId: confidentialLevel.id,
      holderType: "group",
      groupId: groups["jira-administrators"]!,
    },
  });

  console.log("  Created security scheme with 2 levels");

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
      update: {
        permissionSchemeId: defaultScheme.id,
        issueSecuritySchemeId: def.key === "DEMO" ? securityScheme.id : null,
      },
      create: {
        organizationId: org.id,
        name: def.name,
        key: def.key,
        projectType: def.type,
        templateKey: def.template,
        defaultWorkflowId: defaultWorkflow?.id,
        permissionSchemeId: defaultScheme.id,
        issueSecuritySchemeId: def.key === "DEMO" ? securityScheme.id : null,
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

    console.log(`Project: ${def.name} (${def.key})`);
  }

  // ── Project Members with Roles ─────────────────────────────────────────────
  const projectMemberDefs = [
    // DEMO project: all 4 users
    { projectKey: "DEMO", userId: frankId, role: "administrator", roleName: "Administrator" },
    { projectKey: "DEMO", userId: sarahId, role: "member", roleName: "Project Manager" },
    { projectKey: "DEMO", userId: mikeId, role: "member", roleName: "Developer" },
    { projectKey: "DEMO", userId: lisaId, role: "member", roleName: "Viewer" },
    // ENG project
    { projectKey: "ENG", userId: frankId, role: "administrator", roleName: "Administrator" },
    { projectKey: "ENG", userId: mikeId, role: "member", roleName: "Developer" },
    // IT project
    { projectKey: "IT", userId: frankId, role: "administrator", roleName: "Administrator" },
    { projectKey: "IT", userId: sarahId, role: "member", roleName: "Project Manager" },
    // Dev user for backwards compat
    { projectKey: "DEMO", userId: devUser.id, role: "administrator", roleName: "Administrator" },
    { projectKey: "ENG", userId: devUser.id, role: "administrator", roleName: "Administrator" },
    { projectKey: "IT", userId: devUser.id, role: "administrator", roleName: "Administrator" },
  ];

  for (const def of projectMemberDefs) {
    const project = projects.find((p) => p.key === def.projectKey);
    if (!project) continue;
    const roleId = roles[def.roleName];
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: def.userId } },
      update: { role: def.role, projectRoleId: roleId },
      create: {
        projectId: project.id,
        userId: def.userId,
        role: def.role,
        projectRoleId: roleId,
      },
    });
  }

  console.log("  Assigned project members with roles");

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

      // Assign security levels to some DEMO issues
      let securityLevelId: string | null = null;
      if (project.key === "DEMO") {
        if (i === 2) securityLevelId = internalLevel.id; // "Implement user authentication flow" → Internal
        if (i === 4) securityLevelId = confidentialLevel.id; // "Write API documentation" → Confidential
      }

      await prisma.issue.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          key: `${project.key}-${issueNumber}`,
          summary: issue.summary,
          issueTypeId,
          statusId,
          priorityId,
          reporterId: frankId,
          assigneeId: i % 2 === 0 ? mikeId : sarahId,
          storyPoints: issue.storyPoints,
          securityLevelId,
        },
      });
    }

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
      where: { organizationId: org.id, userId: frankId },
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
            userId: frankId,
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
