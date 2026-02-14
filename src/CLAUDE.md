# src/ - Source Code Conventions

## Architecture

Feature-based modular structure. Each module is self-contained with its own routes, components, logic, tests, and types.

## Key Directories

- `app/` — Next.js App Router pages and layouts
- `modules/` — Feature modules (issues, workflows, boards, time-tracking, gantt, sla, test-management, assets, scripts, forms, reports, incidents, retrospectives, approvals, checklists)
- `shared/` — Shared components, hooks, utilities, types used across modules
- `integrations/` — External integrations (sharepoint, github, salesforce, powerbi, mcp)
- `server/` — Server config, middleware, auth, DB client
- `emails/` — React Email templates
- `messages/` — i18n translation files (en.json)

## Module Structure

Each module in `modules/` follows this pattern:
```
modules/[module]/
  components/     — React components (PascalCase.tsx)
  server/         — tRPC routers, business logic (kebab-case.ts)
  types/          — TypeScript types and Zod schemas
  tests/          — Unit and integration tests (*.test.ts)
  tooltips.ts     — Tooltip content dictionary for the module
```

## Coding Standards

### Naming
- Components: PascalCase.tsx (IssueDetail.tsx)
- Logic: kebab-case.ts (workflow-engine.ts)
- Tests: *.test.ts adjacent to source
- React components: PascalCase (IssueCard)
- Functions/hooks: camelCase (useIssueQuery)
- Types: PascalCase (WorkflowTransition)

### Styling
- Tailwind CSS utility classes ONLY. No custom CSS files.
- shadcn/ui components (Radix UI primitives)
- CSS variables for theme colors (see docs/UX-DESIGN.md)
- 4px base spacing unit
- Logical properties (ms-4 not ml-4) for RTL prep

### TypeScript
- strict: true, noUncheckedIndexedAccess: true
- Zod schemas mirror Prisma models for runtime validation
- Self-describing union types over comments (type SLAStatus = "active" | "paused" | "breached")

### API Layer
- tRPC for internal type-safe API (not versioned)
- REST /api/v1/ for external consumers (OpenAPI documented)
- Zod input validation on all routes
- RBAC permission check at tRPC middleware layer
- Correlation IDs on every request

### Error Handling
- AppError base with typed subclasses (ValidationError, NotFoundError, PermissionError, etc.)
- Machine-readable error codes (WORKFLOW_TRANSITION_BLOCKED)
- React ErrorBoundary at app and module level
- Consistent { code, message, details, requestId } response format

### i18n
- All strings via t() from next-intl
- Translation file: src/messages/en.json
- Intl.DateTimeFormat for dates, Intl.NumberFormat for numbers
- Never hardcode date formats or string literals

### Documentation
- JSDoc/TSDoc on all exports with @description, @param, @returns, @throws, @example
- Module-level JSDoc at top of each file
- Inline comments for non-obvious business logic only

### Testing (TDD)
- Write failing tests FIRST, then implement
- Test files co-located with source
- Factory pattern (tests/fixtures/factories.ts) for test data
- MSW for external API mocking
- 100% coverage on core business logic, 80% overall
