# Ordolix - Technical Architecture

## Technology Stack

### Frontend
| Technology | Rationale |
|-----------|-----------|
| Next.js 15 (App Router) | Full-stack React framework, Vercel deployment |
| TypeScript (strict mode) | Type safety across entire codebase. strict: true, noUncheckedIndexedAccess: true |
| Tailwind CSS | Utility-first CSS. No custom CSS files. |
| shadcn/ui | Accessible components built on Radix UI. Copy-paste model. |
| tRPC React Query | tRPC's built-in React Query integration for server state, caching, optimistic updates |
| Recharts | Bar, line, pie, area charts for dashboards, reports, burndown, velocity, CFD |
| Monaco Editor | In-browser code editor for ScriptRunner |
| next-intl | i18n with App Router support |
| Tiptap or Plate | Rich text editor for descriptions and comments |

### Backend
| Technology | Rationale |
|-----------|-----------|
| Next.js API Routes + tRPC | Type-safe API layer with end-to-end TypeScript |
| Neon (PostgreSQL 16) | Serverless Postgres with branching for PR isolation |
| Prisma ORM | Type-safe DB access, migrations, schema-as-documentation |
| Upstash Redis | Serverless Redis for caching, pub/sub, rate limiting |
| Upstash QStash | HTTP message queue for background jobs, automation, scheduled tasks |
| Trigger.dev | Long-running jobs: migrations, bulk ops, report generation |
| isolated-vm | Sandboxed V8 for ScriptRunner (via Trigger.dev on serverless) |
| Zod | Runtime schema validation, API input validation, env config |
| Pino | Structured JSON logging with redaction and correlation IDs |

### Infrastructure & Auth
| Technology | Track A (Vercel) | Track B (Azure) |
|-----------|-----------------|----------------|
| Hosting | Vercel | Azure Container Apps |
| Database | Neon PostgreSQL | Azure Database for PostgreSQL |
| Cache | Upstash Redis | Azure Cache for Redis |
| Storage | Cloudflare R2 | Azure Blob Storage |
| Real-time | Ably / SSE + Upstash | Socket.io |
| Queue | QStash | BullMQ |
| Email | Resend | Azure Communication Services |
| Auth | Email/Password (Credentials) | Azure AD Production |
| Secrets | Vercel Env Vars | Azure Key Vault |

## Two-Track Hosting Strategy

### Track A: Independent Development (Vercel + Neon) - ~$20-40/mo
- Serverless-first: all API routes are stateless functions
- Real-time: Ably/Pusher or SSE + Upstash Redis pub/sub behind RealTimeProvider interface
- Background jobs: QStash for <60s, Trigger.dev for longer
- DB connections: Neon serverless driver (@neondatabase/serverless) with pooling
- File storage: Cloudflare R2 via S3-compatible SDK behind StorageProvider interface
- Cron: Vercel Cron (vercel.json) triggers API routes

### Track B: Enterprise Production (Azure)
- Managed containers with auto-scaling
- PgBouncer connection pooling
- BullMQ workers for background jobs
- WebSocket support via Container Apps
- Azure Key Vault for secrets
- Azure Monitor + App Insights for observability

### Migration Path (Track A -> Track B)
All infrastructure code abstracted behind provider interfaces:
- Database: pg_dump/pg_restore, update DATABASE_URL
- Redis: swap Upstash SDK for ioredis + Azure Redis
- Storage: swap R2Adapter for AzureBlobAdapter
- Real-time: swap Ably adapter for Socket.io adapter
- Auth: swap dev tenant credentials for production
- Deploy: Dockerfile + GitHub Actions to Azure Container Apps

## Directory Structure

```
src/
  app/                          — Next.js App Router pages and layouts
  modules/                      — Feature modules (self-contained)
    issues/
      components/               — React components
      server/                   — tRPC routers, business logic, DB ops
      types/                    — TypeScript types and Zod schemas
      tests/                    — Unit and integration tests
      tooltips.ts               — Tooltip content dictionary
    admin/
    approvals/
    assets/
    boards/
    budgets/
    capacity/
    checklists/
    custom-fields/
    dashboards/
    forms/
    gantt/
    incidents/
    notifications/
    permissions/
    plans/
    projects/
    queues/
    reports/
    retrospectives/
    scripts/
    search/
    sla/
    sprints/
    structure/
    test-management/
    time-tracking/
    users/
    workflows/
  shared/                       — Shared components, hooks, utilities, types
  integrations/                 — External integrations
    sharepoint/
    github/
    salesforce/
    powerbi/
    mcp/
  server/                       — Server config, middleware, auth, DB client
  emails/                       — React Email templates
  messages/                     — i18n translation files
prisma/                         — Schema, migrations, seed files
  seed.ts                       — Default seed (seedDefaults())
  seed-demo.ts                  — Demo data (createDemoDataset())
tests/
  e2e/                          — Playwright E2E test suites
  fixtures/                     — Shared test factories
    factories.ts                — All factory functions
    defaults.ts                 — Default config constants
    scenarios.ts                — Pre-built scenario functions
skills/                         — Claude Code skill files
docs/                           — Project documentation
ordolix-files/                  — Source specification documents
```

