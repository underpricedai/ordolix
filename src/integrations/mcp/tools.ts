/**
 * MCP tool handler implementations.
 *
 * Each tool handler function takes the session context and arguments,
 * performs the operation, and returns an MCPToolResult.
 *
 * @module integrations/mcp/tools
 */

import type { PrismaClient } from "@prisma/client";
import { IntegrationError } from "@/server/lib/errors";
import type {
  MCPToolDefinition,
  MCPToolResult,
  MCPSessionContext,
} from "./types";

// ── Tool Definitions ──────────────────────────────────────────────────────

/**
 * All available MCP tool definitions.
 * These are advertised to clients during tool/list.
 */
export const TOOL_DEFINITIONS: MCPToolDefinition[] = [
  {
    name: "create_issue",
    description: "Create a new issue in Ordolix",
    inputSchema: {
      type: "object",
      properties: {
        projectKey: { type: "string", description: "Project key (e.g., 'ORD')" },
        summary: { type: "string", description: "Issue summary/title" },
        description: { type: "string", description: "Detailed description (Markdown)" },
        issueType: { type: "string", description: "Issue type name (e.g., 'Bug', 'Task', 'Story')" },
        priority: { type: "string", description: "Priority name (e.g., 'High', 'Medium', 'Low')" },
        assignee: { type: "string", description: "Assignee email address" },
        labels: { type: "string", description: "Comma-separated labels" },
      },
      required: ["projectKey", "summary", "issueType"],
    },
  },
  {
    name: "get_issue",
    description: "Get details of an issue by its key",
    inputSchema: {
      type: "object",
      properties: {
        issueKey: { type: "string", description: "Issue key (e.g., 'ORD-123')" },
      },
      required: ["issueKey"],
    },
  },
  {
    name: "search_issues",
    description: "Search for issues using AQL (Ordolix Query Language) or text",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (AQL or text)" },
        projectKey: { type: "string", description: "Limit search to a project" },
        maxResults: { type: "string", description: "Maximum results (default 20)" },
      },
      required: ["query"],
    },
  },
  {
    name: "transition_issue",
    description: "Transition an issue to a new status",
    inputSchema: {
      type: "object",
      properties: {
        issueKey: { type: "string", description: "Issue key (e.g., 'ORD-123')" },
        statusName: { type: "string", description: "Target status name (e.g., 'In Progress', 'Done')" },
      },
      required: ["issueKey", "statusName"],
    },
  },
  {
    name: "add_comment",
    description: "Add a comment to an issue",
    inputSchema: {
      type: "object",
      properties: {
        issueKey: { type: "string", description: "Issue key (e.g., 'ORD-123')" },
        body: { type: "string", description: "Comment body (Markdown)" },
        internal: { type: "string", description: "Whether the comment is internal (true/false)" },
      },
      required: ["issueKey", "body"],
    },
  },
  {
    name: "get_board",
    description: "Get board details including columns and issue counts",
    inputSchema: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "Board ID" },
      },
      required: ["boardId"],
    },
  },
  {
    name: "get_dashboard",
    description: "Get dashboard details including widgets",
    inputSchema: {
      type: "object",
      properties: {
        dashboardId: { type: "string", description: "Dashboard ID" },
      },
      required: ["dashboardId"],
    },
  },
];

// ── Permission Checking ──────────────────────────────────────────────────

/**
 * Check that a session has the required permission.
 *
 * @param session - Current MCP session context
 * @param permission - Required permission
 * @throws IntegrationError if permission is missing
 */
function requirePermission(
  session: MCPSessionContext,
  permission: string,
): void {
  if (!session.permissions.includes(permission as MCPSessionContext["permissions"][number])) {
    throw new IntegrationError(
      "MCP",
      `Permission denied: requires '${permission}'`,
      { sessionId: session.sessionId, required: permission },
    );
  }
}

// ── Tool Handlers ────────────────────────────────────────────────────────

/**
 * Handle the create_issue tool call.
 */
