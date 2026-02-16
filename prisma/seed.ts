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

  // ── Issue Type Scheme ────────────────────────────────────────────────────
  const defaultIssueTypeScheme = await prisma.issueTypeScheme.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Default Issue Type Scheme" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Default Issue Type Scheme",
      description: "Standard issue types for most projects",
      isDefault: true,
    },
  });

  // Add entries for the standard issue types
  const allIssueTypes = await prisma.issueType.findMany({
    where: { organizationId: org.id, name: { in: ["Epic", "Story", "Task", "Bug", "Sub-task"] } },
  });
  for (let i = 0; i < allIssueTypes.length; i++) {
    const it = allIssueTypes[i]!;
    await prisma.issueTypeSchemeEntry.upsert({
      where: { issueTypeSchemeId_issueTypeId: { issueTypeSchemeId: defaultIssueTypeScheme.id, issueTypeId: it.id } },
      update: {},
      create: {
        issueTypeSchemeId: defaultIssueTypeScheme.id,
        issueTypeId: it.id,
        isDefault: it.name === "Task",
        position: i,
      },
    });
  }
  console.log("  Created default issue type scheme with entries");

  // ── Field Configuration Scheme ──────────────────────────────────────────
  const defaultFieldConfigScheme = await prisma.fieldConfigurationScheme.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Default Field Configuration" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Default Field Configuration",
      description: "Standard field visibility for most projects",
      isDefault: true,
    },
  });
  console.log("  Created default field configuration scheme");

  // ── Notification Scheme ─────────────────────────────────────────────────
  const defaultNotificationScheme = await prisma.notificationScheme.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Default Notification Scheme" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Default Notification Scheme",
      description: "Standard notification settings for most projects",
      isDefault: true,
    },
  });

  // Add default notification entries
  const notifEntries = [
    { event: "issue_created", recipientType: "reporter", channels: ["in_app", "email"] },
    { event: "issue_assigned", recipientType: "assignee", channels: ["in_app", "email"] },
    { event: "issue_commented", recipientType: "watchers", channels: ["in_app"] },
    { event: "issue_resolved", recipientType: "reporter", channels: ["in_app", "email"] },
    { event: "issue_status_changed", recipientType: "assignee", channels: ["in_app"] },
  ];
  for (const ne of notifEntries) {
    const exists = await prisma.notificationSchemeEntry.findFirst({
      where: { notificationSchemeId: defaultNotificationScheme.id, event: ne.event, recipientType: ne.recipientType },
    });
    if (!exists) {
      await prisma.notificationSchemeEntry.create({
        data: {
          notificationSchemeId: defaultNotificationScheme.id,
          event: ne.event,
          recipientType: ne.recipientType,
          channels: ne.channels,
        },
      });
    }
  }
  console.log("  Created default notification scheme with entries");

  // ── Component Scheme ────────────────────────────────────────────────────
  const defaultComponentScheme = await prisma.componentScheme.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Default Component Scheme" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Default Component Scheme",
      description: "Standard component configuration for most projects",
      isDefault: true,
    },
  });
  console.log("  Created default component scheme");

  // ── Lookup reference data (needed for board columns + issues) ─────────────
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
        issueTypeSchemeId: defaultIssueTypeScheme.id,
        fieldConfigurationSchemeId: defaultFieldConfigScheme.id,
        notificationSchemeId: defaultNotificationScheme.id,
        componentSchemeId: defaultComponentScheme.id,
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
        issueTypeSchemeId: defaultIssueTypeScheme.id,
        fieldConfigurationSchemeId: defaultFieldConfigScheme.id,
        notificationSchemeId: defaultNotificationScheme.id,
        componentSchemeId: defaultComponentScheme.id,
      },
    });
    projects.push(project);

    // Board columns with real status IDs
    const boardColumns = [
      { id: `col-todo-${def.key}`, name: "To Do", statusIds: [statusMap.get("To Do")!].filter(Boolean) },
      { id: `col-inprogress-${def.key}`, name: "In Progress", statusIds: [statusMap.get("In Progress")!].filter(Boolean) },
      { id: `col-done-${def.key}`, name: "Done", statusIds: [statusMap.get("Done")!].filter(Boolean) },
    ];

    // Create or update board for each project
    const existingBoard = await prisma.board.findFirst({
      where: { organizationId: org.id, projectId: project.id },
    });
    if (existingBoard) {
      await prisma.board.update({
        where: { id: existingBoard.id },
        data: { columns: boardColumns },
      });
    } else {
      await prisma.board.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          name: `${def.name} Board`,
          boardType: def.template === "scrum" ? "scrum" : "kanban",
          columns: boardColumns,
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

      // Spread issues across the timeline for Gantt chart visibility
      const issueStartDate = new Date();
      issueStartDate.setDate(issueStartDate.getDate() - 7 + i * 5);
      const issueDueDate = new Date(issueStartDate);
      issueDueDate.setDate(issueDueDate.getDate() + 3 + issue.storyPoints);

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
          startDate: issueStartDate,
          dueDate: issueDueDate,
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

  // ── Sprints (all projects) ────────────────────────────────────────────────
  for (const project of projects) {
    const existingSprint = await prisma.sprint.findFirst({
      where: { organizationId: org.id, projectId: project.id },
    });
    if (!existingSprint) {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const fourWeeksOut = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

      // Completed sprint (for velocity chart data)
      const completedSprint = await prisma.sprint.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          name: `${project.key} Sprint 1`,
          goal: "Initial setup, CI/CD pipeline, and core infrastructure",
          status: "completed",
          startDate: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
          endDate: twoWeeksAgo,
          completedAt: twoWeeksAgo,
        },
      });

      // Assign some issues to completed sprint and mark them done
      const doneStatus = await prisma.status.findFirst({
        where: { organizationId: org.id, name: "Done" },
      });
      const completedIssues = await prisma.issue.findMany({
        where: { organizationId: org.id, projectId: project.id, statusId: doneStatus?.id },
        take: 3,
        orderBy: { createdAt: "asc" },
      });
      for (const issue of completedIssues) {
        await prisma.issue.update({
          where: { id: issue.id },
          data: { sprintId: completedSprint.id },
        });
      }

      // Active sprint
      const activeSprint = await prisma.sprint.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          name: `${project.key} Sprint 2`,
          goal: "Feature development and bug fixes",
          status: "active",
          startDate: now,
          endDate: twoWeeksOut,
        },
      });

      // Assign some issues to active sprint
      const activeIssues = await prisma.issue.findMany({
        where: {
          organizationId: org.id,
          projectId: project.id,
          sprintId: null,
          statusId: { not: doneStatus?.id ?? "" },
        },
        take: 5,
        orderBy: { createdAt: "asc" },
      });
      for (const issue of activeIssues) {
        await prisma.issue.update({
          where: { id: issue.id },
          data: { sprintId: activeSprint.id },
        });
      }

      // Future sprint
      await prisma.sprint.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          name: `${project.key} Sprint 3`,
          goal: "Performance improvements and testing",
          status: "future",
          startDate: twoWeeksOut,
          endDate: fourWeeksOut,
        },
      });

      console.log(`  Created 3 sprints for ${project.key}`);
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

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPANDED SEED DATA — Populates ALL modules with realistic demo data
  // ═══════════════════════════════════════════════════════════════════════════

  // Fetch all statuses for expanded status usage
  const allStatuses = await prisma.status.findMany({ where: { organizationId: org.id } });
  const fullStatusMap = new Map(allStatuses.map((s) => [s.name, s.id]));

  // ── 1. Additional Workflow Statuses & Transitions ──────────────────────────
  // Add "Blocked" and "QA" statuses if they don't exist
  for (const statusDef of [
    { name: "Blocked", category: "IN_PROGRESS", color: "#FF5630" },
    { name: "QA", category: "IN_PROGRESS", color: "#6554C0" },
  ]) {
    const existing = await prisma.status.findFirst({
      where: { organizationId: org.id, name: statusDef.name },
    });
    if (!existing) {
      const created = await prisma.status.create({
        data: { organizationId: org.id, ...statusDef },
      });
      fullStatusMap.set(statusDef.name, created.id);
    } else {
      fullStatusMap.set(statusDef.name, existing.id);
    }
  }

  // Add these statuses + transitions to default workflow
  if (defaultWorkflow) {
    const blockedId = fullStatusMap.get("Blocked")!;
    const qaId = fullStatusMap.get("QA")!;
    const inProgressId = fullStatusMap.get("In Progress")!;
    const doneId = fullStatusMap.get("Done")!;
    const todoId = fullStatusMap.get("To Do")!;

    // Link Blocked and QA to the default workflow
    for (const [statusId, pos] of [[blockedId, 3], [qaId, 4]] as const) {
      await prisma.workflowStatus.upsert({
        where: { workflowId_statusId: { workflowId: defaultWorkflow.id, statusId } },
        update: {},
        create: { workflowId: defaultWorkflow.id, statusId, position: pos },
      });
    }

    // Add transitions for Blocked and QA
    const newTransitions = [
      { from: inProgressId, to: blockedId, name: "Block" },
      { from: blockedId, to: inProgressId, name: "Unblock" },
      { from: blockedId, to: todoId, name: "Return to Backlog" },
      { from: inProgressId, to: qaId, name: "Submit to QA" },
      { from: qaId, to: doneId, name: "QA Passed" },
      { from: qaId, to: inProgressId, name: "QA Failed" },
    ];

    for (const t of newTransitions) {
      const exists = await prisma.transition.findFirst({
        where: { workflowId: defaultWorkflow.id, fromStatusId: t.from, toStatusId: t.to },
      });
      if (!exists) {
        await prisma.transition.create({
          data: { workflowId: defaultWorkflow.id, fromStatusId: t.from, toStatusId: t.to, name: t.name },
        });
      }
    }
    console.log("  Added Blocked + QA statuses and transitions to default workflow");
  }

  // ── 2. More Issues (30+ per project) ──────────────────────────────────────
  const EXTRA_ISSUES: Record<string, Array<{ summary: string; priority: string; type: string; status: string; storyPoints: number; description?: string; labels?: string[] }>> = {
    DEMO: [
      { summary: "Implement OAuth2 social login", priority: "High", type: "Story", status: "To Do", storyPoints: 8, description: "Add Google and GitHub OAuth providers alongside email/password auth." },
      { summary: "Create onboarding wizard component", priority: "Medium", type: "Story", status: "In Progress", storyPoints: 5, description: "Multi-step wizard for new org setup: name, invite, first project." },
      { summary: "Fix timezone display in date pickers", priority: "High", type: "Bug", status: "In Progress", storyPoints: 2, description: "Dates show UTC instead of user's local timezone in form inputs." },
      { summary: "Add keyboard shortcuts overlay", priority: "Low", type: "Task", status: "To Do", storyPoints: 3, labels: ["ux", "accessibility"] },
      { summary: "Design system color token audit", priority: "Medium", type: "Task", status: "Done", storyPoints: 2, labels: ["design-system"] },
      { summary: "Migrate to Next.js 15 App Router", priority: "Highest", type: "Epic", status: "In Progress", storyPoints: 21, description: "Complete migration from Pages Router to App Router with parallel routes." },
      { summary: "Implement drag-and-drop board reordering", priority: "High", type: "Story", status: "QA", storyPoints: 5 },
      { summary: "Add CSV export for issue lists", priority: "Medium", type: "Story", status: "To Do", storyPoints: 3 },
      { summary: "Fix N+1 query in issue list endpoint", priority: "Highest", type: "Bug", status: "Blocked", storyPoints: 3, description: "Issue list API makes 1 query per issue for assignee data." },
      { summary: "Set up Playwright E2E test suite", priority: "High", type: "Task", status: "Done", storyPoints: 5 },
      { summary: "Create reusable DataTable component", priority: "Medium", type: "Story", status: "In Progress", storyPoints: 5 },
      { summary: "Add rate limiting to public API", priority: "High", type: "Task", status: "To Do", storyPoints: 3, labels: ["security"] },
    ],
    ENG: [
      { summary: "Set up Kubernetes cluster for staging", priority: "High", type: "Epic", status: "In Progress", storyPoints: 13, description: "Provision AKS cluster with Terraform, configure namespaces and RBAC." },
      { summary: "Implement circuit breaker for external APIs", priority: "High", type: "Story", status: "To Do", storyPoints: 5 },
      { summary: "Add structured logging with Pino", priority: "Medium", type: "Task", status: "Done", storyPoints: 3 },
      { summary: "Database migration rollback strategy", priority: "High", type: "Task", status: "In Progress", storyPoints: 3, description: "Document and test rollback procedures for Prisma migrations." },
      { summary: "Fix race condition in queue processor", priority: "Highest", type: "Bug", status: "In Progress", storyPoints: 5, description: "Concurrent job picks cause duplicate processing under load." },
      { summary: "Implement GraphQL subscriptions for real-time", priority: "Medium", type: "Story", status: "To Do", storyPoints: 8 },
      { summary: "Add health check endpoints", priority: "Medium", type: "Task", status: "Done", storyPoints: 1 },
      { summary: "Optimize Docker image size", priority: "Low", type: "Task", status: "QA", storyPoints: 2 },
      { summary: "Set up Sentry error tracking", priority: "High", type: "Task", status: "Blocked", storyPoints: 2, description: "Blocked on infosec approval for Sentry SaaS data processing." },
      { summary: "Implement blue-green deployment strategy", priority: "Medium", type: "Story", status: "To Do", storyPoints: 8 },
      { summary: "Create load testing suite with k6", priority: "Medium", type: "Task", status: "To Do", storyPoints: 5 },
      { summary: "Add OpenTelemetry tracing", priority: "Low", type: "Story", status: "To Do", storyPoints: 5, labels: ["observability"] },
    ],
    IT: [
      { summary: "Rotate production database credentials", priority: "Highest", type: "Task", status: "Done", storyPoints: 1 },
      { summary: "Implement LDAP group sync", priority: "High", type: "Epic", status: "In Progress", storyPoints: 13, description: "Sync Active Directory groups to Ordolix groups nightly." },
      { summary: "Set up CloudFlare WAF rules", priority: "High", type: "Task", status: "To Do", storyPoints: 3 },
      { summary: "Investigate intermittent VPN disconnects", priority: "Medium", type: "Bug", status: "In Progress", storyPoints: 3, description: "Users on macOS 14+ report GlobalProtect drops every 2-3 hours." },
      { summary: "Create disaster recovery runbook", priority: "High", type: "Task", status: "To Do", storyPoints: 5 },
      { summary: "Upgrade Jira to latest LTS version", priority: "Medium", type: "Task", status: "Done", storyPoints: 3 },
      { summary: "Deploy new monitoring dashboards", priority: "Medium", type: "Story", status: "QA", storyPoints: 3 },
      { summary: "Fix email deliverability issues", priority: "High", type: "Bug", status: "Blocked", storyPoints: 2, description: "SPF/DKIM records misconfigured after domain migration." },
      { summary: "Provision dev environment for new hires", priority: "Low", type: "Task", status: "To Do", storyPoints: 2 },
      { summary: "Audit third-party SaaS access", priority: "Medium", type: "Task", status: "In Progress", storyPoints: 3, labels: ["security", "compliance"] },
      { summary: "Set up centralized log aggregation", priority: "High", type: "Story", status: "To Do", storyPoints: 8 },
      { summary: "Configure SSO for all internal tools", priority: "High", type: "Task", status: "To Do", storyPoints: 5, labels: ["security"] },
    ],
  };

  const assignees = [frankId, sarahId, mikeId, lisaId];
  const allIssueIds: Record<string, string[]> = { DEMO: [], ENG: [], IT: [] };

  // First collect existing issue IDs
  for (const project of projects) {
    const existing = await prisma.issue.findMany({
      where: { organizationId: org.id, projectId: project.id },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    allIssueIds[project.key] = existing.map((e) => e.id);
  }

  // Create extra issues
  for (const project of projects) {
    const extras = EXTRA_ISSUES[project.key];
    if (!extras) continue;

    const existingCount = await prisma.issue.count({
      where: { organizationId: org.id, projectId: project.id },
    });
    // Only add extras if we haven't already (idempotency)
    if (existingCount > 17) {
      console.log(`  Skipping extra issues for ${project.key} (${existingCount} already exist)`);
      const allIds = await prisma.issue.findMany({
        where: { organizationId: org.id, projectId: project.id },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      allIssueIds[project.key] = allIds.map((e) => e.id);
      continue;
    }

    const currentCounter = (await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).issueCounter;
    let counter = currentCounter;

    for (let i = 0; i < extras.length; i++) {
      const issue = extras[i]!;
      const issueTypeId = issueTypeMap.get(issue.type);
      const statusId = fullStatusMap.get(issue.status);
      const priorityId = priorityMap.get(issue.priority);
      if (!issueTypeId || !statusId || !priorityId) continue;

      counter++;
      const now = new Date();
      // Spread created dates over the last 30 days for realistic history
      const createdAt = new Date(now.getTime() - (extras.length - i) * 24 * 60 * 60 * 1000);

      // Spread issues across the timeline for Gantt chart visibility
      const issueStartDate = new Date();
      issueStartDate.setDate(issueStartDate.getDate() - 14 + i * 4);
      const issueDueDate = new Date(issueStartDate);
      issueDueDate.setDate(issueDueDate.getDate() + 2 + issue.storyPoints);

      const created = await prisma.issue.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          key: `${project.key}-${counter}`,
          summary: issue.summary,
          description: issue.description ?? null,
          issueTypeId,
          statusId,
          priorityId,
          reporterId: assignees[i % assignees.length]!,
          assigneeId: assignees[(i + 1) % assignees.length]!,
          storyPoints: issue.storyPoints,
          labels: issue.labels ?? [],
          startDate: issueStartDate,
          dueDate: issueDueDate,
          createdAt,
        },
      });
      allIssueIds[project.key]!.push(created.id);
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { issueCounter: counter },
    });
    console.log(`  Created ${extras.length} extra issues for ${project.key} (total: ${counter})`);
  }

  // ── 2b. Parent/Child relationships (subtasks) ─────────────────────────────
  // For each project, make the Epic the parent of 2-3 stories/tasks
  for (const project of projects) {
    const projectIssues = await prisma.issue.findMany({
      where: { organizationId: org.id, projectId: project.id },
      include: { issueType: true },
      orderBy: { createdAt: "asc" },
    });

    const epics = projectIssues.filter((i) => i.issueType.name === "Epic");
    const nonEpics = projectIssues.filter((i) => i.issueType.name !== "Epic" && !i.parentId);

    let childIdx = 0;
    for (const epic of epics) {
      // Assign 3 children to each epic
      for (let c = 0; c < 3 && childIdx < nonEpics.length; c++, childIdx++) {
        const child = nonEpics[childIdx]!;
        await prisma.issue.update({
          where: { id: child.id },
          data: { parentId: epic.id },
        });
      }
    }
  }
  console.log("  Created parent/child (epic -> story) relationships");

  // ── 3. Gantt Dependencies ─────────────────────────────────────────────────
  for (const project of projects) {
    const projectIssueIds = allIssueIds[project.key] ?? [];
    if (projectIssueIds.length < 10) continue;

    const existingDeps = await prisma.ganttDependency.count({
      where: { organizationId: org.id, sourceIssueId: { in: projectIssueIds } },
    });
    if (existingDeps > 0) {
      console.log(`  Skipping Gantt deps for ${project.key} (already exist)`);
      continue;
    }

    // Create a chain of 8-10 finish-to-start dependencies
    const depCount = Math.min(10, projectIssueIds.length - 1);
    for (let i = 0; i < depCount; i++) {
      await prisma.ganttDependency.create({
        data: {
          organizationId: org.id,
          sourceIssueId: projectIssueIds[i]!,
          targetIssueId: projectIssueIds[i + 1]!,
          dependencyType: "FS",
          lag: i % 3 === 0 ? 1 : 0, // Some with 1-day lag
        },
      });
    }
    console.log(`  Created ${depCount} Gantt dependencies for ${project.key}`);
  }

  // ── 4. Comments ───────────────────────────────────────────────────────────
  const commentBodies = [
    "I've started looking into this. Initial analysis suggests we need to refactor the data layer first.",
    "Agreed with the approach above. Let me know if you need help with the DB schema changes.",
    "Updated the PR with the requested changes. Ready for another review.",
    "This is blocked by the infrastructure team. I've pinged them on Slack.",
    "Good progress so far. Let's sync up in tomorrow's standup to discuss next steps.",
    "I've added unit tests covering the edge cases we discussed. Coverage is now at 94%.",
    "The fix has been deployed to staging. Can someone verify?",
    "Verified on staging - looks good! Ready for production deployment.",
    "I found a related issue that might be causing this. See the linked ticket.",
    "Closing this as it was resolved by the fix in the parent epic.",
  ];

  for (const project of projects) {
    const projectIssues = await prisma.issue.findMany({
      where: { organizationId: org.id, projectId: project.id },
      take: 10,
      orderBy: { createdAt: "asc" },
    });

    const existingComments = await prisma.comment.count({
      where: { organizationId: org.id, issueId: { in: projectIssues.map((i) => i.id) } },
    });
    if (existingComments > 0) continue;

    for (let i = 0; i < projectIssues.length; i++) {
      const issue = projectIssues[i]!;
      const commentCount = i < 5 ? 3 : 2; // First 5 issues get 3 comments, rest get 2
      for (let c = 0; c < commentCount; c++) {
        const authorId = assignees[(i + c) % assignees.length]!;
        const bodyIdx = (i * 3 + c) % commentBodies.length;
        await prisma.comment.create({
          data: {
            organizationId: org.id,
            issueId: issue.id,
            authorId,
            body: commentBodies[bodyIdx]!,
            isInternal: c === 2 && i < 3, // Some internal comments
            createdAt: new Date(issue.createdAt.getTime() + (c + 1) * 3600000),
          },
        });
      }
    }
    console.log(`  Created comments for ${project.key} issues`);
  }

  // ── 5. Issue History ──────────────────────────────────────────────────────
  for (const project of projects) {
    const projectIssues = await prisma.issue.findMany({
      where: { organizationId: org.id, projectId: project.id },
      take: 8,
      orderBy: { createdAt: "asc" },
    });

    const existingHistory = await prisma.issueHistory.count({
      where: { organizationId: org.id, issueId: { in: projectIssues.map((i) => i.id) } },
    });
    if (existingHistory > 0) continue;

    const historyEntries = [
      { field: "status", oldValue: "To Do", newValue: "In Progress" },
      { field: "assignee", oldValue: null, newValue: "Mike Developer" },
      { field: "priority", oldValue: "Medium", newValue: "High" },
      { field: "storyPoints", oldValue: "3", newValue: "5" },
      { field: "status", oldValue: "In Progress", newValue: "Done" },
      { field: "description", oldValue: null, newValue: "Added acceptance criteria" },
      { field: "labels", oldValue: "[]", newValue: '["backend"]' },
      { field: "sprint", oldValue: null, newValue: "Sprint 1" },
    ];

    for (let i = 0; i < projectIssues.length; i++) {
      const issue = projectIssues[i]!;
      const entryCount = i < 4 ? 3 : 2;
      for (let h = 0; h < entryCount; h++) {
        const entry = historyEntries[(i * 3 + h) % historyEntries.length]!;
        await prisma.issueHistory.create({
          data: {
            organizationId: org.id,
            issueId: issue.id,
            userId: assignees[(i + h) % assignees.length]!,
            field: entry.field,
            oldValue: entry.oldValue,
            newValue: entry.newValue,
            createdAt: new Date(issue.createdAt.getTime() + (h + 1) * 7200000),
          },
        });
      }
    }
    console.log(`  Created issue history for ${project.key}`);
  }

  // ── 6. Components & Versions ──────────────────────────────────────────────
  for (const project of projects) {
    const componentDefs = {
      DEMO: [
        { name: "Frontend", description: "React UI components and pages" },
        { name: "Backend API", description: "tRPC and REST API endpoints" },
        { name: "Database", description: "Prisma schema, migrations, queries" },
      ],
      ENG: [
        { name: "Infrastructure", description: "Cloud resources and Terraform" },
        { name: "CI/CD", description: "Build pipelines and deployment" },
        { name: "Monitoring", description: "Observability and alerting" },
      ],
      IT: [
        { name: "Network", description: "VPN, firewalls, DNS" },
        { name: "Identity", description: "SSO, LDAP, user provisioning" },
        { name: "Endpoints", description: "Laptop and device management" },
      ],
    };

    const defs = componentDefs[project.key as keyof typeof componentDefs];
    if (!defs) continue;

    for (const comp of defs) {
      await prisma.component.upsert({
        where: { projectId_name: { projectId: project.id, name: comp.name } },
        update: {},
        create: { organizationId: org.id, projectId: project.id, name: comp.name, description: comp.description, lead: frankId },
      });
    }
  }
  console.log("  Created components for all projects");

  // Add all components from DEMO project to the default component scheme
  const demoProjectForScheme = projects.find((p) => p.key === "DEMO");
  if (demoProjectForScheme) {
    const demoComponents = await prisma.component.findMany({
      where: { organizationId: org.id, projectId: demoProjectForScheme.id },
      orderBy: { name: "asc" },
    });
    for (let i = 0; i < demoComponents.length; i++) {
      const comp = demoComponents[i]!;
      const exists = await prisma.componentSchemeEntry.findFirst({
        where: { componentSchemeId: defaultComponentScheme.id, componentId: comp.id },
      });
      if (!exists) {
        await prisma.componentSchemeEntry.create({
          data: {
            componentSchemeId: defaultComponentScheme.id,
            componentId: comp.id,
            isDefault: i === 0,
            position: i,
          },
        });
      }
    }
    console.log("  Added DEMO components to default component scheme");
  }

  // Versions
  const now = new Date();
  for (const project of projects) {
    const versionDefs = [
      { name: "1.0.0", status: "released", releaseDate: new Date(now.getTime() - 30 * 86400000) },
      { name: "1.1.0", status: "released", releaseDate: new Date(now.getTime() - 7 * 86400000) },
      { name: "1.2.0", status: "unreleased", releaseDate: new Date(now.getTime() + 14 * 86400000) },
      { name: "2.0.0", status: "unreleased", releaseDate: new Date(now.getTime() + 60 * 86400000) },
    ];

    for (const v of versionDefs) {
      await prisma.version.upsert({
        where: { projectId_name: { projectId: project.id, name: v.name } },
        update: {},
        create: {
          organizationId: org.id,
          projectId: project.id,
          name: v.name,
          status: v.status,
          releaseDate: v.releaseDate,
          description: `Release ${v.name} for ${project.key}`,
        },
      });
    }
  }
  console.log("  Created versions for all projects");

  // ── 7. Custom Fields ──────────────────────────────────────────────────────
  const customFieldDefs = [
    {
      name: "Environment",
      fieldType: "select",
      description: "Target deployment environment",
      options: { choices: ["Development", "Staging", "Production"] },
    },
    {
      name: "Estimated Hours",
      fieldType: "number",
      description: "Estimated work hours",
      options: { min: 0, max: 1000, step: 0.5 },
    },
    {
      name: "Target Date",
      fieldType: "date",
      description: "Target completion date",
      options: null,
    },
    {
      name: "External Reference",
      fieldType: "text",
      description: "External ticket or reference number",
      options: null,
    },
    {
      name: "Affected Version",
      fieldType: "text",
      description: "Version where the issue was found",
      options: null,
    },
    {
      name: "Customer Impact",
      fieldType: "select",
      description: "Impact level on customers",
      options: { choices: ["None", "Low", "Medium", "High", "Critical"] },
    },
  ];

  const customFieldIds: string[] = [];
  for (const cf of customFieldDefs) {
    const field = await prisma.customField.upsert({
      where: { organizationId_name: { organizationId: org.id, name: cf.name } },
      update: {},
      create: {
        organizationId: org.id,
        name: cf.name,
        fieldType: cf.fieldType,
        description: cf.description,
        options: cf.options ?? undefined,
      },
    });
    customFieldIds.push(field.id);
  }
  console.log("  Created 6 custom fields");

  // Assign custom field values on some issues
  const demoProjectIssues = await prisma.issue.findMany({
    where: { organizationId: org.id, projectId: projects[0]!.id },
    take: 8,
    orderBy: { createdAt: "asc" },
  });

  const cfValues = [
    { fieldIdx: 0, value: "Production" },
    { fieldIdx: 0, value: "Staging" },
    { fieldIdx: 0, value: "Development" },
    { fieldIdx: 1, value: 16 },
    { fieldIdx: 1, value: 8 },
    { fieldIdx: 4, value: "1.0.0" },
    { fieldIdx: 5, value: "High" },
    { fieldIdx: 5, value: "Critical" },
  ];

  for (let i = 0; i < Math.min(cfValues.length, demoProjectIssues.length); i++) {
    const cv = cfValues[i]!;
    const fieldId = customFieldIds[cv.fieldIdx]!;
    const entityId = demoProjectIssues[i]!.id;
    await prisma.customFieldValue.upsert({
      where: { fieldId_entityId_entityType: { fieldId, entityId, entityType: "issue" } },
      update: { value: cv.value },
      create: {
        organizationId: org.id,
        fieldId,
        entityId,
        entityType: "issue",
        value: cv.value,
      },
    });
  }
  console.log("  Assigned custom field values to issues");

  // ── 8. SLA Configs & Instances ────────────────────────────────────────────
  const slaConfigDefs = [
    {
      name: "Response Time",
      metric: "first_response",
      targetDuration: 4 * 3600000, // 4h in ms
      startCondition: { event: "issue_created" },
      stopCondition: { event: "first_agent_comment" },
    },
    {
      name: "Resolution Time",
      metric: "resolution",
      targetDuration: 24 * 3600000, // 24h in ms
      startCondition: { event: "issue_created" },
      stopCondition: { statusCategory: "DONE" },
    },
    {
      name: "First Reply",
      metric: "first_reply",
      targetDuration: 1 * 3600000, // 1h in ms
      startCondition: { event: "issue_created" },
      stopCondition: { event: "first_comment" },
    },
  ];

  const slaConfigIds: string[] = [];
  for (const slaDef of slaConfigDefs) {
    const existing = await prisma.sLAConfig.findFirst({
      where: { organizationId: org.id, name: slaDef.name },
    });
    if (existing) {
      slaConfigIds.push(existing.id);
    } else {
      const sla = await prisma.sLAConfig.create({
        data: {
          organizationId: org.id,
          projectId: projects[0]!.id,
          name: slaDef.name,
          metric: slaDef.metric,
          targetDuration: slaDef.targetDuration,
          startCondition: slaDef.startCondition,
          stopCondition: slaDef.stopCondition,
          calendar: { timezone: "UTC", businessHours: { start: "09:00", end: "17:00" }, workDays: [1,2,3,4,5] },
          escalationRules: [{ threshold: 80, action: "notify", target: "project_lead" }],
        },
      });
      slaConfigIds.push(sla.id);
    }
  }
  console.log("  Created 3 SLA configs");

  // SLA instances on first 6 DEMO issues
  for (let i = 0; i < Math.min(6, demoProjectIssues.length); i++) {
    const issue = demoProjectIssues[i]!;
    const slaIdx = i % slaConfigIds.length;
    const slaConfigId = slaConfigIds[slaIdx]!;

    const exists = await prisma.sLAInstance.findFirst({
      where: { issueId: issue.id, slaConfigId },
    });
    if (exists) continue;

    const isCompleted = i < 2;
    await prisma.sLAInstance.create({
      data: {
        organizationId: org.id,
        issueId: issue.id,
        slaConfigId,
        status: isCompleted ? "completed" : "active",
        elapsedMs: isCompleted ? 2 * 3600000 : (i + 1) * 1800000,
        remainingMs: isCompleted ? null : slaConfigDefs[slaIdx]!.targetDuration - (i + 1) * 1800000,
        startedAt: issue.createdAt,
        completedAt: isCompleted ? new Date(issue.createdAt.getTime() + 2 * 3600000) : null,
      },
    });
  }
  console.log("  Created SLA instances on DEMO issues");

  // ── 9. Checklists ─────────────────────────────────────────────────────────
  const checklistDefs = [
    {
      title: "Deployment Checklist",
      items: [
        { text: "Run unit tests", isChecked: true },
        { text: "Run integration tests", isChecked: true },
        { text: "Update changelog", isChecked: false },
        { text: "Deploy to staging", isChecked: false },
        { text: "Smoke test on staging", isChecked: false },
        { text: "Deploy to production", isChecked: false },
      ],
    },
    {
      title: "Code Review Checklist",
      items: [
        { text: "No console.log statements", isChecked: true },
        { text: "TypeScript strict mode passes", isChecked: true },
        { text: "Unit test coverage > 80%", isChecked: false },
        { text: "Accessibility audit passed", isChecked: false },
      ],
    },
    {
      title: "Definition of Done",
      items: [
        { text: "Feature works as described in AC", isChecked: true },
        { text: "Tests written and passing", isChecked: true },
        { text: "PR reviewed and approved", isChecked: true },
        { text: "Documentation updated", isChecked: false },
        { text: "Deployed to staging", isChecked: false },
      ],
    },
    {
      title: "Bug Verification Steps",
      items: [
        { text: "Reproduce the bug on staging", isChecked: true },
        { text: "Identify root cause", isChecked: true },
        { text: "Write regression test", isChecked: false },
        { text: "Verify fix resolves the issue", isChecked: false },
      ],
    },
    {
      title: "Security Review",
      items: [
        { text: "Input validation on all endpoints", isChecked: true },
        { text: "SQL injection prevention verified", isChecked: true },
        { text: "Authentication checks in place", isChecked: true },
        { text: "Rate limiting configured", isChecked: false },
        { text: "Sensitive data not logged", isChecked: false },
      ],
    },
  ];

  for (let i = 0; i < Math.min(checklistDefs.length, demoProjectIssues.length); i++) {
    const issue = demoProjectIssues[i]!;
    const def = checklistDefs[i]!;

    const existingChecklist = await prisma.checklist.findFirst({
      where: { organizationId: org.id, issueId: issue.id },
    });
    if (existingChecklist) continue;

    const checklist = await prisma.checklist.create({
      data: {
        organizationId: org.id,
        issueId: issue.id,
        title: def.title,
        position: 0,
      },
    });

    for (let j = 0; j < def.items.length; j++) {
      await prisma.checklistItem.create({
        data: {
          checklistId: checklist.id,
          text: def.items[j]!.text,
          isChecked: def.items[j]!.isChecked,
          position: j,
          assigneeId: j % 2 === 0 ? mikeId : sarahId,
        },
      });
    }
  }
  console.log("  Created 5 checklists with items");

  // ── 10. Dashboards & Widgets ──────────────────────────────────────────────
  const dashboardDefs = [
    {
      name: "Team Dashboard",
      isShared: true,
      widgets: [
        { widgetType: "issue_count_by_status", title: "Issues by Status", config: { projectKey: "DEMO" }, position: { x: 0, y: 0, w: 6, h: 4 } },
        { widgetType: "issue_count_by_priority", title: "Issues by Priority", config: { projectKey: "DEMO" }, position: { x: 6, y: 0, w: 6, h: 4 } },
        { widgetType: "burndown", title: "Sprint Burndown", config: { projectKey: "ENG", sprintName: "Sprint 1" }, position: { x: 0, y: 4, w: 6, h: 4 } },
        { widgetType: "activity_stream", title: "Recent Activity", config: { days: 7 }, position: { x: 6, y: 4, w: 6, h: 4 } },
        { widgetType: "created_vs_resolved", title: "Created vs Resolved (30d)", config: { days: 30 }, position: { x: 0, y: 8, w: 12, h: 4 } },
        { widgetType: "pie_by_assignee", title: "Workload Distribution", config: { projectKey: "DEMO" }, position: { x: 0, y: 12, w: 6, h: 4 } },
      ],
    },
    {
      name: "My Work",
      isShared: false,
      widgets: [
        { widgetType: "assigned_to_me", title: "Assigned to Me", config: {}, position: { x: 0, y: 0, w: 12, h: 4 } },
        { widgetType: "watched_issues", title: "Watched Issues", config: {}, position: { x: 0, y: 4, w: 6, h: 4 } },
        { widgetType: "overdue_issues", title: "Overdue Items", config: {}, position: { x: 6, y: 4, w: 6, h: 4 } },
        { widgetType: "my_activity", title: "My Recent Activity", config: { days: 7 }, position: { x: 0, y: 8, w: 12, h: 4 } },
      ],
    },
  ];

  for (const dd of dashboardDefs) {
    const existing = await prisma.dashboard.findFirst({
      where: { organizationId: org.id, name: dd.name },
    });
    if (existing) continue;

    const dashboard = await prisma.dashboard.create({
      data: {
        organizationId: org.id,
        name: dd.name,
        ownerId: frankId,
        isShared: dd.isShared,
        layout: dd.widgets.map((w) => w.position),
      },
    });

    for (const widget of dd.widgets) {
      await prisma.dashboardWidget.create({
        data: {
          dashboardId: dashboard.id,
          widgetType: widget.widgetType,
          title: widget.title,
          config: widget.config,
          position: widget.position,
        },
      });
    }
  }
  console.log("  Created 2 dashboards with widgets");

  // ── 11. Queues ────────────────────────────────────────────────────────────
  const queueDefs = [
    { name: "Support Triage", filterQuery: 'project = "DEMO" AND status = "To Do" AND type = "Bug"', sortBy: "priority" },
    { name: "Bug Backlog", filterQuery: 'type = "Bug" AND status != "Done"', sortBy: "createdDate" },
    { name: "Feature Requests", filterQuery: 'type = "Story" AND status = "To Do"', sortBy: "votes" },
  ];

  for (const qd of queueDefs) {
    const existing = await prisma.queue.findFirst({
      where: { organizationId: org.id, name: qd.name },
    });
    if (existing) continue;

    await prisma.queue.create({
      data: {
        organizationId: org.id,
        projectId: projects[0]!.id,
        name: qd.name,
        filterQuery: qd.filterQuery,
        sortBy: qd.sortBy,
        assignmentRule: { type: "round_robin", members: [frankId, mikeId, sarahId] },
      },
    });
  }
  console.log("  Created 3 queues");

  // ── 12. Saved Filters ─────────────────────────────────────────────────────
  const filterDefs = [
    { name: "My Open Issues", aql: "assignee = currentUser() AND statusCategory != Done", owner: frankId, starred: true },
    { name: "Critical Bugs", aql: 'type = Bug AND priority in (Highest, High) AND statusCategory != Done', owner: frankId, starred: true },
    { name: "Sprint Backlog", aql: 'sprint = "Sprint 1" AND statusCategory = "To Do"', owner: sarahId, starred: false },
    { name: "Unassigned Issues", aql: "assignee = EMPTY AND statusCategory != Done", owner: sarahId, starred: false },
    { name: "Recently Created", aql: "createdDate >= -7d ORDER BY createdDate DESC", owner: mikeId, starred: true },
  ];

  for (const fd of filterDefs) {
    const existing = await prisma.filter.findFirst({
      where: { organizationId: org.id, name: fd.name, ownerId: fd.owner },
    });
    if (existing) continue;

    await prisma.filter.create({
      data: {
        organizationId: org.id,
        ownerId: fd.owner,
        name: fd.name,
        aql: fd.aql,
        isStarred: fd.starred,
        sharedWith: fd.starred ? ["organization"] : [],
      },
    });
  }
  console.log("  Created 5 saved filters");

  // ── 13. Automation Rules ──────────────────────────────────────────────────
  const automationDefs = [
    {
      name: "Auto-assign on Create",
      description: "When an issue is created without an assignee, assign it to the project lead.",
      trigger: { type: "issue_created", conditions: [{ field: "assignee", operator: "is_empty" }] },
      actions: [{ type: "set_field", field: "assignee", value: "project_lead" }],
      enabled: true,
    },
    {
      name: "Auto-transition on Comment",
      description: "When a comment is added to a 'Waiting for Customer' issue, move it to 'In Progress'.",
      trigger: { type: "comment_added" },
      conditions: [{ field: "status", operator: "equals", value: "Waiting for Customer" }],
      actions: [{ type: "transition", toStatus: "In Progress" }],
      enabled: true,
    },
    {
      name: "Notify on High Priority",
      description: "Send notification to project lead when a Highest or High priority issue is created.",
      trigger: { type: "issue_created", conditions: [{ field: "priority", operator: "in", value: ["Highest", "High"] }] },
      actions: [{ type: "send_notification", to: "project_lead", template: "high_priority_created" }],
      enabled: true,
    },
  ];

  for (const ad of automationDefs) {
    const existing = await prisma.automationRule.findFirst({
      where: { organizationId: org.id, name: ad.name },
    });
    if (existing) continue;

    await prisma.automationRule.create({
      data: {
        organizationId: org.id,
        projectId: projects[0]!.id,
        name: ad.name,
        description: ad.description,
        trigger: ad.trigger,
        conditions: ad.conditions ?? [],
        actions: ad.actions,
        enabled: ad.enabled,
        executionCount: Math.floor(Math.random() * 50),
      },
    });
  }
  console.log("  Created 3 automation rules");

  // ── 14. Asset Types & Assets (CMDB) ───────────────────────────────────────
  const assetTypeDefs = [
    { name: "Laptop", icon: "laptop", color: "#4BADE8", description: "Employee laptops and workstations" },
    { name: "Server", icon: "server", color: "#904EE2", description: "Physical and virtual servers" },
    { name: "Software License", icon: "key", color: "#63BA3C", description: "Software licenses and subscriptions" },
  ];

  const assetTypeIds: Record<string, string> = {};

  for (const atDef of assetTypeDefs) {
    const at = await prisma.assetType.upsert({
      where: { organizationId_name: { organizationId: org.id, name: atDef.name } },
      update: {},
      create: {
        organizationId: org.id,
        name: atDef.name,
        icon: atDef.icon,
        color: atDef.color,
        description: atDef.description,
      },
    });
    assetTypeIds[atDef.name] = at.id;
  }
  console.log("  Created 3 asset types");

  const assetDefs = [
    { tag: "ASSET-001", name: "MacBook Pro 16\" - Frank", type: "Laptop", status: "in_use", assignee: frankId, attrs: { model: "MacBook Pro 16\"", serial: "C02XR1ZTJG5H", os: "macOS 14.3" } },
    { tag: "ASSET-002", name: "MacBook Pro 14\" - Sarah", type: "Laptop", status: "in_use", assignee: sarahId, attrs: { model: "MacBook Pro 14\"", serial: "C02YR2ZTJG5K", os: "macOS 14.2" } },
    { tag: "ASSET-003", name: "ThinkPad X1 Carbon - Mike", type: "Laptop", status: "in_use", assignee: mikeId, attrs: { model: "ThinkPad X1 Carbon Gen 11", serial: "PF3N9HKX", os: "Ubuntu 22.04" } },
    { tag: "ASSET-004", name: "MacBook Air M2 - Lisa", type: "Laptop", status: "in_use", assignee: lisaId, attrs: { model: "MacBook Air M2", serial: "C02ZR3ZTJG5M", os: "macOS 14.1" } },
    { tag: "ASSET-005", name: "MacBook Pro 16\" (Spare)", type: "Laptop", status: "received", assignee: null, attrs: { model: "MacBook Pro 16\"", serial: "C02AR4ZTJG5N", os: "macOS 14.3" } },
    { tag: "ASSET-006", name: "prod-web-01", type: "Server", status: "in_use", assignee: null, attrs: { cpu: "8 vCPU", ram: "32 GB", provider: "Azure", region: "eastus2" } },
    { tag: "ASSET-007", name: "prod-db-01", type: "Server", status: "in_use", assignee: null, attrs: { cpu: "16 vCPU", ram: "64 GB", provider: "Azure", region: "eastus2" } },
    { tag: "ASSET-008", name: "staging-web-01", type: "Server", status: "in_use", assignee: null, attrs: { cpu: "4 vCPU", ram: "16 GB", provider: "Azure", region: "eastus2" } },
    { tag: "ASSET-009", name: "JetBrains All Products Pack", type: "Software License", status: "in_use", assignee: null, attrs: { vendor: "JetBrains", seats: 10, expiry: "2026-12-31" } },
    { tag: "ASSET-010", name: "Figma Enterprise", type: "Software License", status: "in_use", assignee: null, attrs: { vendor: "Figma", seats: 5, expiry: "2026-06-30" } },
  ];

  for (const ad of assetDefs) {
    const existing = await prisma.asset.findFirst({ where: { assetTag: ad.tag } });
    if (existing) continue;

    await prisma.asset.create({
      data: {
        organizationId: org.id,
        assetTypeId: assetTypeIds[ad.type]!,
        assetTag: ad.tag,
        name: ad.name,
        status: ad.status,
        assigneeId: ad.assignee,
        attributes: ad.attrs,
      },
    });
  }
  console.log("  Created 10 assets");

  // ── 15. Expanded Time Tracking ────────────────────────────────────────────
  // Add more time logs across multiple users and issues
  const allProjectIssues: Array<{ id: string; projectKey: string }> = [];
  for (const project of projects) {
    const issues = await prisma.issue.findMany({
      where: { organizationId: org.id, projectId: project.id },
      take: 5,
      orderBy: { createdAt: "asc" },
    });
    for (const issue of issues) {
      allProjectIssues.push({ id: issue.id, projectKey: project.key });
    }
  }

  const existingLogCount = await prisma.timeLog.count({ where: { organizationId: org.id } });

  if (existingLogCount < 10) {
    const today = new Date();
    const timeLogDefs = [
      { issueIdx: 0, userId: mikeId, daysAgo: 5, duration: 7200, desc: "Backend API implementation" },
      { issueIdx: 0, userId: mikeId, daysAgo: 4, duration: 5400, desc: "Added error handling and tests" },
      { issueIdx: 1, userId: sarahId, daysAgo: 4, duration: 3600, desc: "Wireframe review and feedback" },
      { issueIdx: 1, userId: sarahId, daysAgo: 3, duration: 7200, desc: "Updated designs based on feedback" },
      { issueIdx: 2, userId: frankId, daysAgo: 3, duration: 10800, desc: "Auth flow implementation" },
      { issueIdx: 2, userId: frankId, daysAgo: 2, duration: 5400, desc: "OAuth provider configuration" },
      { issueIdx: 3, userId: mikeId, daysAgo: 2, duration: 3600, desc: "Dark mode CSS variables setup" },
      { issueIdx: 4, userId: sarahId, daysAgo: 1, duration: 7200, desc: "Documentation writing" },
      { issueIdx: 5, userId: frankId, daysAgo: 1, duration: 5400, desc: "Database refactoring analysis" },
      { issueIdx: 6, userId: mikeId, daysAgo: 0, duration: 3600, desc: "Redis cache layer research" },
      { issueIdx: 7, userId: sarahId, daysAgo: 0, duration: 1800, desc: "Standup and sprint planning" },
      { issueIdx: 8, userId: frankId, daysAgo: 0, duration: 7200, desc: "WebSocket handler debugging" },
      { issueIdx: 9, userId: mikeId, daysAgo: 6, duration: 5400, desc: "Staging environment provisioning" },
      { issueIdx: 10, userId: sarahId, daysAgo: 5, duration: 3600, desc: "SSL certificate renewal" },
      { issueIdx: 11, userId: frankId, daysAgo: 4, duration: 7200, desc: "Monitoring alert configuration" },
    ];

    for (const tl of timeLogDefs) {
      if (tl.issueIdx >= allProjectIssues.length) continue;
      const entry = allProjectIssues[tl.issueIdx]!;
      const date = new Date(today.getTime() - tl.daysAgo * 86400000);
      await prisma.timeLog.create({
        data: {
          organizationId: org.id,
          issueId: entry.id,
          userId: tl.userId,
          date,
          duration: tl.duration,
          description: tl.desc,
          billable: tl.duration > 3600,
        },
      });
    }
    console.log("  Created 15+ additional time log entries");
  }

  // Timesheet
  const existingTimesheet = await prisma.timesheet.findFirst({
    where: { organizationId: org.id, userId: frankId },
  });
  if (!existingTimesheet) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 4); // Friday

    await prisma.timesheet.create({
      data: {
        organizationId: org.id,
        userId: frankId,
        periodStart: weekStart,
        periodEnd: weekEnd,
        status: "submitted",
        submittedAt: new Date(),
      },
    });
    console.log("  Created timesheet record");
  }

  // ── 16. Notifications ─────────────────────────────────────────────────────
  const notifPrefEvents = [
    "issue_assigned",
    "issue_commented",
    "issue_status_changed",
    "issue_mentioned",
    "sprint_started",
  ];

  for (const userId of [frankId, sarahId, mikeId]) {
    for (const event of notifPrefEvents) {
      await prisma.notificationPreference.upsert({
        where: { userId_projectId_event: { userId, projectId: null as unknown as string, event } },
        update: {},
        create: {
          organizationId: org.id,
          userId,
          event,
          channels: event === "issue_mentioned" ? ["in_app", "email"] : ["in_app"],
          digestFrequency: "instant",
        },
      }).catch(() => {
        // Unique constraint may trigger if null projectId already exists; ignore
      });
    }
  }
  console.log("  Created notification preferences");

  // Notification records
  const existingNotifRecords = await prisma.notificationRecord.count({
    where: { organizationId: org.id },
  });
  if (existingNotifRecords === 0 && demoProjectIssues.length > 0) {
    const notifDefs = [
      { userId: mikeId, event: "issue_assigned", title: "Issue assigned to you", body: `DEMO-1: Set up CI/CD pipeline has been assigned to you by Frank Admin.`, issueId: demoProjectIssues[0]?.id, isRead: true },
      { userId: sarahId, event: "issue_commented", title: "New comment on your issue", body: `Frank Admin commented on DEMO-2: Design landing page wireframes.`, issueId: demoProjectIssues[1]?.id, isRead: true },
      { userId: frankId, event: "issue_status_changed", title: "Issue status changed", body: `DEMO-3: Implement user authentication flow moved to In Progress.`, issueId: demoProjectIssues[2]?.id, isRead: false },
      { userId: mikeId, event: "issue_mentioned", title: "You were mentioned", body: `Sarah PM mentioned you in a comment on DEMO-4: Add dark mode support.`, issueId: demoProjectIssues[3]?.id, isRead: false },
      { userId: frankId, event: "issue_assigned", title: "Issue assigned to you", body: `DEMO-5: Write API documentation has been assigned to you.`, issueId: demoProjectIssues[4]?.id, isRead: false },
      { userId: sarahId, event: "sprint_started", title: "Sprint started", body: `Sprint 1 has started for project ENG. 3 issues are in the sprint.`, issueId: null, isRead: true },
      { userId: mikeId, event: "issue_status_changed", title: "Issue resolved", body: `DEMO-1: Set up CI/CD pipeline has been marked as Done.`, issueId: demoProjectIssues[0]?.id, isRead: false },
      { userId: frankId, event: "issue_commented", title: "New comment", body: `Mike Developer commented on DEMO-3: "Updated the PR with the requested changes."`, issueId: demoProjectIssues[2]?.id, isRead: false },
    ];

    for (let i = 0; i < notifDefs.length; i++) {
      const nd = notifDefs[i]!;
      await prisma.notificationRecord.create({
        data: {
          organizationId: org.id,
          userId: nd.userId,
          event: nd.event,
          issueId: nd.issueId ?? undefined,
          channel: "in_app",
          title: nd.title,
          body: nd.body,
          isRead: nd.isRead,
          readAt: nd.isRead ? new Date() : null,
          sentAt: new Date(Date.now() - (notifDefs.length - i) * 3600000),
        },
      });
    }
    console.log("  Created 8 notification records");
  }

  // ── 17. Form Templates ────────────────────────────────────────────────────
  const formTemplateDefs = [
    {
      name: "Bug Report Form",
      description: "Standard form for reporting bugs with reproduction steps",
      config: {
        sections: [
          {
            title: "Bug Details",
            fields: [
              { name: "summary", type: "text", label: "Summary", required: true },
              { name: "description", type: "textarea", label: "Description", required: true },
              { name: "steps_to_reproduce", type: "textarea", label: "Steps to Reproduce", required: true },
              { name: "expected_result", type: "textarea", label: "Expected Result", required: true },
              { name: "actual_result", type: "textarea", label: "Actual Result", required: true },
            ],
          },
          {
            title: "Environment",
            fields: [
              { name: "environment", type: "select", label: "Environment", options: ["Development", "Staging", "Production"], required: true },
              { name: "browser", type: "select", label: "Browser", options: ["Chrome", "Firefox", "Safari", "Edge"], required: false },
              { name: "os", type: "select", label: "Operating System", options: ["Windows", "macOS", "Linux", "iOS", "Android"], required: false },
            ],
          },
        ],
      },
    },
    {
      name: "Feature Request Form",
      description: "Form for submitting new feature requests with business justification",
      config: {
        sections: [
          {
            title: "Feature Details",
            fields: [
              { name: "title", type: "text", label: "Feature Title", required: true },
              { name: "description", type: "textarea", label: "Description", required: true },
              { name: "use_case", type: "textarea", label: "Use Case / User Story", required: true },
              { name: "business_value", type: "select", label: "Business Value", options: ["Low", "Medium", "High", "Critical"], required: true },
            ],
          },
          {
            title: "Additional Context",
            fields: [
              { name: "alternatives", type: "textarea", label: "Alternatives Considered", required: false },
              { name: "deadline", type: "date", label: "Desired Deadline", required: false },
            ],
          },
        ],
      },
    },
  ];

  for (const ft of formTemplateDefs) {
    await prisma.formTemplate.upsert({
      where: { organizationId_name: { organizationId: org.id, name: ft.name } },
      update: {},
      create: {
        organizationId: org.id,
        name: ft.name,
        description: ft.description,
        config: ft.config,
        isActive: true,
      },
    });
  }
  console.log("  Created 2 form templates");

  // ── 18. Saved Reports ─────────────────────────────────────────────────────
  const reportDefs = [
    {
      name: "Sprint Velocity",
      description: "Tracks story points completed per sprint over the last 6 sprints",
      reportType: "velocity",
      chartType: "bar",
      dimensions: [{ field: "sprint", label: "Sprint" }],
      measures: [{ field: "storyPoints", aggregation: "sum", label: "Story Points Completed" }],
      filters: { projectKey: "ENG", statusCategory: "DONE" },
      isShared: true,
    },
    {
      name: "Issue Aging",
      description: "Shows how long open issues have been in their current status",
      reportType: "aging",
      chartType: "bar",
      dimensions: [{ field: "ageRange", label: "Age Range" }],
      measures: [{ field: "count", aggregation: "count", label: "Number of Issues" }],
      filters: { statusCategory: { not: "DONE" } },
      isShared: true,
    },
  ];

  for (const rd of reportDefs) {
    const existing = await prisma.savedReport.findFirst({
      where: { organizationId: org.id, name: rd.name },
    });
    if (existing) continue;

    await prisma.savedReport.create({
      data: {
        organizationId: org.id,
        name: rd.name,
        description: rd.description,
        reportType: rd.reportType,
        chartType: rd.chartType,
        dimensions: rd.dimensions,
        measures: rd.measures,
        filters: rd.filters,
        isShared: rd.isShared,
        createdBy: frankId,
      },
    });
  }
  console.log("  Created 2 saved reports");

  // ── 19. Retrospectives ────────────────────────────────────────────────────
  if (engProject) {
    const existingRetro = await prisma.retrospective.findFirst({
      where: { organizationId: org.id, projectId: engProject.id },
    });
    if (!existingRetro) {
      const retro = await prisma.retrospective.create({
        data: {
          organizationId: org.id,
          projectId: engProject.id,
          name: "Sprint 1 Retrospective",
          status: "active",
          categories: ["Went Well", "To Improve", "Action Items"],
        },
      });

      const retroCards = [
        { category: "Went Well", text: "Great collaboration between frontend and backend teams this sprint.", author: frankId, votes: 4 },
        { category: "Went Well", text: "CI/CD pipeline is much faster after the optimization.", author: mikeId, votes: 3 },
        { category: "Went Well", text: "Code review turnaround time improved significantly.", author: sarahId, votes: 5 },
        { category: "To Improve", text: "Too many context switches - need to limit WIP.", author: mikeId, votes: 3 },
        { category: "To Improve", text: "Sprint planning meetings are running too long (2h+).", author: sarahId, votes: 4 },
        { category: "To Improve", text: "Test coverage on the API layer needs improvement.", author: frankId, votes: 2 },
        { category: "Action Items", text: "Set WIP limit to 3 per developer on the board.", author: sarahId, votes: 5 },
        { category: "Action Items", text: "Timeblock sprint planning to 1 hour max.", author: frankId, votes: 4 },
        { category: "Action Items", text: "Add API integration tests to CI pipeline by next sprint.", author: mikeId, votes: 3 },
      ];

      for (const card of retroCards) {
        await prisma.retroCard.create({
          data: {
            retrospectiveId: retro.id,
            authorId: card.author,
            category: card.category,
            text: card.text,
            votes: card.votes,
          },
        });
      }
      console.log("  Created retrospective with 9 cards");
    }
  }

  // ── 20. Test Management ───────────────────────────────────────────────────
  const existingTestSuite = await prisma.testSuite.findFirst({
    where: { organizationId: org.id, name: "Authentication Tests" },
  });
  if (!existingTestSuite) {
    const testSuite = await prisma.testSuite.create({
      data: {
        organizationId: org.id,
        name: "Authentication Tests",
        description: "End-to-end tests for the authentication flow",
      },
    });

    const testCaseDefs = [
      {
        title: "Login with valid credentials",
        description: "Verify user can log in with correct email and password",
        preconditions: "User account exists with email test@ordolix.local",
        steps: [
          { step: 1, action: "Navigate to /login", expected: "Login page loads" },
          { step: 2, action: "Enter valid email", expected: "Email field populated" },
          { step: 3, action: "Enter valid password", expected: "Password field populated" },
          { step: 4, action: "Click Sign In", expected: "Redirected to dashboard" },
        ],
        expectedResult: "User is logged in and redirected to the dashboard",
        priority: "high",
        status: "approved",
      },
      {
        title: "Login with invalid password",
        description: "Verify error message for wrong password",
        preconditions: "User account exists",
        steps: [
          { step: 1, action: "Navigate to /login", expected: "Login page loads" },
          { step: 2, action: "Enter valid email", expected: "Email field populated" },
          { step: 3, action: "Enter wrong password", expected: "Password field populated" },
          { step: 4, action: "Click Sign In", expected: "Error message shown" },
        ],
        expectedResult: "Error message: 'Invalid email or password'",
        priority: "high",
        status: "approved",
      },
      {
        title: "Password reset flow",
        description: "Verify complete password reset email flow",
        preconditions: "User account exists with verified email",
        steps: [
          { step: 1, action: "Click 'Forgot Password'", expected: "Reset form shown" },
          { step: 2, action: "Enter email and submit", expected: "Confirmation message" },
          { step: 3, action: "Click link in email", expected: "New password form" },
          { step: 4, action: "Enter new password and confirm", expected: "Success message" },
        ],
        expectedResult: "Password is changed and user can log in with new password",
        priority: "medium",
        status: "draft",
      },
    ];

    const testCaseIds: string[] = [];
    for (const tc of testCaseDefs) {
      const testCase = await prisma.testCase.create({
        data: {
          organizationId: org.id,
          testSuiteId: testSuite.id,
          title: tc.title,
          description: tc.description,
          preconditions: tc.preconditions,
          steps: tc.steps,
          expectedResult: tc.expectedResult,
          priority: tc.priority,
          status: tc.status,
        },
      });
      testCaseIds.push(testCase.id);
    }

    // Test Cycle
    const testCycle = await prisma.testCycle.create({
      data: {
        organizationId: org.id,
        name: "Release 1.0 Test Cycle",
        description: "Full regression test cycle for v1.0 release",
        status: "in_progress",
        plannedStart: new Date(),
        plannedEnd: new Date(Date.now() + 7 * 86400000),
      },
    });

    // Test Run
    const testRun = await prisma.testRun.create({
      data: {
        organizationId: org.id,
        name: "Auth Flow Test Run",
        status: "in_progress",
        executedBy: mikeId,
        testCycleId: testCycle.id,
        startedAt: new Date(),
      },
    });

    // Test Results
    const resultStatuses = ["passed", "passed", "blocked"];
    for (let i = 0; i < testCaseIds.length; i++) {
      await prisma.testResult.create({
        data: {
          testRunId: testRun.id,
          testCaseId: testCaseIds[i]!,
          status: resultStatuses[i]!,
          comment: resultStatuses[i] === "passed" ? "All assertions passed" : "Blocked by email service outage",
          duration: (i + 1) * 15000,
        },
      });
    }
    console.log("  Created test suite, 3 test cases, test cycle, test run, and results");
  }

  // ── 21. Incidents ─────────────────────────────────────────────────────────
  const itProject = projects.find((p) => p.key === "IT");
  if (itProject) {
    const itIssues = await prisma.issue.findMany({
      where: { organizationId: org.id, projectId: itProject.id },
      take: 2,
      orderBy: { createdAt: "asc" },
    });

    const existingIncident = await prisma.incident.findFirst({
      where: { organizationId: org.id },
    });

    if (!existingIncident && itIssues.length > 0) {
      await prisma.incident.create({
        data: {
          organizationId: org.id,
          issueId: itIssues[0]!.id,
          severity: "SEV-2",
          timeline: [
            { time: new Date(Date.now() - 7200000).toISOString(), event: "Incident detected", author: "Monitoring System" },
            { time: new Date(Date.now() - 6600000).toISOString(), event: "On-call engineer paged", author: "PagerDuty" },
            { time: new Date(Date.now() - 6000000).toISOString(), event: "Investigation started", author: "Frank Admin" },
            { time: new Date(Date.now() - 3600000).toISOString(), event: "Root cause identified: expired SSL cert", author: "Frank Admin" },
            { time: new Date(Date.now() - 1800000).toISOString(), event: "Fix deployed, monitoring recovery", author: "Mike Developer" },
          ],
          communications: [
            { channel: "slack", message: "Investigating connectivity issues to production API", sentAt: new Date(Date.now() - 6000000).toISOString() },
            { channel: "status_page", message: "We are aware of connectivity issues and are investigating", sentAt: new Date(Date.now() - 5400000).toISOString() },
            { channel: "status_page", message: "Root cause identified. Fix being deployed.", sentAt: new Date(Date.now() - 3600000).toISOString() },
          ],
          statusPageUpdate: "We experienced connectivity issues due to an expired SSL certificate. The certificate has been renewed and services have been restored. We are implementing automated certificate renewal to prevent recurrence.",
          startedAt: new Date(Date.now() - 7200000),
          resolvedAt: new Date(Date.now() - 1800000),
        },
      });
      console.log("  Created 1 incident record");
    }
  }

  // ── 22. Approvals ─────────────────────────────────────────────────────────
  // Add approval on a high-priority issue
  if (demoProjectIssues.length > 2) {
    const existingApproval = await prisma.approval.findFirst({
      where: { organizationId: org.id },
    });
    if (!existingApproval) {
      const highPriorityIssue = demoProjectIssues[2]!; // "Implement user authentication flow"
      await prisma.approval.create({
        data: {
          organizationId: org.id,
          issueId: highPriorityIssue.id,
          approverId: frankId,
          status: "approved",
          decision: "approved",
          comment: "Approved - this is critical for the v1.0 launch. Proceed with implementation.",
          decidedAt: new Date(Date.now() - 86400000),
        },
      });

      // Add a pending approval from Sarah
      await prisma.approval.create({
        data: {
          organizationId: org.id,
          issueId: highPriorityIssue.id,
          approverId: sarahId,
          status: "pending",
          expiresAt: new Date(Date.now() + 3 * 86400000),
        },
      });
      console.log("  Created 2 approval records");
    }
  }

  // ── 23. Votes & Watchers ──────────────────────────────────────────────────
  if (demoProjectIssues.length > 4) {
    for (let i = 0; i < Math.min(5, demoProjectIssues.length); i++) {
      const issue = demoProjectIssues[i]!;
      const voters = assignees.slice(0, i + 1); // More popular issues get more votes
      for (const userId of voters) {
        await prisma.vote.upsert({
          where: { issueId_userId: { issueId: issue.id, userId } },
          update: {},
          create: { issueId: issue.id, userId },
        });
      }
      // Add watchers
      const watchers = assignees.slice(0, Math.min(3, i + 2));
      for (const userId of watchers) {
        await prisma.issueWatcher.upsert({
          where: { issueId_userId: { issueId: issue.id, userId } },
          update: {},
          create: { issueId: issue.id, userId },
        });
      }
    }
    console.log("  Created votes and watchers on issues");
  }

  // ── 24. Issue Links ───────────────────────────────────────────────────────
  if (demoProjectIssues.length > 6) {
    const linkDefs = [
      { from: 0, to: 1, type: "relates" },
      { from: 2, to: 3, type: "blocks" },
      { from: 0, to: 4, type: "duplicates" },
    ];
    for (const ld of linkDefs) {
      const fromId = demoProjectIssues[ld.from]!.id;
      const toId = demoProjectIssues[ld.to]!.id;
      const exists = await prisma.issueLink.findFirst({
        where: { linkType: ld.type, fromIssueId: fromId, toIssueId: toId },
      });
      if (!exists) {
        await prisma.issueLink.create({
          data: { linkType: ld.type, fromIssueId: fromId, toIssueId: toId },
        });
      }
    }
    console.log("  Created issue links");
  }

  // ── 25. Survey Templates & Responses (CSAT) ──────────────────────────────
  const existingSurveyTemplate = await prisma.surveyTemplate.findFirst({
    where: { organizationId: org.id, name: "Post-Resolution CSAT" },
  });

  let surveyTemplateId: string;
  if (existingSurveyTemplate) {
    surveyTemplateId = existingSurveyTemplate.id;
  } else {
    const surveyTemplate = await prisma.surveyTemplate.create({
      data: {
        organizationId: org.id,
        name: "Post-Resolution CSAT",
        description: "Customer satisfaction survey sent after issue resolution",
        trigger: "issue_resolved",
        isActive: true,
        delayMinutes: 30,
        questions: [
          { id: "q1", type: "star_rating", text: "How satisfied are you with the resolution?", required: true },
          { id: "q2", type: "text", text: "Any additional feedback?", required: false },
        ],
      },
    });
    surveyTemplateId = surveyTemplate.id;
    console.log("  Created survey template: Post-Resolution CSAT");
  }

  // Create 10 survey responses
  const existingResponses = await prisma.surveyResponse.count({
    where: { organizationId: org.id, templateId: surveyTemplateId },
  });
  if (existingResponses === 0) {
    const surveyRespondents = [
      { email: "customer1@example.com", star: 5, comment: "Fast and thorough resolution. Very happy!" },
      { email: "customer2@example.com", star: 4, comment: "Good support, just took a bit longer than expected." },
      { email: "customer3@example.com", star: 5, comment: null },
      { email: "customer4@example.com", star: 3, comment: "Issue was resolved but communication could be better." },
      { email: "customer5@example.com", star: 5, comment: "Excellent! The team went above and beyond." },
      { email: "customer6@example.com", star: 4, comment: null },
      { email: "customer7@example.com", star: 4, comment: "Quick turnaround. Thanks!" },
      { email: "customer8@example.com", star: 3, comment: "Had to follow up twice before getting a response." },
      { email: "customer9@example.com", star: 5, comment: "Perfect. Exactly what I needed." },
      { email: "customer10@example.com", star: 4, comment: "Solid support experience overall." },
    ];

    for (let i = 0; i < surveyRespondents.length; i++) {
      const resp = surveyRespondents[i]!;
      const issueId = i < demoProjectIssues.length ? demoProjectIssues[i]?.id : undefined;
      await prisma.surveyResponse.create({
        data: {
          organizationId: org.id,
          templateId: surveyTemplateId,
          issueId: issueId ?? null,
          respondentEmail: resp.email,
          starRating: resp.star,
          answers: { q1: resp.star, q2: resp.comment ?? "" },
          comment: resp.comment,
          submittedAt: new Date(Date.now() - (surveyRespondents.length - i) * 86400000),
        },
      });
    }
    console.log("  Created 10 survey responses");
  }

  // ── 26. Scripts (ScriptRunner) ────────────────────────────────────────────
  const scriptDefs = [
    {
      name: "Auto-label High Priority",
      description: "Automatically adds 'urgent' label to Highest priority issues",
      triggerType: "issue_updated",
      code: `// Auto-label script\nif (issue.priority === "Highest" && !issue.labels.includes("urgent")) {\n  issue.labels.push("urgent");\n  await issue.save();\n  return { modified: true };\n}\nreturn { modified: false };`,
    },
    {
      name: "Calculate Sprint Health",
      description: "Calculates sprint burndown health score based on remaining points vs time",
      triggerType: "scheduled",
      code: `// Sprint health calculator\nconst sprint = await getActiveSprint();\nconst totalDays = daysBetween(sprint.startDate, sprint.endDate);\nconst elapsedDays = daysBetween(sprint.startDate, new Date());\nconst remainingPoints = sprint.issues.filter(i => i.status !== "Done").reduce((sum, i) => sum + (i.storyPoints || 0), 0);\nconst totalPoints = sprint.issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);\nconst expectedProgress = elapsedDays / totalDays;\nconst actualProgress = 1 - (remainingPoints / totalPoints);\nreturn { health: actualProgress >= expectedProgress ? "green" : actualProgress >= expectedProgress * 0.7 ? "yellow" : "red" };`,
    },
  ];

  for (const sd of scriptDefs) {
    await prisma.script.upsert({
      where: { organizationId_name: { organizationId: org.id, name: sd.name } },
      update: {},
      create: {
        organizationId: org.id,
        name: sd.name,
        description: sd.description,
        triggerType: sd.triggerType,
        code: sd.code,
        isEnabled: true,
      },
    });
  }
  console.log("  Created 2 scripts");

  // ── 27. Plans & Roadmaps ──────────────────────────────────────────────────
  const existingPlan = await prisma.plan.findFirst({
    where: { organizationId: org.id, name: "Q1 2026 Roadmap" },
  });
  if (!existingPlan) {
    const plan = await prisma.plan.create({
      data: {
        organizationId: org.id,
        name: "Q1 2026 Roadmap",
        description: "Cross-project roadmap for Q1 2026 deliverables",
        ownerId: frankId,
        isShared: true,
        status: "active",
      },
    });

    // Scope all projects
    for (let i = 0; i < projects.length; i++) {
      await prisma.planIssueScope.create({
        data: { planId: plan.id, projectId: projects[i]!.id, position: i },
      });
    }

    // Scenarios
    await prisma.planScenario.create({
      data: { planId: plan.id, name: "Baseline", isDraft: false, isBaseline: true, overrides: [] },
    });
    await prisma.planScenario.create({
      data: { planId: plan.id, name: "Aggressive Timeline", isDraft: true, isBaseline: false, overrides: [{ type: "compress_timeline", factor: 0.75 }] },
    });
    console.log("  Created plan with scopes and scenarios");
  }

  // ── 28. Structure Views ───────────────────────────────────────────────────
  const existingStructure = await prisma.structureView.findFirst({
    where: { organizationId: org.id, name: "Epic Hierarchy" },
  });
  if (!existingStructure) {
    await prisma.structureView.create({
      data: {
        organizationId: org.id,
        ownerId: frankId,
        name: "Epic Hierarchy",
        groupBy: "epic",
        columns: ["key", "summary", "status", "assignee", "storyPoints", "priority"],
        sortBy: "rank",
        isShared: true,
      },
    });
    await prisma.structureView.create({
      data: {
        organizationId: org.id,
        ownerId: sarahId,
        name: "Sprint Board View",
        groupBy: "sprint",
        columns: ["key", "summary", "status", "assignee", "storyPoints"],
        sortBy: "status",
        isShared: false,
      },
    });
    console.log("  Created 2 structure views");
  }

  // ── 29. Budgets & Cost Rates ──────────────────────────────────────────────
  const existingBudget = await prisma.budget.findFirst({
    where: { organizationId: org.id },
  });
  if (!existingBudget) {
    const q1Start = new Date("2026-01-01");
    const q1End = new Date("2026-03-31");

    const budget = await prisma.budget.create({
      data: {
        organizationId: org.id,
        projectId: projects[0]!.id,
        name: "DEMO Q1 2026 Budget",
        amount: 50000,
        currency: "USD",
        costType: "opex",
        periodStart: q1Start,
        periodEnd: q1End,
        alertThreshold: 80,
      },
    });

    // Cost rates
    const costRateDefs = [
      { userId: frankId, rate: 150, role: null },
      { userId: sarahId, rate: 125, role: null },
      { userId: mikeId, rate: 130, role: null },
    ];

    for (const cr of costRateDefs) {
      await prisma.costRate.create({
        data: {
          organizationId: org.id,
          userId: cr.userId,
          ratePerHour: cr.rate,
          currency: "USD",
          effectiveFrom: q1Start,
        },
      });
    }
    console.log("  Created budget and cost rates");
  }

  // ── 30. Capacity Planning ─────────────────────────────────────────────────
  const existingCapacity = await prisma.teamCapacity.findFirst({
    where: { organizationId: org.id },
  });
  if (!existingCapacity && engProject) {
    const sprintStart = new Date();
    const sprintEnd = new Date(Date.now() + 14 * 86400000);

    await prisma.teamCapacity.create({
      data: {
        organizationId: org.id,
        projectId: engProject.id,
        periodStart: sprintStart,
        periodEnd: sprintEnd,
        totalHours: 320, // 4 devs * 8h * 10 work days
        allocatedHours: 240,
      },
    });

    // User allocations
    for (const userId of [frankId, sarahId, mikeId]) {
      await prisma.userAllocation.create({
        data: {
          organizationId: org.id,
          userId,
          projectId: engProject.id,
          percentage: userId === frankId ? 50 : 100,
          hoursPerDay: userId === frankId ? 4 : 8,
          startDate: sprintStart,
          endDate: sprintEnd,
        },
      });
    }

    // Time off
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + (8 - nextMonday.getDay()) % 7);
    await prisma.timeOff.upsert({
      where: { userId_date: { userId: sarahId, date: nextMonday } },
      update: {},
      create: {
        organizationId: org.id,
        userId: sarahId,
        date: nextMonday,
        hours: 8,
        type: "vacation",
        description: "Personal day",
      },
    });
    console.log("  Created capacity planning data");
  }

  // ── 31. Issue Templates ───────────────────────────────────────────────────
  if (demoProject) {
    const taskTypeId = issueTypeMap.get("Task");
    const bugTypeId = issueTypeMap.get("Bug");

    if (taskTypeId) {
      const existing = await prisma.issueTemplate.findFirst({
        where: { organizationId: org.id, projectId: demoProject.id, name: "Standard Task" },
      });
      if (!existing) {
        await prisma.issueTemplate.create({
          data: {
            organizationId: org.id,
            projectId: demoProject.id,
            issueTypeId: taskTypeId,
            name: "Standard Task",
            description: "Default template for development tasks",
            fields: {
              description: "## Objective\n\n## Acceptance Criteria\n- [ ] \n\n## Technical Notes\n",
              labels: ["development"],
            },
          },
        });
      }
    }

    if (bugTypeId) {
      const existing = await prisma.issueTemplate.findFirst({
        where: { organizationId: org.id, projectId: demoProject.id, name: "Bug Report" },
      });
      if (!existing) {
        await prisma.issueTemplate.create({
          data: {
            organizationId: org.id,
            projectId: demoProject.id,
            issueTypeId: bugTypeId,
            name: "Bug Report",
            description: "Template for reporting bugs with reproduction steps",
            fields: {
              description: "## Steps to Reproduce\n1. \n\n## Expected Behavior\n\n## Actual Behavior\n\n## Environment\n- Browser: \n- OS: \n",
              labels: ["bug"],
            },
          },
        });
      }
    }
    console.log("  Created issue templates");
  }

  // ── 32. Audit Logs ────────────────────────────────────────────────────────
  const existingAuditLogs = await prisma.auditLog.count({
    where: { organizationId: org.id },
  });
  if (existingAuditLogs === 0) {
    const auditDefs = [
      { userId: frankId, entityType: "project", entityId: projects[0]!.id, action: "created", diff: { name: "Demo Project" } },
      { userId: frankId, entityType: "user", entityId: sarahId, action: "invited", diff: { role: "member" } },
      { userId: sarahId, entityType: "issue", entityId: demoProjectIssues[0]?.id ?? "unknown", action: "created", diff: { summary: "Set up CI/CD pipeline" } },
      { userId: mikeId, entityType: "issue", entityId: demoProjectIssues[1]?.id ?? "unknown", action: "updated", diff: { status: { from: "To Do", to: "In Progress" } } },
      { userId: frankId, entityType: "workflow", entityId: defaultWorkflow?.id ?? "unknown", action: "updated", diff: { addedStatuses: ["Blocked", "QA"] } },
    ];

    for (let i = 0; i < auditDefs.length; i++) {
      const ad = auditDefs[i]!;
      await prisma.auditLog.create({
        data: {
          organizationId: org.id,
          userId: ad.userId,
          entityType: ad.entityType,
          entityId: ad.entityId,
          action: ad.action,
          diff: ad.diff,
          ipAddress: "127.0.0.1",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          createdAt: new Date(Date.now() - (auditDefs.length - i) * 86400000),
        },
      });
    }
    console.log("  Created 5 audit log entries");
  }

  // ── 33. Webhook Endpoints ─────────────────────────────────────────────────
  const existingWebhook = await prisma.webhookEndpoint.findFirst({
    where: { organizationId: org.id },
  });
  if (!existingWebhook) {
    await prisma.webhookEndpoint.create({
      data: {
        organizationId: org.id,
        url: "https://hooks.example.com/ordolix",
        events: ["issue.created", "issue.updated", "issue.deleted", "comment.created"],
        isActive: true,
      },
    });
    console.log("  Created webhook endpoint");
  }

  // ── 34. Automation Templates (built-in library) ───────────────────────────
  const automationTemplateDefs = [
    {
      name: "Close stale issues",
      description: "Automatically close issues that have been inactive for 30+ days",
      trigger: { type: "scheduled", schedule: "0 0 * * *" },
      conditions: [{ field: "updatedDate", operator: "older_than", value: "30d" }, { field: "statusCategory", operator: "not_equals", value: "DONE" }],
      actions: [{ type: "transition", toStatus: "Done" }, { type: "add_comment", body: "This issue was automatically closed due to inactivity." }],
      category: "maintenance",
    },
    {
      name: "Welcome message on first issue",
      description: "Post a welcome comment when a user creates their first issue",
      trigger: { type: "issue_created" },
      conditions: [{ field: "reporter.issueCount", operator: "equals", value: 1 }],
      actions: [{ type: "add_comment", body: "Welcome to Ordolix! A team member will review your issue shortly." }],
      category: "onboarding",
    },
  ];

  for (const at of automationTemplateDefs) {
    await prisma.automationTemplate.upsert({
      where: { organizationId_name: { organizationId: org.id, name: at.name } },
      update: {},
      create: {
        organizationId: org.id,
        name: at.name,
        description: at.description,
        trigger: at.trigger,
        conditions: at.conditions,
        actions: at.actions,
        category: at.category,
        isBuiltIn: true,
      },
    });
  }
  console.log("  Created 2 automation templates");

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("Seed complete. Summary:");
  console.log("  - 1 organization, 6 users");
  console.log("  - 3 projects with boards, components, versions, all schemes assigned");
  console.log("  - 30+ issues per project with parent/child relationships");
  console.log("  - Gantt dependencies, comments, history, votes, watchers");
  console.log("  - 6 custom fields with values, 3 SLA configs + instances");
  console.log("  - 5 checklists, 2 dashboards with widgets, 3 queues");
  console.log("  - 5 saved filters, 3 automation rules, 2 templates");
  console.log("  - 3 asset types, 10 assets (CMDB)");
  console.log("  - 15+ time logs, timesheet, notification prefs + records");
  console.log("  - 2 form templates, 2 saved reports, 1 retrospective");
  console.log("  - 1 test suite, 3 test cases, test cycle, test run");
  console.log("  - 1 incident, 2 approvals, 1 survey + 10 responses");
  console.log("  - 2 scripts, plan + roadmap, 2 structure views");
  console.log("  - Budget, cost rates, capacity planning, issue templates");
  console.log("  - Audit logs, webhook endpoints, automation templates");
  console.log("════════════════════════════════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
