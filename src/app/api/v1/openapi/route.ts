/**
 * REST API v1 OpenAPI schema endpoint.
 *
 * - GET /api/v1/openapi — Returns the OpenAPI 3.1 JSON schema
 *
 * @description Serves the OpenAPI specification documenting all v1 REST
 * endpoints. This schema is used by API consumers, SDK generators, and
 * documentation tools.
 *
 * @module api-v1-openapi
 */

import { NextResponse } from "next/server";

/**
 * Standard error response schema reused across all endpoints.
 */
const errorResponseSchema = {
  type: "object" as const,
  required: ["error"],
  properties: {
    error: {
      type: "object" as const,
      required: ["code", "message"],
      properties: {
        code: {
          type: "string" as const,
          description: "Machine-readable error code",
          example: "VALIDATION_ERROR",
        },
        message: {
          type: "string" as const,
          description: "Human-readable error message",
          example: "Invalid input",
        },
        details: {
          type: "object" as const,
          description: "Additional error details",
          additionalProperties: true,
        },
      },
    },
  },
};

/**
 * Pagination meta schema included in list responses.
 */
const paginationMeta = {
  type: "object" as const,
  properties: {
    total: {
      type: "integer" as const,
      description: "Total number of items matching the query",
    },
    nextCursor: {
      type: ["string", "null"] as const,
      description: "Cursor for the next page of results",
    },
    requestId: {
      type: "string" as const,
      description: "Correlation ID for request tracing",
    },
  },
};

/**
 * Standard cursor-based pagination query parameters.
 */
const paginationParams = [
  {
    name: "limit",
    in: "query",
    description: "Maximum number of items to return (1-100)",
    required: false,
    schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
  },
  {
    name: "cursor",
    in: "query",
    description: "Cursor for pagination (ID of last item from previous page)",
    required: false,
    schema: { type: "string" },
  },
];

/**
 * Builds the full OpenAPI 3.1 specification object.
 */
function buildOpenApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Ordolix API",
      version: "1.0.0",
      description:
        "Enterprise project and issue tracking platform API. " +
        "Provides programmatic access to issues, projects, workflows, boards, " +
        "time entries, and more. All endpoints require Bearer token authentication " +
        "and are scoped to the authenticated organization.",
      contact: {
        name: "Ordolix API Support",
        url: "https://ordolix.com/docs/api",
      },
      license: {
        name: "Proprietary",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "Ordolix API v1",
      },
    ],
    security: [
      {
        BearerAuth: [],
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description:
            "API token obtained from Settings > API Tokens. " +
            "Include in the Authorization header as: Bearer <token>",
        },
      },
      schemas: {
        Error: errorResponseSchema,
        PaginationMeta: paginationMeta,
        Issue: {
          type: "object",
          properties: {
            id: { type: "string", format: "cuid" },
            key: { type: "string", example: "PROJ-42" },
            summary: { type: "string", maxLength: 255 },
            description: { type: ["string", "null"] },
            projectId: { type: "string" },
            issueTypeId: { type: "string" },
            statusId: { type: "string" },
            priorityId: { type: "string" },
            assigneeId: { type: ["string", "null"] },
            reporterId: { type: "string" },
            parentId: { type: ["string", "null"] },
            sprintId: { type: ["string", "null"] },
            labels: { type: "array", items: { type: "string" } },
            storyPoints: { type: ["number", "null"] },
            dueDate: { type: ["string", "null"], format: "date-time" },
            startDate: { type: ["string", "null"], format: "date-time" },
            customFieldValues: { type: "object", additionalProperties: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateIssueInput: {
          type: "object",
          required: ["projectId", "summary", "issueTypeId"],
          properties: {
            projectId: { type: "string" },
            summary: { type: "string", minLength: 1, maxLength: 255 },
            issueTypeId: { type: "string" },
            description: { type: "string" },
            priorityId: { type: "string" },
            assigneeId: { type: "string" },
            parentId: { type: "string" },
            sprintId: { type: "string" },
            labels: { type: "array", items: { type: "string" }, default: [] },
            storyPoints: { type: "number", exclusiveMinimum: 0 },
            dueDate: { type: "string", format: "date-time" },
            startDate: { type: "string", format: "date-time" },
            customFieldValues: {
              type: "object",
              additionalProperties: true,
              default: {},
            },
          },
        },
        UpdateIssueInput: {
          type: "object",
          properties: {
            summary: { type: "string", minLength: 1, maxLength: 255 },
            description: { type: ["string", "null"] },
            issueTypeId: { type: "string" },
            priorityId: { type: "string" },
            assigneeId: { type: ["string", "null"] },
            parentId: { type: ["string", "null"] },
            sprintId: { type: ["string", "null"] },
            labels: { type: "array", items: { type: "string" } },
            storyPoints: { type: ["number", "null"] },
            dueDate: { type: ["string", "null"], format: "date-time" },
            startDate: { type: ["string", "null"], format: "date-time" },
            customFieldValues: { type: "object", additionalProperties: true },
          },
        },
        Project: {
          type: "object",
          properties: {
            id: { type: "string", format: "cuid" },
            name: { type: "string" },
            key: { type: "string", example: "PROJ" },
            description: { type: ["string", "null"] },
            lead: { type: ["string", "null"] },
            avatar: { type: ["string", "null"] },
            projectType: { type: "string" },
            templateKey: { type: ["string", "null"] },
            issueCounter: { type: "integer" },
            isArchived: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Workflow: {
          type: "object",
          properties: {
            id: { type: "string", format: "cuid" },
            name: { type: "string" },
            description: { type: ["string", "null"] },
            isDefault: { type: "boolean" },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateWorkflowInput: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 255 },
            description: { type: "string" },
            isDefault: { type: "boolean", default: false },
          },
        },
        UpdateWorkflowInput: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1, maxLength: 255 },
            description: { type: "string" },
            isDefault: { type: "boolean" },
            isActive: { type: "boolean" },
          },
        },
        Board: {
          type: "object",
          properties: {
            id: { type: "string", format: "cuid" },
            projectId: { type: "string" },
            name: { type: "string" },
            boardType: { type: "string", enum: ["kanban", "scrum"] },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateBoardInput: {
          type: "object",
          required: ["projectId", "name"],
          properties: {
            projectId: { type: "string" },
            name: { type: "string", minLength: 1, maxLength: 255 },
            boardType: {
              type: "string",
              enum: ["kanban", "scrum"],
              default: "kanban",
            },
            columns: {
              type: "array",
              items: { $ref: "#/components/schemas/BoardColumn" },
            },
          },
        },
        UpdateBoardInput: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1, maxLength: 255 },
            columns: {
              type: "array",
              items: { $ref: "#/components/schemas/BoardColumn" },
            },
            swimlanes: { type: "array", items: { type: "object" } },
            cardFields: { type: "array", items: { type: "string" } },
            cardColor: { type: "string" },
            quickFilters: { type: "array", items: { type: "object" } },
          },
        },
        BoardColumn: {
          type: "object",
          required: ["id", "name", "statusIds"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            statusIds: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
            },
            minLimit: { type: "integer", minimum: 0 },
            maxLimit: { type: "integer", minimum: 1 },
          },
        },
        TimeEntry: {
          type: "object",
          properties: {
            id: { type: "string", format: "cuid" },
            issueId: { type: "string" },
            userId: { type: "string" },
            date: { type: "string", format: "date-time" },
            duration: {
              type: "integer",
              description: "Duration in seconds",
            },
            description: { type: ["string", "null"] },
            billable: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateTimeEntryInput: {
          type: "object",
          required: ["issueId", "date", "duration"],
          properties: {
            issueId: { type: "string" },
            date: { type: "string", format: "date-time" },
            duration: {
              type: "integer",
              minimum: 1,
              description: "Duration in seconds",
            },
            description: { type: "string" },
            billable: { type: "boolean", default: true },
          },
        },
        UpdateTimeEntryInput: {
          type: "object",
          properties: {
            date: { type: "string", format: "date-time" },
            duration: { type: "integer", minimum: 1 },
            description: { type: "string" },
            billable: { type: "boolean" },
          },
        },
        Comment: {
          type: "object",
          properties: {
            id: { type: "string", format: "cuid" },
            issueId: { type: "string" },
            authorId: { type: "string" },
            body: { type: "string" },
            isInternal: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            author: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: ["string", "null"] },
                email: { type: ["string", "null"] },
                image: { type: ["string", "null"] },
              },
            },
          },
        },
        CreateCommentInput: {
          type: "object",
          required: ["body"],
          properties: {
            body: { type: "string", minLength: 1, maxLength: 32000 },
            isInternal: { type: "boolean", default: false },
          },
        },
        Transition: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            fromStatusId: { type: "string" },
            toStatusId: { type: "string" },
            fromStatus: { type: "object" },
            toStatus: { type: "object" },
          },
        },
        ExecuteTransitionInput: {
          type: "object",
          required: ["transitionId"],
          properties: {
            transitionId: { type: "string" },
          },
        },
        WebhookPayload: {
          type: "object",
          required: ["source", "event", "payload"],
          properties: {
            source: {
              type: "string",
              description:
                "Source integration identifier (e.g., github, sharepoint)",
            },
            event: {
              type: "string",
              description: "Event type from the source (e.g., push, pull_request)",
            },
            payload: {
              type: "object",
              description: "The raw event payload from the source",
              additionalProperties: true,
            },
          },
        },
        DeletedResponse: {
          type: "object",
          properties: {
            deleted: { type: "boolean", example: true },
          },
        },
      },
      parameters: {
        LimitParam: {
          name: "limit",
          in: "query",
          description: "Maximum number of items to return (1-100)",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
        },
        CursorParam: {
          name: "cursor",
          in: "query",
          description:
            "Cursor for pagination (ID of last item from previous page)",
          required: false,
          schema: { type: "string" },
        },
      },
      responses: {
        BadRequest: {
          description: "Bad Request - Invalid input parameters",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        Unauthorized: {
          description: "Unauthorized - Missing or invalid Bearer token",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        Forbidden: {
          description: "Forbidden - Insufficient permissions",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        NotFound: {
          description: "Not Found - Resource does not exist",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        RateLimited: {
          description: "Too Many Requests - Rate limit exceeded",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
          headers: {
            "X-RateLimit-Limit": {
              schema: { type: "integer" },
              description: "Maximum requests per window",
            },
            "X-RateLimit-Remaining": {
              schema: { type: "integer" },
              description: "Remaining requests in current window",
            },
            "X-RateLimit-Reset": {
              schema: { type: "integer" },
              description: "Unix timestamp when the rate limit resets",
            },
          },
        },
      },
    },
    paths: {
      "/issues": {
        get: {
          operationId: "listIssues",
          summary: "List issues",
          description:
            "Lists issues for the authenticated organization, scoped by projectId. " +
            "Supports filtering by status, assignee, issue type, and search text. " +
            "Pagination is cursor-based.",
          tags: ["Issues"],
          parameters: [
            {
              name: "projectId",
              in: "query",
              required: true,
              description: "Filter issues by project ID",
              schema: { type: "string" },
            },
            {
              name: "statusId",
              in: "query",
              required: false,
              description: "Filter by status ID",
              schema: { type: "string" },
            },
            {
              name: "assigneeId",
              in: "query",
              required: false,
              description: "Filter by assignee user ID",
              schema: { type: "string" },
            },
            {
              name: "issueTypeId",
              in: "query",
              required: false,
              description: "Filter by issue type ID",
              schema: { type: "string" },
            },
            {
              name: "search",
              in: "query",
              required: false,
              description: "Search text (matches against summary)",
              schema: { type: "string" },
            },
            {
              name: "sortBy",
              in: "query",
              required: false,
              description: "Field to sort by",
              schema: {
                type: "string",
                enum: ["createdAt", "updatedAt", "priority", "rank"],
                default: "createdAt",
              },
            },
            {
              name: "sortOrder",
              in: "query",
              required: false,
              description: "Sort direction",
              schema: {
                type: "string",
                enum: ["asc", "desc"],
                default: "desc",
              },
            },
            ...paginationParams,
          ],
          responses: {
            "200": {
              description: "Paginated list of issues",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Issue" },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
        post: {
          operationId: "createIssue",
          summary: "Create an issue",
          description:
            "Creates a new issue in the authenticated organization. " +
            "Requires at minimum: projectId, summary, and issueTypeId. " +
            "Automatically assigns initial status from the project workflow.",
          tags: ["Issues"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateIssueInput" },
              },
            },
          },
          responses: {
            "201": {
              description: "Issue created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Issue" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/issues/{id}": {
        get: {
          operationId: "getIssue",
          summary: "Get an issue",
          description:
            "Retrieves a single issue by ID or key. If the ID contains a dash, " +
            "it is treated as an issue key (e.g., PROJ-42).",
          tags: ["Issues"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Issue ID or key",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Issue details",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Issue" },
                      meta: {
                        type: "object",
                        properties: {
                          requestId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
        put: {
          operationId: "updateIssue",
          summary: "Update an issue",
          description:
            "Updates an existing issue. Accepts partial updates. " +
            "Tracks field history and creates audit log entries.",
          tags: ["Issues"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Issue ID",
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateIssueInput" },
              },
            },
          },
          responses: {
            "200": {
              description: "Issue updated successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Issue" },
                      meta: {
                        type: "object",
                        properties: {
                          requestId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
        delete: {
          operationId: "deleteIssue",
          summary: "Delete an issue",
          description:
            "Soft-deletes an issue by setting its deletedAt timestamp. " +
            "The issue is excluded from subsequent queries but can be restored.",
          tags: ["Issues"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Issue ID",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Issue deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/DeletedResponse" },
                      meta: {
                        type: "object",
                        properties: {
                          requestId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/issues/{id}/transitions": {
        get: {
          operationId: "listIssueTransitions",
          summary: "List available transitions",
          description:
            "Returns the list of available workflow transitions for the given issue, " +
            "based on its current status and the project's active workflow.",
          tags: ["Issues", "Workflows"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Issue ID",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Available transitions",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Transition" },
                      },
                      meta: {
                        type: "object",
                        properties: {
                          requestId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
        post: {
          operationId: "executeIssueTransition",
          summary: "Execute a transition",
          description:
            "Executes a workflow transition on the given issue. Validates that the transition " +
            "is valid from the issue's current status, runs configured validators, " +
            "and updates the issue's status.",
          tags: ["Issues", "Workflows"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Issue ID",
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ExecuteTransitionInput",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Transition executed, returns updated issue",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Issue" },
                      meta: {
                        type: "object",
                        properties: {
                          requestId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/issues/{id}/comments": {
        get: {
          operationId: "listIssueComments",
          summary: "List comments on an issue",
          description:
            "Returns a paginated list of comments for the specified issue, " +
            "ordered by creation time (oldest first).",
          tags: ["Issues", "Comments"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Issue ID",
              schema: { type: "string" },
            },
            ...paginationParams,
          ],
          responses: {
            "200": {
              description: "Paginated list of comments",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Comment" },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
        post: {
          operationId: "createIssueComment",
          summary: "Add a comment to an issue",
          description:
            "Adds a new comment to the specified issue. Creates an audit log entry.",
          tags: ["Issues", "Comments"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Issue ID",
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateCommentInput" },
              },
            },
          },
          responses: {
            "201": {
              description: "Comment created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Comment" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/projects": {
        get: {
          operationId: "listProjects",
          summary: "List projects",
          description:
            "Returns a paginated list of projects for the authenticated organization. " +
            "Archived projects are excluded by default unless includeArchived=true.",
          tags: ["Projects"],
          parameters: [
            {
              name: "search",
              in: "query",
              required: false,
              description: "Search by project name or key",
              schema: { type: "string" },
            },
            {
              name: "includeArchived",
              in: "query",
              required: false,
              description: "Include archived projects",
              schema: {
                type: "string",
                enum: ["true", "false"],
                default: "false",
              },
            },
            ...paginationParams,
          ],
          responses: {
            "200": {
              description: "Paginated list of projects",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Project" },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/projects/{key}": {
        get: {
          operationId: "getProject",
          summary: "Get a project by key",
          description:
            "Returns a single project by its unique key (e.g., PROJ). " +
            "The project must belong to the authenticated organization.",
          tags: ["Projects"],
          parameters: [
            {
              name: "key",
              in: "path",
              required: true,
              description: "Project key (e.g., PROJ)",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Project details",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Project" },
                      meta: {
                        type: "object",
                        properties: {
                          requestId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/workflows": {
        get: {
          operationId: "listWorkflows",
          summary: "List workflows",
          description:
            "Lists workflows for the authenticated organization. " +
            "By default excludes inactive workflows unless includeInactive=true.",
          tags: ["Workflows"],
          parameters: [
            {
              name: "includeInactive",
              in: "query",
              required: false,
              description: "Include inactive workflows",
              schema: {
                type: "string",
                enum: ["true", "false"],
                default: "false",
              },
            },
            ...paginationParams,
          ],
          responses: {
            "200": {
              description: "Paginated list of workflows",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Workflow" },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
        post: {
          operationId: "createWorkflow",
          summary: "Create a workflow",
          description:
            "Creates a new workflow for the authenticated organization. " +
            "Requires at minimum: name.",
          tags: ["Workflows"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateWorkflowInput" },
              },
            },
          },
          responses: {
            "201": {
              description: "Workflow created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Workflow" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/workflows/{id}": {
        get: {
          operationId: "getWorkflow",
          summary: "Get a workflow",
          description:
            "Retrieves a single workflow with its statuses, transitions, " +
            "and project assignments.",
          tags: ["Workflows"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Workflow ID",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Workflow details with statuses and transitions",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Workflow" },
                      meta: {
                        type: "object",
                        properties: {
                          requestId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
        put: {
          operationId: "updateWorkflow",
          summary: "Update a workflow",
          description:
            "Updates an existing workflow. Accepts partial updates for " +
            "name, description, isDefault, and isActive.",
          tags: ["Workflows"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Workflow ID",
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateWorkflowInput" },
              },
            },
          },
          responses: {
            "200": {
              description: "Workflow updated successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Workflow" },
                      meta: {
                        type: "object",
                        properties: {
                          requestId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/boards": {
        get: {
          operationId: "listBoards",
          summary: "List boards",
          description:
            "Lists boards for the authenticated organization. " +
            "Optionally filtered by projectId.",
          tags: ["Boards"],
          parameters: [
            {
              name: "projectId",
              in: "query",
              required: false,
              description: "Filter boards by project ID",
              schema: { type: "string" },
            },
            ...paginationParams,
          ],
          responses: {
            "200": {
              description: "Paginated list of boards",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Board" },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
        post: {
          operationId: "createBoard",
          summary: "Create a board",
          description:
            "Creates a new board for the authenticated organization. " +
            "Requires at minimum: projectId and name.",
          tags: ["Boards"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateBoardInput" },
              },
            },
          },
          responses: {
            "201": {
              description: "Board created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Board" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/boards/{id}": {
        get: {
          operationId: "getBoard",
          summary: "Get a board",
          description:
            "Retrieves a single board with its column configuration.",
          tags: ["Boards"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Board ID",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Board details with columns",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Board" },
                      meta: {
                        type: "object",
                        properties: {
                          requestId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
        put: {
          operationId: "updateBoard",
          summary: "Update a board",
          description:
            "Updates an existing board. Accepts partial updates for name, " +
            "columns, swimlanes, card fields, and quick filters.",
          tags: ["Boards"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Board ID",
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateBoardInput" },
              },
            },
          },
          responses: {
            "200": {
              description: "Board updated successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Board" },
                      meta: {
                        type: "object",
                        properties: {
                          requestId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
        delete: {
          operationId: "deleteBoard",
          summary: "Delete a board",
          description: "Permanently deletes a board.",
          tags: ["Boards"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Board ID",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Board deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/DeletedResponse" },
                      meta: {
                        type: "object",
                        properties: {
                          requestId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/time-entries": {
        get: {
          operationId: "listTimeEntries",
          summary: "List time entries",
          description:
            "Lists time entries for the authenticated organization. " +
            "Supports filtering by issue, user, and date range.",
          tags: ["Time Tracking"],
          parameters: [
            {
              name: "issueId",
              in: "query",
              required: false,
              description: "Filter by issue ID",
              schema: { type: "string" },
            },
            {
              name: "userId",
              in: "query",
              required: false,
              description: "Filter by user ID",
              schema: { type: "string" },
            },
            {
              name: "startDate",
              in: "query",
              required: false,
              description: "Filter entries on or after this date",
              schema: { type: "string", format: "date-time" },
            },
            {
              name: "endDate",
              in: "query",
              required: false,
              description: "Filter entries on or before this date",
              schema: { type: "string", format: "date-time" },
            },
            ...paginationParams,
          ],
          responses: {
            "200": {
              description: "Paginated list of time entries",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/TimeEntry" },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
        post: {
          operationId: "createTimeEntry",
          summary: "Create a time entry",
          description:
            "Creates a new time entry for the authenticated user. " +
            "Requires: issueId, date, duration (in seconds).",
          tags: ["Time Tracking"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateTimeEntryInput" },
              },
            },
          },
          responses: {
            "201": {
              description: "Time entry created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/TimeEntry" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/time-entries/{id}": {
        get: {
          operationId: "getTimeEntry",
          summary: "Get a time entry",
          description: "Retrieves a single time entry by ID.",
          tags: ["Time Tracking"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Time entry ID",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Time entry details",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/TimeEntry" },
                      meta: {
                        type: "object",
                        properties: {
                          requestId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
        put: {
          operationId: "updateTimeEntry",
          summary: "Update a time entry",
          description:
            "Updates an existing time entry. Only the entry's owner can update it.",
          tags: ["Time Tracking"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Time entry ID",
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateTimeEntryInput" },
              },
            },
          },
          responses: {
            "200": {
              description: "Time entry updated successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/TimeEntry" },
                      meta: {
                        type: "object",
                        properties: {
                          requestId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
        delete: {
          operationId: "deleteTimeEntry",
          summary: "Delete a time entry",
          description:
            "Deletes a time entry. Only the entry's owner can delete it.",
          tags: ["Time Tracking"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Time entry ID",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Time entry deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/DeletedResponse" },
                      meta: {
                        type: "object",
                        properties: {
                          requestId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/webhooks": {
        post: {
          operationId: "receiveWebhook",
          summary: "Receive incoming webhook",
          description:
            "Handles incoming webhook payloads from external services (GitHub, SharePoint, etc.). " +
            "Validates the webhook source, parses the event payload, and dispatches to " +
            "the appropriate integration handler. This endpoint authenticates via " +
            "shared secrets/signatures rather than Bearer tokens.",
          tags: ["Webhooks"],
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WebhookPayload" },
              },
            },
          },
          responses: {
            "200": {
              description: "Webhook received and acknowledged",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          received: { type: "boolean" },
                          source: { type: "string" },
                          event: { type: "string" },
                          requestId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },
    },
    tags: [
      {
        name: "Issues",
        description: "Create, read, update, and delete issues",
      },
      {
        name: "Comments",
        description: "Manage comments on issues",
      },
      {
        name: "Projects",
        description: "List and retrieve projects",
      },
      {
        name: "Workflows",
        description: "Manage workflow definitions",
      },
      {
        name: "Boards",
        description: "Manage Kanban and Scrum boards",
      },
      {
        name: "Time Tracking",
        description: "Log and manage time entries",
      },
      {
        name: "Webhooks",
        description: "Receive incoming webhook events from external services",
      },
    ],
  };
}

/**
 * GET /api/v1/openapi
 *
 * Returns the OpenAPI 3.1 JSON schema documenting all v1 REST API endpoints.
 * This endpoint is unauthenticated to allow API consumers to discover the schema.
 */
export async function GET(): Promise<Response> {
  const spec = buildOpenApiSpec();

  return NextResponse.json(spec, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Content-Type": "application/json",
    },
  });
}