export async function handleCreateIssue(
  db: PrismaClient,
  session: MCPSessionContext,
  args: Record<string, unknown>,
): Promise<MCPToolResult> {
  requirePermission(session, "issues:write");

  const projectKey = args.projectKey as string;
  const summary = args.summary as string;
  const issueTypeName = args.issueType as string;
  const priorityName = args.priority as string | undefined;
  const assigneeEmail = args.assignee as string | undefined;
  const labelsStr = args.labels as string | undefined;

  // Look up project
  const project = await db.project.findFirst({
    where: { organizationId: session.organizationId, key: projectKey },
  });
  if (!project) {
    return errorResult(`Project '${projectKey}' not found`);
  }

  // Look up issue type
  const issueType = await db.issueType.findFirst({
    where: { organizationId: session.organizationId, name: issueTypeName },
  });
  if (!issueType) {
    return errorResult(`Issue type '${issueTypeName}' not found`);
  }

  // Look up priority (use first if not specified)
  const priority = priorityName
    ? await db.priority.findFirst({
        where: { organizationId: session.organizationId, name: priorityName },
      })
    : await db.priority.findFirst({
        where: { organizationId: session.organizationId },
        orderBy: { rank: "asc" },
      });
  if (!priority) {
    return errorResult("No priority found");
  }

  // Look up default status (first TO_DO status)
  const status = await db.status.findFirst({
    where: { organizationId: session.organizationId, category: "TO_DO" },
  });
  if (!status) {
    return errorResult("No default status found");
  }

  // Look up assignee if specified
  let assigneeId: string | null = null;
  if (assigneeEmail) {
    const user = await db.user.findUnique({ where: { email: assigneeEmail } });
    if (!user) {
      return errorResult(`User '${assigneeEmail}' not found`);
    }
    assigneeId = user.id;
  }

  // Increment issue counter
  const updatedProject = await db.project.update({
    where: { id: project.id },
    data: { issueCounter: { increment: 1 } },
  });

  const issueKey = `${project.key}-${updatedProject.issueCounter}`;
  const labels = labelsStr ? labelsStr.split(",").map((l) => l.trim()) : [];

  const issue = await db.issue.create({
    data: {
      organizationId: session.organizationId,
      projectId: project.id,
      key: issueKey,
      summary,
      description: (args.description as string) ?? null,
      issueTypeId: issueType.id,
      statusId: status.id,
      priorityId: priority.id,
      assigneeId,
      reporterId: assigneeId ?? "system",
      labels,
    },
  });

  return textResult(`Created issue ${issue.key}: ${issue.summary}`);
}

/**
 * Handle the get_issue tool call.
 */
