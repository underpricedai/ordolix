/**
 * MCP (Model Context Protocol) server implementation for Ordolix.
 *
 * Provides a JSON-RPC based server that exposes Ordolix tools and resources
 * to AI assistants through the MCP protocol.
 *
 * @module integrations/mcp/server
 */

import type { PrismaClient } from "@prisma/client";
import { IntegrationError as _IntegrationError } from "@/server/lib/errors"; // Reserved for error handling in tool implementations
import type {
  MCPRequest,
  MCPResponse,
  MCPServerInfo,
  MCPSessionContext,
  MCPToolResult,
  MCPResourceTemplate,
} from "./types";
import {
  TOOL_DEFINITIONS,
  handleCreateIssue,
  handleGetIssue,
  handleSearchIssues,
  handleTransitionIssue,
  handleAddComment,
  handleGetBoard,
  handleGetDashboard,
  handleUpdateIssue,
  handleListProjects,
  handleGetSprint,
  handleListSprints,
  handleAssignIssue,
  handleGetWorkflowTransitions,
} from "./tools";

/** MCP server version */
const SERVER_VERSION = "1.0.0";

/** Resource templates advertised by this server */
const RESOURCE_TEMPLATES: MCPResourceTemplate[] = [
  {
    uriTemplate: "board://{id}",
    name: "Board",
    description: "An Ordolix board by its ID",
    mimeType: "application/json",
  },
  {
    uriTemplate: "issue://{key}",
    name: "Issue",
    description: "An Ordolix issue by its key (e.g., issue://ORD-123)",
    mimeType: "application/json",
  },
  {
    uriTemplate: "project://{key}",
    name: "Project",
    description: "An Ordolix project by its key (e.g., project://ORD)",
    mimeType: "application/json",
  },
  {
    uriTemplate: "sprint://{id}",
    name: "Sprint",
    description: "Sprint details by ID",
    mimeType: "application/json",
  },
  {
    uriTemplate: "user://{id}",
    name: "User",
    description: "User profile by ID",
    mimeType: "application/json",
  },
];

/**
 * MCP Server for Ordolix.
 *
 * Handles JSON-RPC requests from MCP clients (AI assistants) and dispatches
 * tool calls and resource reads to the appropriate handlers.
 *
 * @example
 * ```ts
 * const server = new MCPServer(db);
 * const session = await server.createSession(db, "org-1", "Claude", ["issues:read", "issues:write"]);
 * const response = await server.handleRequest(session, {
 *   jsonrpc: "2.0",
 *   id: 1,
 *   method: "tools/call",
 *   params: { name: "get_issue", arguments: { issueKey: "ORD-123" } },
 * });
 * ```
 */
export class MCPServer {
  private readonly db: PrismaClient;

  constructor(db: PrismaClient) {
    this.db = db;
  }

  /**
   * Create a new MCP session and persist it to the database.
   *
   * @param db - Prisma client
   * @param organizationId - Organization for this session
   * @param clientName - Name of the connecting MCP client
   * @param permissions - Permissions granted to this session
   * @returns Session context for subsequent requests
   */
  async createSession(
    db: PrismaClient,
    organizationId: string,
    clientName: string,
    permissions: MCPSessionContext["permissions"],
  ): Promise<MCPSessionContext> {
    const session = await db.mCPSession.create({
      data: {
        organizationId,
        clientName,
        permissions: permissions as unknown as string[],
      },
    });

    return {
      sessionId: session.id,
      organizationId,
      clientName,
      permissions,
    };
  }

