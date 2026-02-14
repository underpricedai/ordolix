# Skill: Create API Endpoint

Creates a new REST API v1 endpoint following the established Ordolix patterns.

## Usage

```
/create-api-endpoint <resource-name> [--methods GET,POST,PUT,DELETE] [--nested-under <parent>]
```

- `resource-name`: The resource in kebab-case (e.g., `issues`, `time-entries`, `assets`).
- `--methods`: Comma-separated HTTP methods to generate (default: `GET,POST`).
- `--nested-under`: Optional parent resource for nested routes (e.g., `issues` for `/api/v1/issues/:id/comments`).

## Instructions

When this skill is invoked, perform the following steps:

### 1. Determine the Route Path

- **Collection endpoint**: `src/app/api/v1/<resource-name>/route.ts`
- **Single resource endpoint**: `src/app/api/v1/<resource-name>/[id]/route.ts`
- **Nested endpoint**: `src/app/api/v1/<parent>/[id]/<resource-name>/route.ts`

If both collection (GET list, POST create) and single-resource (GET by id, PUT, DELETE) methods are requested, create both route files.

### 2. Create the Collection Route File

File: `src/app/api/v1/<resource-name>/route.ts`

Follow the exact pattern from `src/app/api/v1/issues/route.ts`:

```typescript
/**
 * REST API v1 <resource-name> collection endpoints.
 *
 * - GET /api/v1/<resource-name> — List <resources>
 * - POST /api/v1/<resource-name> — Create a new <resource>
 *
 * @module api-v1-<resource-name>
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";

/** Query parameters for listing <resources> */
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  // Add resource-specific filters here
});

/**
 * GET /api/v1/<resource-name>
 *
 * Lists <resources> for the authenticated organization.
 * Pagination is cursor-based.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = listQuerySchema.parse(rawParams);

  // TODO: Call service layer
  // const result = await <resource>Service.list(db, ctx.organizationId, input);

  return res.success(
    [], // Replace with result.items
    { total: 0, nextCursor: null, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/<resource-name>
 *
 * Creates a new <resource> in the authenticated organization.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  // const input = create<Resource>Input.parse(body);

  // TODO: Call service layer
  // const resource = await <resource>Service.create(db, ctx.organizationId, ctx.userId, input);

  return res.created({}, ctx.rateLimit); // Replace {} with created resource
});
```

### 3. Create the Single Resource Route File

File: `src/app/api/v1/<resource-name>/[id]/route.ts`

Follow the exact pattern from `src/app/api/v1/issues/[id]/route.ts`:

```typescript
/**
 * REST API v1 single <resource> endpoints.
 *
 * - GET /api/v1/<resource-name>/:id — Get <resource> by ID
 * - PUT /api/v1/<resource-name>/:id — Update a <resource>
 * - DELETE /api/v1/<resource-name>/:id — Delete a <resource>
 *
 * @module api-v1-<resource-name>-id
 */

import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";

/**
 * GET /api/v1/<resource-name>/:id
 *
 * Retrieves a single <resource> by ID.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("<Resource> ID is required", undefined, ctx.rateLimit);
  }

  // TODO: Call service layer
  // const resource = await <resource>Service.getById(db, ctx.organizationId, id);

  return res.success({}, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * PUT /api/v1/<resource-name>/:id
 *
 * Updates an existing <resource>. Accepts partial updates.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("<Resource> ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  // const input = update<Resource>Input.parse({ id, ...body });

  // TODO: Call service layer
  // const resource = await <resource>Service.update(db, ctx.organizationId, ctx.userId, id, input);

  return res.success({}, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * DELETE /api/v1/<resource-name>/:id
 *
 * Deletes a <resource>.
 */
export const DELETE = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("<Resource> ID is required", undefined, ctx.rateLimit);
  }

  // TODO: Call service layer
  // await <resource>Service.delete(db, ctx.organizationId, ctx.userId, id);

  return res.success(
    { deleted: true },
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});
```

### 4. Key Patterns to Follow

Every generated endpoint must adhere to these patterns:

- **Authentication**: Always use `apiHandler()` wrapper (handles Bearer token auth, rate limiting, error mapping, correlation IDs).
- **Rate Limiting**: Handled automatically by `apiHandler`. The `ctx.rateLimit` is passed to all response helpers.
- **Query Parameters**: Parse with `z.coerce` for numeric types. Build a `rawParams` record from `url.searchParams`.
- **Pagination**: Cursor-based using `cursor` and `limit` params. Return `nextCursor` in response meta.
- **Organization Scoping**: Always filter by `ctx.organizationId` on all database queries (multi-tenancy).
- **Error Responses**: Use `res.badRequest()`, `res.notFound()`, `res.forbidden()` from `../lib/response`.
- **Correlation IDs**: Included automatically by `apiHandler`. Pass `ctx.requestId` in response meta.
- **Zod Validation**: All inputs validated with Zod schemas. `apiHandler` catches `ZodError` automatically.
- **Imports**: Use `@/server/db` for database client, `@/modules/<module>/server/<module>-service` for service layer.

### 5. Special Endpoint: Webhooks

For webhook endpoints that authenticate via shared secrets instead of Bearer tokens, do NOT use `apiHandler`. Instead, follow the pattern in `src/app/api/v1/webhooks/route.ts` with manual correlation ID generation and error handling.

### 6. After Creation

Remind the user to:

1. Update the OpenAPI schema in `src/app/api/v1/openapi/route.ts` to include the new endpoint.
2. Import and use the appropriate service module and Zod schemas from `src/modules/<module>/`.
3. Add tests for the new endpoint.

## Response Format Reference

All API responses follow this format:

```json
// Success
{
  "data": { ... },
  "meta": {
    "total": 100,
    "nextCursor": "abc123",
    "requestId": "req-uuid"
  }
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
  }
}
```

## Headers

All responses include:
- `X-Correlation-Id` — Request correlation ID
- `X-RateLimit-Limit` — Max requests per window
- `X-RateLimit-Remaining` — Remaining requests
- `X-RateLimit-Reset` — Window reset timestamp