export async function handleGetIssue(
  db: PrismaClient,
  session: MCPSessionContext,
  args: Record<string, unknown>,
): Promise<MCPToolResult> {
  requirePermission(session, "issues:read");

  const issueKey = args.issueKey as string;

  const issue = await db.issue.findFirst({
    where: { organizationId: session.organizationId, key: issueKey },
    include: {
      issueType: { select: { name: true } },
      status: { select: { name: true, category: true } },
      priority: { select: { name: true } },
      assignee: { select: { name: true, email: true } },
      reporter: { select: { name: true, email: true } },
      project: { select: { name: true, key: true } },
    },
  });

  if (!issue) {
    return errorResult(`Issue '${issueKey}' not found`);
  }

  const text = [
    `**${issue.key}**: ${issue.summary}`,
    `Project: ${issue.project.name} (${issue.project.key})`,
    `Type: ${issue.issueType.name}`,
    `Status: ${issue.status.name} [${issue.status.category}]`,
    `Priority: ${issue.priority.name}`,
    `Assignee: ${issue.assignee?.name ?? "Unassigned"} ${issue.assignee?.email ? `(${issue.assignee.email})` : ""}`,
    `Reporter: ${issue.reporter.name} (${issue.reporter.email})`,
    issue.description ? `\n---\n${issue.description}` : "",
    issue.labels.length ? `Labels: ${issue.labels.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return textResult(text);
}

/**
 * Handle the search_issues tool call.
 */
export async function handleSearchIssues(
  db: PrismaClient,
  session: MCPSessionContext,
  args: Record<string, unknown>,
): Promise<MCPToolResult> {
  requirePermission(session, "issues:read");

  const query = args.query as string;
  const projectKey = args.projectKey as string | undefined;
  const maxResults = Math.min(parseInt(String(args.maxResults ?? "20"), 10), 50);

  // Simple text search across key and summary
  const where: Record<string, unknown> = {
    organizationId: session.organizationId,
    OR: [
      { key: { contains: query, mode: "insensitive" } },
      { summary: { contains: query, mode: "insensitive" } },
    ],
  };

  if (projectKey) {
    const project = await db.project.findFirst({
      where: { organizationId: session.organizationId, key: projectKey },
    });
    if (project) {
      where.projectId = project.id;
    }
  }

  const issues = await db.issue.findMany({
    where,
    include: {
      status: { select: { name: true } },
      priority: { select: { name: true } },
      assignee: { select: { name: true } },
    },
    take: maxResults,
    orderBy: { updatedAt: "desc" },
  });

  if (issues.length === 0) {
    return textResult("No issues found matching the query.");
  }

  const lines = issues.map(
    (i) =>
      `- **${i.key}**: ${i.summary} [${i.status.name}] (${i.priority.name}) ${i.assignee?.name ? `- ${i.assignee.name}` : ""}`,
  );

  return textResult(`Found ${issues.length} issue(s):\n\n${lines.join("\n")}`);
}

/**
 * Handle the transition_issue tool call.
 */
export async function handleTransitionIssue(
  db: PrismaClient,
  session: MCPSessionContext,
  args: Record<string, unknown>,
): Promise<MCPToolResult> {
  requirePermission(session, "issues:transition");

  const issueKey = args.issueKey as string;
  const statusName = args.statusName as string;

  const issue = await db.issue.findFirst({
    where: { organizationId: session.organizationId, key: issueKey },
    select: { id: true, key: true, statusId: true },
  });

  if (!issue) {
    return errorResult(`Issue '${issueKey}' not found`);
  }

  const targetStatus = await db.status.findFirst({
    where: { organizationId: session.organizationId, name: statusName },
  });

  if (!targetStatus) {
    return errorResult(`Status '${statusName}' not found`);
  }

  await db.issue.update({
    where: { id: issue.id },
    data: { statusId: targetStatus.id, updatedAt: new Date() },
  });

  return textResult(`Transitioned ${issueKey} to '${statusName}'`);
}

/**
 * Handle the add_comment tool call.
 */
export async function handleAddComment(
  db: PrismaClient,
  session: MCPSessionContext,
  args: Record<string, unknown>,
): Promise<MCPToolResult> {
  requirePermission(session, "comments:write");

  const issueKey = args.issueKey as string;
  const body = args.body as string;
  const isInternal = args.internal === "true";

  const issue = await db.issue.findFirst({
    where: { organizationId: session.organizationId, key: issueKey },
    select: { id: true, organizationId: true },
  });

  if (!issue) {
    return errorResult(`Issue '${issueKey}' not found`);
  }

  await db.comment.create({
    data: {
      organizationId: session.organizationId,
      issueId: issue.id,
      authorId: "mcp-" + session.sessionId,
      body,
      isInternal,
    },
  });

  return textResult(`Added comment to ${issueKey}`);
}

/**
 * Handle the get_board tool call.
 */
export async function handleGetBoard(
  db: PrismaClient,
  session: MCPSessionContext,
  args: Record<string, unknown>,
): Promise<MCPToolResult> {
  requirePermission(session, "boards:read");

  const boardId = args.boardId as string;

  const board = await db.board.findFirst({
    where: { id: boardId, organizationId: session.organizationId },
    include: {
      project: { select: { name: true, key: true } },
    },
  });

  if (!board) {
    return errorResult(`Board '${boardId}' not found`);
  }

  const text = [
    `**Board: ${board.name}**`,
    `Project: ${board.project.name} (${board.project.key})`,
    `Type: ${board.boardType}`,
    `Columns: ${JSON.stringify(board.columns)}`,
    `Swimlanes: ${JSON.stringify(board.swimlanes)}`,
  ].join("\n");

  return textResult(text);
}

/**
 * Handle the get_dashboard tool call.
 */
export async function handleGetDashboard(
  db: PrismaClient,
  session: MCPSessionContext,
  args: Record<string, unknown>,
): Promise<MCPToolResult> {
  requirePermission(session, "dashboards:read");

  const dashboardId = args.dashboardId as string;

  const dashboard = await db.dashboard.findFirst({
    where: { id: dashboardId, organizationId: session.organizationId },
    include: {
      widgets: true,
    },
  });

  if (!dashboard) {
    return errorResult(`Dashboard '${dashboardId}' not found`);
  }

  const widgetSummary = dashboard.widgets
    .map((w) => `  - ${w.title} (${w.widgetType})`)
    .join("\n");

  const text = [
    `**Dashboard: ${dashboard.name}**`,
    `Shared: ${dashboard.isShared ? "Yes" : "No"}`,
    `Widgets (${dashboard.widgets.length}):`,
    widgetSummary || "  (none)",
  ].join("\n");

  return textResult(text);
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Create a text-content tool result.
 */
function textResult(text: string): MCPToolResult {
  return { content: [{ type: "text", text }] };
}

/**
 * Create an error tool result.
 */
function errorResult(message: string): MCPToolResult {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}
