/**
 * Tests for the MCP server and tool handlers.
 *
 * @module integrations/mcp/server.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MCPServer } from "./server";
import { TOOL_DEFINITIONS } from "./tools";
import type { MCPRequest, MCPSessionContext } from "./types";

function createMockDb() {
  return {
    mCPSession: {
      create: vi.fn().mockResolvedValue({ id: "session-1" }),
      update: vi.fn().mockResolvedValue({}),
    },
    issue: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    issueType: {
      findFirst: vi.fn(),
    },
    priority: {
      findFirst: vi.fn(),
    },
    status: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    comment: {
      create: vi.fn().mockResolvedValue({ id: "comment-1" }),
    },
    board: {
      findFirst: vi.fn(),
    },
    dashboard: {
      findFirst: vi.fn(),
    },
    sprint: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    transition: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    organizationMember: {
      findFirst: vi.fn(),
    },
  } as unknown as import("@prisma/client").PrismaClient;
}

const session: MCPSessionContext = {
  sessionId: "session-1",
  organizationId: "org-1",
  clientName: "test-client",
  permissions: [
    "issues:read",
    "issues:write",
    "issues:transition",
    "comments:read",
    "comments:write",
    "boards:read",
    "dashboards:read",
    "projects:read",
    "sprints:read",
  ],
};

describe("MCPServer", () => {
  let db: ReturnType<typeof createMockDb>;
  let server: MCPServer;

  beforeEach(() => {
    db = createMockDb();
    server = new MCPServer(db);
  });

  describe("createSession", () => {
    it("should create a session in the database", async () => {
      const result = await server.createSession(db, "org-1", "Claude", ["issues:read"]);

      expect(result.sessionId).toBe("session-1");
      expect(result.organizationId).toBe("org-1");
      expect(result.clientName).toBe("Claude");
      expect(result.permissions).toEqual(["issues:read"]);
      expect(db.mCPSession.create).toHaveBeenCalled();
    });
  });

  describe("handleRequest - initialize", () => {
    it("should return server info and capabilities", async () => {
      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
      };

      const response = await server.handleRequest(session, request);

      expect(response.result).toMatchObject({
        protocolVersion: "2024-11-05",
        serverInfo: {
          name: "ordolix-mcp",
          version: "1.0.0",
        },
      });
    });
  });

  describe("handleRequest - tools/list", () => {
    it("should return all tool definitions", async () => {
      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { tools: typeof TOOL_DEFINITIONS };

      expect(result.tools).toHaveLength(TOOL_DEFINITIONS.length);
      const names = result.tools.map((t) => t.name);
      expect(names).toContain("add_comment");
      expect(names).toContain("assign_issue");
      expect(names).toContain("create_issue");
      expect(names).toContain("get_board");
      expect(names).toContain("get_dashboard");
      expect(names).toContain("get_issue");
      expect(names).toContain("get_sprint");
      expect(names).toContain("get_workflow_transitions");
      expect(names).toContain("list_projects");
      expect(names).toContain("list_sprints");
      expect(names).toContain("search_issues");
      expect(names).toContain("transition_issue");
      expect(names).toContain("update_issue");
    });
  });

  describe("handleRequest - tools/call get_issue", () => {
    it("should return issue details", async () => {
      (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "i-1",
        key: "ORD-123",
        summary: "Fix login bug",
        description: "Detailed description",
        labels: ["bug"],
        project: { name: "Ordolix", key: "ORD" },
        issueType: { name: "Bug" },
        status: { name: "Open", category: "TO_DO" },
        priority: { name: "High" },
        assignee: { name: "Frank", email: "frank@test.com" },
        reporter: { name: "Jane", email: "jane@test.com" },
      });

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "get_issue", arguments: { issueKey: "ORD-123" } },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("ORD-123");
      expect(result.content[0]!.text).toContain("Fix login bug");
      expect(result.content[0]!.text).toContain("Bug");
      expect(result.content[0]!.text).toContain("Frank");
    });

    it("should return error for non-existent issue", async () => {
      (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "get_issue", arguments: { issueKey: "ORD-999" } },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }>; isError: boolean };

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain("not found");
    });
  });

  describe("handleRequest - tools/call transition_issue", () => {
    it("should transition an issue to a new status", async () => {
      (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "i-1",
        key: "ORD-123",
        statusId: "status-1",
      });
      (db.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "status-2",
        name: "In Progress",
      });
      (db.issue.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "transition_issue",
          arguments: { issueKey: "ORD-123", statusName: "In Progress" },
        },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("Transitioned ORD-123");
      expect(result.content[0]!.text).toContain("In Progress");
      expect(db.issue.update).toHaveBeenCalledWith({
        where: { id: "i-1" },
        data: expect.objectContaining({ statusId: "status-2" }),
      });
    });
  });

  describe("handleRequest - tools/call add_comment", () => {
    it("should add a comment to an issue", async () => {
      (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "i-1",
        organizationId: "org-1",
      });

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: {
          name: "add_comment",
          arguments: { issueKey: "ORD-123", body: "Working on this now." },
        },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("Added comment");
      expect(db.comment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          body: "Working on this now.",
          isInternal: false,
        }),
      });
    });
  });

  describe("handleRequest - tools/call get_board", () => {
    it("should return board details", async () => {
      (db.board.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "b-1",
        name: "Sprint Board",
        boardType: "scrum",
        columns: [{ name: "To Do" }, { name: "In Progress" }, { name: "Done" }],
        swimlanes: [],
        project: { name: "Ordolix", key: "ORD" },
      });

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: { name: "get_board", arguments: { boardId: "b-1" } },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("Sprint Board");
      expect(result.content[0]!.text).toContain("scrum");
    });
  });

  describe("handleRequest - tools/call get_dashboard", () => {
    it("should return dashboard details with widgets", async () => {
      (db.dashboard.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "d-1",
        name: "Team Overview",
        isShared: true,
        widgets: [
          { id: "w-1", title: "Open Issues", widgetType: "counter" },
          { id: "w-2", title: "Sprint Burndown", widgetType: "chart" },
        ],
      });

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 8,
        method: "tools/call",
        params: { name: "get_dashboard", arguments: { dashboardId: "d-1" } },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("Team Overview");
      expect(result.content[0]!.text).toContain("Open Issues");
      expect(result.content[0]!.text).toContain("Sprint Burndown");
    });
  });

  describe("handleRequest - resources/templates/list", () => {
    it("should return resource templates", async () => {
      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 9,
        method: "resources/templates/list",
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { resourceTemplates: Array<{ uriTemplate: string }> };

      expect(result.resourceTemplates).toHaveLength(5);
      const uris = result.resourceTemplates.map((t) => t.uriTemplate);
      expect(uris).toContain("board://{id}");
      expect(uris).toContain("issue://{key}");
      expect(uris).toContain("project://{key}");
      expect(uris).toContain("sprint://{id}");
      expect(uris).toContain("user://{id}");
    });
  });

  describe("handleRequest - resources/read", () => {
    it("should read an issue resource", async () => {
      (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "i-1",
        key: "ORD-123",
        summary: "Test issue",
      });

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 10,
        method: "resources/read",
        params: { uri: "issue://ORD-123" },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { contents: Array<{ uri: string; text: string }> };

      expect(result.contents[0]!.uri).toBe("issue://ORD-123");
      const parsed = JSON.parse(result.contents[0]!.text);
      expect(parsed.key).toBe("ORD-123");
    });

    it("should return error for unknown resource scheme", async () => {
      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 11,
        method: "resources/read",
        params: { uri: "unknown://something" },
      };

      const response = await server.handleRequest(session, request);

      expect(response.error).toBeDefined();
      expect(response.error!.message).toContain("Unknown resource scheme");
    });

    it("should return error for missing resource", async () => {
      (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 12,
        method: "resources/read",
        params: { uri: "issue://NONEXIST-999" },
      };

      const response = await server.handleRequest(session, request);

      expect(response.error).toBeDefined();
      expect(response.error!.message).toContain("Resource not found");
    });
  });

  describe("handleRequest - unknown method", () => {
    it("should return method not found error", async () => {
      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 13,
        method: "unknown/method",
      };

      const response = await server.handleRequest(session, request);

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32601);
    });
  });

  describe("handleRequest - permission denied", () => {
    it("should return error when session lacks required permission", async () => {
      const limitedSession: MCPSessionContext = {
        ...session,
        permissions: ["issues:read"], // no write permission
      };

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 14,
        method: "tools/call",
        params: {
          name: "create_issue",
          arguments: { projectKey: "ORD", summary: "Test", issueType: "Bug" },
        },
      };

      const response = await server.handleRequest(limitedSession, request);

      // The IntegrationError is caught by handleRequest's try/catch
      // and converted to a JSON-RPC error response
      expect(response.error).toBeDefined();
      expect(response.error!.message).toContain("Permission denied");
      expect(response.error!.code).toBe(-32000);
    });
  });

  describe("handleRequest - search_issues", () => {
    it("should search issues by text", async () => {
      (db.issue.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          key: "ORD-1",
          summary: "Login bug",
          status: { name: "Open" },
          priority: { name: "High" },
          assignee: { name: "Frank" },
        },
      ]);

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 15,
        method: "tools/call",
        params: { name: "search_issues", arguments: { query: "login" } },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("ORD-1");
      expect(result.content[0]!.text).toContain("Login bug");
    });

    it("should return message when no issues found", async () => {
      (db.issue.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 16,
        method: "tools/call",
        params: { name: "search_issues", arguments: { query: "nonexistent" } },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("No issues found");
    });
  });

  describe("handleRequest - tools/call update_issue", () => {
    it("should update issue fields", async () => {
      (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "i-1",
        key: "ORD-123",
      });
      (db.priority.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "p-2",
        name: "Low",
      });
      (db.issue.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 17,
        method: "tools/call",
        params: {
          name: "update_issue",
          arguments: { issueKey: "ORD-123", summary: "Updated title", priority: "Low" },
        },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("Updated ORD-123");
      expect(result.content[0]!.text).toContain("summary");
      expect(result.content[0]!.text).toContain("priority");
      expect(db.issue.update).toHaveBeenCalledWith({
        where: { id: "i-1" },
        data: expect.objectContaining({
          summary: "Updated title",
          priorityId: "p-2",
        }),
      });
    });

    it("should return error for non-existent issue", async () => {
      (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 18,
        method: "tools/call",
        params: {
          name: "update_issue",
          arguments: { issueKey: "ORD-999", summary: "New title" },
        },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }>; isError: boolean };

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain("not found");
    });
  });

  describe("handleRequest - tools/call list_projects", () => {
    it("should list projects", async () => {
      (db.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          key: "ORD",
          name: "Ordolix",
          lead: "Frank",
          _count: { issues: 42 },
        },
        {
          key: "TEST",
          name: "Test Project",
          lead: null,
          _count: { issues: 5 },
        },
      ]);

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 19,
        method: "tools/call",
        params: { name: "list_projects", arguments: {} },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("ORD");
      expect(result.content[0]!.text).toContain("Ordolix");
      expect(result.content[0]!.text).toContain("Frank");
      expect(result.content[0]!.text).toContain("TEST");
      expect(result.content[0]!.text).toContain("2 project(s)");
    });

    it("should return message when no projects found", async () => {
      (db.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 20,
        method: "tools/call",
        params: { name: "list_projects", arguments: {} },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("No projects found");
    });
  });

  describe("handleRequest - tools/call get_sprint", () => {
    it("should return sprint details with issues", async () => {
      (db.sprint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "s-1",
        name: "Sprint 1",
        status: "active",
        goal: "Complete auth module",
        startDate: new Date("2026-02-01"),
        endDate: new Date("2026-02-14"),
        project: { name: "Ordolix", key: "ORD" },
        issues: [
          { key: "ORD-1", summary: "Login page", storyPoints: 3 },
          { key: "ORD-2", summary: "Signup page", storyPoints: 5 },
        ],
      });

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 21,
        method: "tools/call",
        params: { name: "get_sprint", arguments: { sprintId: "s-1" } },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("Sprint 1");
      expect(result.content[0]!.text).toContain("active");
      expect(result.content[0]!.text).toContain("ORD-1");
      expect(result.content[0]!.text).toContain("ORD-2");
      expect(result.content[0]!.text).toContain("Story Points: 8");
    });

    it("should return error for non-existent sprint", async () => {
      (db.sprint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 22,
        method: "tools/call",
        params: { name: "get_sprint", arguments: { sprintId: "s-999" } },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }>; isError: boolean };

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain("not found");
    });
  });

  describe("handleRequest - tools/call list_sprints", () => {
    it("should list sprints for a project", async () => {
      (db.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "p-1",
        key: "ORD",
      });
      (db.sprint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          name: "Sprint 1",
          status: "completed",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-01-14"),
          _count: { issues: 10 },
        },
        {
          name: "Sprint 2",
          status: "active",
          startDate: new Date("2026-01-15"),
          endDate: new Date("2026-01-28"),
          _count: { issues: 8 },
        },
      ]);

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 23,
        method: "tools/call",
        params: { name: "list_sprints", arguments: { projectKey: "ORD" } },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("Sprint 1");
      expect(result.content[0]!.text).toContain("Sprint 2");
      expect(result.content[0]!.text).toContain("2 sprint(s)");
    });
  });

  describe("handleRequest - tools/call assign_issue", () => {
    it("should assign a user to an issue", async () => {
      (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "i-1",
        key: "ORD-123",
      });
      (db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "u-1",
        name: "Frank",
        email: "frank@test.com",
      });
      (db.issue.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 24,
        method: "tools/call",
        params: {
          name: "assign_issue",
          arguments: { issueKey: "ORD-123", assignee: "frank@test.com" },
        },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("Assigned ORD-123");
      expect(result.content[0]!.text).toContain("Frank");
      expect(db.issue.update).toHaveBeenCalledWith({
        where: { id: "i-1" },
        data: expect.objectContaining({ assigneeId: "u-1" }),
      });
    });

    it("should unassign when empty string provided", async () => {
      (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "i-1",
        key: "ORD-123",
      });
      (db.issue.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 25,
        method: "tools/call",
        params: {
          name: "assign_issue",
          arguments: { issueKey: "ORD-123", assignee: "" },
        },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("Unassigned ORD-123");
      expect(db.issue.update).toHaveBeenCalledWith({
        where: { id: "i-1" },
        data: expect.objectContaining({ assigneeId: null }),
      });
    });
  });

  describe("handleRequest - tools/call get_workflow_transitions", () => {
    it("should return available transitions", async () => {
      (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "i-1",
        key: "ORD-123",
        statusId: "status-1",
        status: { name: "Open" },
        project: {
          defaultWorkflowId: "wf-1",
          workflows: [{ id: "wf-1" }],
        },
      });
      (db.transition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "t-1", toStatus: { name: "In Progress" } },
        { id: "t-2", toStatus: { name: "Done" } },
      ]);

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 26,
        method: "tools/call",
        params: {
          name: "get_workflow_transitions",
          arguments: { issueKey: "ORD-123" },
        },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("Current: Open");
      expect(result.content[0]!.text).toContain("In Progress");
      expect(result.content[0]!.text).toContain("Done");
    });

    it("should handle no available transitions", async () => {
      (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "i-1",
        key: "ORD-123",
        statusId: "status-1",
        status: { name: "Done" },
        project: {
          defaultWorkflowId: "wf-1",
          workflows: [{ id: "wf-1" }],
        },
      });
      (db.transition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 27,
        method: "tools/call",
        params: {
          name: "get_workflow_transitions",
          arguments: { issueKey: "ORD-123" },
        },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain("Current: Done");
      expect(result.content[0]!.text).toContain("No available transitions");
    });
  });

  describe("handleRequest - resources/read sprint://", () => {
    it("should read a sprint resource", async () => {
      (db.sprint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "s-1",
        name: "Sprint 1",
        status: "active",
        project: { name: "Ordolix", key: "ORD" },
        issues: [{ key: "ORD-1", summary: "Test", storyPoints: 3 }],
      });

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 28,
        method: "resources/read",
        params: { uri: "sprint://s-1" },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { contents: Array<{ uri: string; text: string }> };

      expect(result.contents[0]!.uri).toBe("sprint://s-1");
      const parsed = JSON.parse(result.contents[0]!.text);
      expect(parsed.name).toBe("Sprint 1");
    });
  });

  describe("handleRequest - resources/read user://", () => {
    it("should read a user resource", async () => {
      (db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "u-1",
        name: "Frank",
        email: "frank@test.com",
        locale: "en",
        timezone: "UTC",
        createdAt: new Date("2026-01-01"),
      });
      (db.organizationMember.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        role: "admin",
      });

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 29,
        method: "resources/read",
        params: { uri: "user://u-1" },
      };

      const response = await server.handleRequest(session, request);
      const result = response.result as { contents: Array<{ uri: string; text: string }> };

      expect(result.contents[0]!.uri).toBe("user://u-1");
      const parsed = JSON.parse(result.contents[0]!.text);
      expect(parsed.name).toBe("Frank");
      expect(parsed.email).toBe("frank@test.com");
      expect(parsed.role).toBe("admin");
    });

    it("should return error for non-existent user", async () => {
      (db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 30,
        method: "resources/read",
        params: { uri: "user://nonexistent" },
      };

      const response = await server.handleRequest(session, request);

      expect(response.error).toBeDefined();
      expect(response.error!.message).toContain("Resource not found");
    });
  });
});