## CI/CD Pipeline

### GitHub Actions Workflow
| Stage | Trigger | Actions | Failure |
|-------|---------|---------|---------|
| Lint | Every push/PR | ESLint + Prettier | Block merge |
| Type Check | Every push/PR | tsc --noEmit | Block merge |
| Unit Tests | Every push/PR | Vitest with coverage | Block if coverage drops |
| Integration Tests | Every push/PR | Vitest + Neon branch DB | Block merge |
| E2E Tests | PR to main | Playwright vs Vercel preview | Block merge |
| Security Scan | Every push/PR | npm audit + CodeQL | Block on critical/high |
| Schema Validation | When prisma/ changes | Prisma validate + migration dry run | Block merge |
| Build | Every push/PR | next build | Block merge |
| Deploy Preview | Every PR | Vercel preview URL | Informational |
| Deploy Production | Merge to main | Vercel production | Auto-rollback on health fail |

### Branch Strategy
- `main` — production, always deployable, protected
- `feature/*` — feature branches, squash merge to main
- `fix/*` — bug fix branches
- Neon DB branch per PR (auto-deleted on close)
- Vercel preview deployment per PR

## Test Infrastructure

- **Vitest** with **1,761+ unit/integration tests** across **122 test files**
- Mock-based testing pattern using `vi.fn()` (no real DB connections in tests)
- Factory pattern in `tests/fixtures/` for test data generation (`createTestIssue()`, `createTestWorkflow()`, etc.)
- Co-located test files adjacent to source code (`*.test.ts`)
- TDD methodology: write failing tests first, implement minimum code to pass, then refactor

## tRPC Router Architecture

The appRouter composes **32 domain-specific routers**, each owning its own slice of the API surface:

`project`, `issue`, `workflow`, `board`, `timeTracking`, `checklist`, `epicRollup`, `gantt`, `dashboard`, `approval`, `script`, `notification`, `retro`, `testManagement`, `sla`, `automation`, `form`, `report`, `asset`, `incident`, `integration`, `queue`, `sprint`, `customField`, `search`, `user`, `admin`, `permission`, `plan`, `structure`, `budget`, `capacity`

Routers are defined in their respective `src/modules/[module]/server/` directories and merged into the root router in `src/server/trpc/router.ts`.

## Caching Strategy

| Layer | Technology | Purpose | TTL |
|-------|-----------|---------|-----|
| HTTP response | Vercel Edge Cache | Static assets, public pages | 1 hour |
| API response | Upstash Redis | Project config, workflow defs, permissions | 5 min |
| User session | Upstash Redis | Permissions, role memberships | 5 min |
| Rollup values | Upstash Redis | Epic Sum Up computed values | Until invalidated |
| Search results | Upstash Redis | AQL query results for common filters | 1 min |
| Permission cache | Upstash Redis | RBAC permission checks per user/project | 5 min |
| SLA state | Upstash Redis | Elapsed time, breach predictions | 30 sec |
| Board state | Client React Query | Card positions and statuses | Real-time invalidation |

Cache key naming: `module:entity:id` (e.g., `issues:ORDOLIX-123`, `rollups:ORDOLIX-100`)

## Rate Limiting

| Consumer | Limit | Window |
|----------|-------|--------|
| Browser user | 300 req | Per minute |
| API token | 600 req | Per minute |
| Webhooks | 100 req | Per min/source |
| MCP server | 120 req | Per min/session |
| Unauthenticated | 30 req | Per min/IP |
| AQL search | 60 queries | Per min/user |
| Reports | 10 req | Per min/user |
| Script execution | 30 exec | Per min/user |

Implementation: @upstash/ratelimit with sliding window at tRPC middleware layer.

## Database Indexing Strategy

Critical indexes (defined in Prisma schema):
- Issue: (projectId, status), (projectId, type, status), (assigneeId, status), (parentId), (sprintId, status), (projectId, createdAt), (key) unique, searchVector GIN, customFieldValues GIN
- CustomFieldValue: (issueId, customFieldId) unique
- Comment: (issueId, createdAt)
- TimeLog: (issueId), (userId, date)
- AuditLog: (entityType, entityId, createdAt)
- SLAInstance: (issueId, slaConfigId) unique, (status, breachTime)
- GanttDependency: (sourceIssueId), (targetIssueId)
- TestResult: (testRunId, testCaseId) unique
- Asset: (type, status)

## Monitoring & Observability

### Application-Level (Both Tracks)
- Request correlation IDs propagated through logs, API responses, background jobs
- Business metrics: automation rates, SLA compliance, script execution times
- Performance budgets: API <200ms p95, page loads <500ms
- Error rate monitoring: alert at >1% in 5-min window
- Background job monitoring: success rates, queue depths, processing latency

### Track A
- Vercel Analytics (Web Vitals), Vercel Logs, Upstash Console, Neon Dashboard, Sentry, GitHub Actions metrics

### Track B
- Azure Application Insights, Azure Monitor, custom health endpoints, SLA monitoring dashboard, PagerDuty/Teams alerting
