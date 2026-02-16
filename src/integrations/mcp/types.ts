/**
 * TypeScript types for the MCP (Model Context Protocol) server integration.
 *
 * Defines tool definitions, resource types, and session management types
 * for the Ordolix MCP server that allows AI assistants to interact with
 * the issue tracking system.
 *
 * @module integrations/mcp/types
 */

// ── Tool Definitions ──────────────────────────────────────────────────────

/** MCP tool input schema (JSON Schema) */
export interface MCPToolInputSchema {
  type: "object";
  properties: Record<string, {
    type: string;
    description: string;
    enum?: string[];
  }>;
  required?: string[];
}

/** Definition of an MCP tool */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: MCPToolInputSchema;
}

/** MCP tool call request */
export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/** MCP tool call result */
export interface MCPToolResult {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
    resource?: { uri: string; text: string; mimeType: string };
  }>;
  isError?: boolean;
}

// ── Resource Types ───────────────────────────────────────────────────────

/** MCP resource definition */
export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/** MCP resource template for dynamic URIs */
export interface MCPResourceTemplate {
  uriTemplate: string;
  name: string;
  description: string;
  mimeType: string;
}

/** Supported resource URI schemes */
export type MCPResourceScheme = "issue" | "project" | "board" | "sprint" | "user";

// ── Session Types ────────────────────────────────────────────────────────

/** MCP session context */
export interface MCPSessionContext {
  sessionId: string;
  organizationId: string;
  clientName: string;
  permissions: MCPPermission[];
}

/** Granular permissions for MCP operations */
export type MCPPermission =
  | "issues:read"
  | "issues:write"
  | "issues:transition"
  | "comments:read"
  | "comments:write"
  | "boards:read"
  | "dashboards:read"
  | "projects:read"
  | "sprints:read";

// ── Server Protocol Types ────────────────────────────────────────────────

/** MCP JSON-RPC request */
export interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/** MCP JSON-RPC response */
export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/** MCP server capabilities */
export interface MCPServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
}

/** MCP server info returned during initialization */
export interface MCPServerInfo {
  name: string;
  version: string;
  capabilities: MCPServerCapabilities;
}