  /**
   * Update the last active timestamp for a session.
   *
   * @param sessionId - Session to update
   */
  async touchSession(sessionId: string): Promise<void> {
    await this.db.mCPSession.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });
  }

  /**
   * Handle an incoming MCP JSON-RPC request.
   *
   * Routes the request to the appropriate handler based on the method.
   *
   * @param session - The authenticated session context
   * @param request - The JSON-RPC request
   * @returns JSON-RPC response
   */
  async handleRequest(
    session: MCPSessionContext,
    request: MCPRequest,
  ): Promise<MCPResponse> {
    try {
      await this.touchSession(session.sessionId);

      switch (request.method) {
        case "initialize":
          return this.handleInitialize(request);
        case "tools/list":
          return this.handleToolsList(request);
        case "tools/call":
          return await this.handleToolsCall(session, request);
        case "resources/templates/list":
          return this.handleResourceTemplatesList(request);
        case "resources/read":
          return await this.handleResourceRead(session, request);
        default:
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: { code: -32601, message: `Method not found: ${request.method}` },
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32000, message },
      };
    }
  }

  /**
   * Handle the initialize method.
   * Returns server capabilities and info.
   */
  private handleInitialize(request: MCPRequest): MCPResponse {
    const serverInfo: MCPServerInfo = {
      name: "ordolix-mcp",
      version: SERVER_VERSION,
      capabilities: {
        tools: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
      },
    };

    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo,
        capabilities: serverInfo.capabilities,
      },
    };
  }

  /**
   * Handle the tools/list method.
   * Returns all available tool definitions.
   */
  private handleToolsList(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: { tools: TOOL_DEFINITIONS },
    };
  }

  /**
   * Handle the tools/call method.
   * Dispatches to the appropriate tool handler.
   */
  private async handleToolsCall(
    session: MCPSessionContext,
    request: MCPRequest,
  ): Promise<MCPResponse> {
    const params = request.params as { name: string; arguments?: Record<string, unknown> } | undefined;
    if (!params?.name) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32602, message: "Missing tool name" },
      };
    }

    const toolName = params.name;
    const args = params.arguments ?? {};
    let result: MCPToolResult;

    switch (toolName) {
      case "add_comment":
        result = await handleAddComment(this.db, session, args);
        break;
      case "assign_issue":
        result = await handleAssignIssue(this.db, session, args);
        break;
      case "create_issue":
        result = await handleCreateIssue(this.db, session, args);
        break;
      case "get_board":
        result = await handleGetBoard(this.db, session, args);
        break;
      case "get_dashboard":
        result = await handleGetDashboard(this.db, session, args);
        break;
      case "get_issue":
        result = await handleGetIssue(this.db, session, args);
        break;
      case "get_sprint":
        result = await handleGetSprint(this.db, session, args);
        break;
      case "get_workflow_transitions":
        result = await handleGetWorkflowTransitions(this.db, session, args);
        break;
      case "list_projects":
        result = await handleListProjects(this.db, session, args);
        break;
      case "list_sprints":
        result = await handleListSprints(this.db, session, args);
        break;
      case "search_issues":
        result = await handleSearchIssues(this.db, session, args);
        break;
      case "transition_issue":
        result = await handleTransitionIssue(this.db, session, args);
        break;
      case "update_issue":
        result = await handleUpdateIssue(this.db, session, args);
        break;
      default:
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: { code: -32602, message: `Unknown tool: ${toolName}` },
        };
    }

    return { jsonrpc: "2.0", id: request.id, result };
  }

  /**
   * Handle the resources/templates/list method.
   */
  private handleResourceTemplatesList(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: { resourceTemplates: RESOURCE_TEMPLATES },
    };
  }

  /**
   * Handle the resources/read method.
   * Reads a resource by its URI.
   */
  private async handleResourceRead(
    session: MCPSessionContext,
    request: MCPRequest,
  ): Promise<MCPResponse> {
    const params = request.params as { uri: string } | undefined;
    if (!params?.uri) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32602, message: "Missing resource URI" },
      };
    }

    const uri = params.uri;
    let content: unknown;

    if (uri.startsWith("issue://")) {
      const key = uri.replace("issue://", "");
      content = await this.db.issue.findFirst({
        where: { organizationId: session.organizationId, key },
        include: {
          issueType: { select: { name: true } },
          status: { select: { name: true, category: true } },
          priority: { select: { name: true } },
          assignee: { select: { name: true, email: true } },
          reporter: { select: { name: true, email: true } },
          project: { select: { name: true, key: true } },
          comments: { select: { body: true, createdAt: true }, take: 10, orderBy: { createdAt: "desc" } },
        },
      });
    } else if (uri.startsWith("project://")) {
      const key = uri.replace("project://", "");
      content = await this.db.project.findFirst({
        where: { organizationId: session.organizationId, key },
        include: {
          _count: { select: { issues: true, members: true, boards: true } },
        },
      });
    } else if (uri.startsWith("board://")) {
      const id = uri.replace("board://", "");
      content = await this.db.board.findFirst({
        where: { id, organizationId: session.organizationId },
        include: { project: { select: { name: true, key: true } } },
      });
    } else if (uri.startsWith("sprint://")) {
      const id = uri.replace("sprint://", "");
      content = await this.db.sprint.findFirst({
        where: { id, organizationId: session.organizationId },
        include: {
          project: { select: { name: true, key: true } },
          issues: {
            select: { key: true, summary: true, storyPoints: true },
            orderBy: { key: "asc" },
          },
        },
      });
    } else if (uri.startsWith("user://")) {
      const id = uri.replace("user://", "");
      const user = await this.db.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, locale: true, timezone: true, createdAt: true },
      });
      if (user) {
        // Find the user's org membership to get their role
        const membership = await this.db.organizationMember.findFirst({
          where: { userId: id, organizationId: session.organizationId },
          select: { role: true },
        });
        content = { ...user, role: membership?.role ?? null };
      }
    } else {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32602, message: `Unknown resource scheme: ${uri}` },
      };
    }

    if (!content) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32002, message: `Resource not found: ${uri}` },
      };
    }

    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(content, null, 2),
          },
        ],
      },
    };
  }
}
