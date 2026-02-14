# Skill: Create Module

Scaffolds a new feature module in the Ordolix project following the established module pattern.

## Usage

```
/create-module <module-name>
```

The module name should be provided in kebab-case (e.g., `time-tracking`, `test-management`, `assets`).

## Instructions

When this skill is invoked, perform the following steps:

### 1. Validate the Module Name

- Ensure the name is in kebab-case (lowercase letters and hyphens only).
- Check that `src/modules/<module-name>/` does not already exist. If it does, inform the user and stop.

### 2. Create the Directory Structure

Create the following directories and files:

```
src/modules/<module-name>/
  components/
    .gitkeep
  server/
    <module-name>-service.ts
    <module-name>-service.test.ts
    <module-name>-router.ts
    <module-name>-router.test.ts
  types/
    schemas.ts
    schemas.test.ts
  tests/
    .gitkeep
  tooltips.ts
```

### 3. Generate the Service File

File: `src/modules/<module-name>/server/<module-name>-service.ts`

Follow the pattern from `src/modules/issues/server/issue-service.ts`:

```typescript
import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/server/lib/errors";

/**
 * <ModuleName> service layer.
 *
 * @description Handles business logic for <module-name> operations.
 * All functions accept a PrismaClient instance for testability.
 * @module <module-name>-service
 */

// Add service functions here following the pattern:
// export async function create<Entity>(db: PrismaClient, organizationId: string, ...) { }
// export async function get<Entity>(db: PrismaClient, organizationId: string, ...) { }
// export async function list<Entities>(db: PrismaClient, organizationId: string, ...) { }
// export async function update<Entity>(db: PrismaClient, organizationId: string, ...) { }
// export async function delete<Entity>(db: PrismaClient, organizationId: string, ...) { }
```

### 4. Generate the Service Test File

File: `src/modules/<module-name>/server/<module-name>-service.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for <module-name>-service.
 *
 * @description Unit tests for the <ModuleName> service layer.
 * Uses mock PrismaClient for isolation.
 */

describe("<module-name>-service", () => {
  // Add tests following TDD methodology
  it.todo("should create a <entity>");
  it.todo("should list <entities> for an organization");
  it.todo("should get a <entity> by id");
  it.todo("should update a <entity>");
  it.todo("should delete a <entity>");
  it.todo("should throw NotFoundError for missing <entity>");
});
```

### 5. Generate the Router File

File: `src/modules/<module-name>/server/<module-name>-router.ts`

Follow the pattern from `src/modules/issues/server/issue-router.ts`:

```typescript
import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";

/**
 * tRPC router for <module-name>.
 *
 * @description Defines tRPC procedures for <ModuleName> CRUD operations.
 * All procedures require authentication via protectedProcedure.
 * @module <module-name>-router
 */

export const <camelCaseName>Router = createRouter({
  // Add procedures following the pattern:
  // create: protectedProcedure.input(schema).mutation(async ({ ctx, input }) => { }),
  // list: protectedProcedure.input(schema).query(async ({ ctx, input }) => { }),
  // getById: protectedProcedure.input(schema).query(async ({ ctx, input }) => { }),
  // update: protectedProcedure.input(schema).mutation(async ({ ctx, input }) => { }),
  // delete: protectedProcedure.input(schema).mutation(async ({ ctx, input }) => { }),
});
```

### 6. Generate the Router Test File

File: `src/modules/<module-name>/server/<module-name>-router.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest";

/**
 * Tests for <module-name>-router.
 *
 * @description Integration tests for the <ModuleName> tRPC router.
 */

describe("<module-name>-router", () => {
  it.todo("should create a <entity> via tRPC");
  it.todo("should list <entities> via tRPC");
  it.todo("should get a <entity> by id via tRPC");
  it.todo("should update a <entity> via tRPC");
  it.todo("should delete a <entity> via tRPC");
});
```

### 7. Generate the Schemas File

File: `src/modules/<module-name>/types/schemas.ts`

Follow the pattern from `src/modules/issues/types/schemas.ts`:

```typescript
import { z } from "zod";

/**
 * Zod schemas for <ModuleName> module.
 *
 * @description Input validation schemas and TypeScript types for
 * <module-name> operations. Mirrors the corresponding Prisma models.
 * @module <module-name>-schemas
 */

// Add Zod schemas following the pattern:
// export const create<Entity>Input = z.object({ ... });
// export type Create<Entity>Input = z.infer<typeof create<Entity>Input>;
//
// export const update<Entity>Input = z.object({ ... });
// export type Update<Entity>Input = z.infer<typeof update<Entity>Input>;
//
// export const list<Entities>Input = z.object({ ... });
// export type List<Entities>Input = z.infer<typeof list<Entities>Input>;
```

### 8. Generate the Schemas Test File

File: `src/modules/<module-name>/types/schemas.test.ts`

```typescript
import { describe, it, expect } from "vitest";

/**
 * Tests for <module-name> schemas.
 *
 * @description Validates Zod schemas for the <ModuleName> module.
 */

describe("<module-name> schemas", () => {
  it.todo("should validate create input");
  it.todo("should reject invalid create input");
  it.todo("should validate update input");
  it.todo("should validate list input with defaults");
});
```

### 9. Generate the Tooltips File

File: `src/modules/<module-name>/tooltips.ts`

```typescript
/**
 * Tooltip content dictionary for the <ModuleName> module.
 *
 * @description Centralizes tooltip text for UI components.
 * All tooltip strings should use i18n keys in production;
 * this file serves as the source-of-truth reference.
 * @module <module-name>-tooltips
 */

export const <camelCaseName>Tooltips = {
  // Add tooltip keys here, e.g.:
  // createButton: "<module-name>.tooltips.create",
  // deleteButton: "<module-name>.tooltips.delete",
} as const;
```

### 10. Register the Router

After creating the files, remind the user to:

1. Register the new router in `src/server/trpc/router.ts` by importing and adding it to the app router.
2. Add i18n keys to `src/messages/en.json` under a new `"<moduleName>"` section.
3. Add navigation entry in the sidebar if the module needs a nav link.

### 11. Summary

After scaffolding, output a summary listing all created files and the registration steps needed.

## Naming Conventions

| Input (kebab-case) | PascalCase | camelCase |
|---------------------|------------|-----------|
| `time-tracking` | `TimeTracking` | `timeTracking` |
| `test-management` | `TestManagement` | `testManagement` |
| `assets` | `Assets` | `assets` |
| `sla` | `Sla` | `sla` |

## Cross-Cutting Requirements

Every generated file must follow these standards:

- JSDoc/TSDoc on all exports with `@description`, `@param`, `@returns`
- Module-level JSDoc at the top of each file with `@module` tag
- TypeScript strict mode compliance
- All user-facing strings use i18n `t()` function (never hardcode)
- Zod validation on all inputs
- organizationId scoping on all database queries (multi-tenancy)
