# Ordolix - Development Plan

## Status: Active Development (as of February 14, 2026)

Primary developer: Frank + Claude Code AI tooling (agent mode).
Development started June 2026. Approximately 8 months of active development completed.

## Project Metrics

| Metric | Count |
|--------|-------|
| Prisma models | 99 |
| tRPC routers in appRouter | 31 |
| Unit tests passing | 1,716+ |
| Test files | 116 |
| REST API v1 route files | 39 (42 total incl. auth/trpc/events) |
| Feature modules (src/modules/) | 30 |
| Admin pages | 12 |
| Type errors | 0 |
| Lint errors | 0 |

## Phase 1: Foundation + Demo Prep -- COMPLETE

All originally planned Tier 1 features are implemented with full test coverage.

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Project scaffolding: Next.js 15 + Prisma 7.4.0 + tRPC + Tailwind + shadcn/ui + Vitest | Done | CI passes; all tooling operational |
| Prisma schema: 99 models across 10 sections | Done | Far exceeds original 40+ target; seed data for 5 users, 4 groups, 4 roles, 2 permission schemes, 1 security scheme, 5 global permissions |
| Dev authentication with user picker | Done | 5 seeded users; dev login at /auth/signin (Azure AD SSO deferred to production deployment) |
| Issue CRUD + custom fields + Epic Sum Up rollup engine | Done | Full CRUD, custom field persistence, real-time rollup computation |
| Workflow engine with approval gates + permission system | Done | Transition enforcement, validators, full Jira-style RBAC |
| Board views (Kanban + Scrum) | Done | Both board types implemented |
| Gantt charts with dependencies | Done | Timeline rendering, dependency display |
| AQL search parser + dashboards | Done | Custom parser, configurable dashboards |
| Full RBAC/permission system | Done | ProjectRole, Group, PermissionScheme, PermissionGrant, GlobalPermission, IssueSecurityScheme/Level; Redis-cached permission checker (5min TTL); requirePermission + adminProcedure middleware |

## Phase 2: Platform Complete -- COMPLETE

All Phase 2 features are implemented with tRPC routers, services, and test coverage.

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Time tracking: timers, manual entry, timesheets, approval workflow | Done | Timer/stopwatch, timesheet approval, time reports |
| Advanced SLAs: multi-metric, business hours calendar, escalation processing | Done | SLA clocks, escalation firing, business hours support |
| Automation engine + ScriptRunner | Done | Rules execute, scripting engine implemented |
| Checklists + dynamic forms + approval workflows | Done | CRUD, conditional rendering, approval gating |
| Report builder + notification system | Done | Report building/rendering, configurable notifications |
| Service management: queues, request types, auto-assignment | Done | Queue auto-assignment, request type routing |

## Phase 3: Enterprise -- MOSTLY COMPLETE

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Test management with cycles, bulk execution, folder hierarchy | Done | Full test case/plan/run support |
| CMDB/Assets with relationships | Done | Asset CRUD, relationship mapping |
| Incident management | Done | Incidents from issues |
| Retrospectives | Done | Action items create issues |
| Integration providers (SharePoint, GitHub, Salesforce, Power BI, MCP) | Done | Provider interfaces implemented |
| Webhook dispatch system | Done | Webhook registration and dispatch |
| Email templates | Done | React Email templates |
| Migration toolkit: Jira data import/export | Not started | Deferred to launch phase |

## Feature Expansion Batches (11 Batches)

| Batch | Scope | Status |
|-------|-------|--------|
| 1 | Core Issue Features: history, watchers, voting, comments, subtasks, links, attachments | Complete |
| 2 | Admin Foundation: priority CRUD, issue type CRUD, component CRUD, version CRUD | Complete |
| 3 | Time Tracking Enhancements: timer/stopwatch, timesheet approval, time reports | Complete |
| 4 | GitHub Integration: config router, webhook handler, admin UI | Partially complete -- webhook handler registration, admin UI persistence, and DevelopmentPanel component still need wiring |
| 5 | Charts + Reports: Recharts integration, dashboard widgets (burndown, velocity, CFD) | Not started |
| 6 | Plans / Advanced Roadmaps: cross-project timeline, scenarios | Complete |
| 7 | Structure Module: tree visualization, grouping engine | Complete |
| 8 | Budgets + Cost Management: CAPEX/OPEX, cost rates, budget entries | Complete |
| 9 | Capacity Planner: resource allocation, time off, load analysis | Complete |
| 10 | Service Management Enhancements: business hours, SLA escalation, queue auto-assignment | Complete |
| 11 | Test Management Enhancements: test cycles, bulk execution, folder hierarchy | Complete |

## Remaining Work

### High Priority

1. **Batch 4 completion (GitHub Integration)** -- Wire webhook handler registration, admin UI persistence, DevelopmentPanel component
2. **Batch 5 (Charts + Reports)** -- Install Recharts, create chart components, build dashboard widgets (burndown, velocity, CFD)
3. **UI wiring** -- Connect all 90 React components to their tRPC routers; interactive forms, error states, loading states
4. **Wire requirePermission into existing routers** -- Permission middleware is built but needs integration across all 31 routers

### Medium Priority

5. **E2E tests** -- Playwright test suite (currently unit/integration only)
6. **Azure AD SSO** -- Production setup (dev uses user picker)
7. **Vercel deployment** -- Production configuration and preview deployments
8. **Migration toolkit** -- Jira data import/export with validation

### Low Priority

9. **Track B (Azure) migration** -- Container Apps + Azure PostgreSQL + Azure Redis + Azure Blob Storage (when enterprise deployment needed; provider interfaces already abstracted)

## Demo Strategy

### Demo Environment
- Vercel preview URL
- Realistic seed data (5 users, multiple projects, full workflow data)
- Dev authentication for stakeholder access
- All Tier 1 and Tier 2 features functional

### Demo Narrative
1. Cost comparison: current Atlassian spend vs Ordolix infrastructure cost
2. Board view side-by-side with Jira -- feature parity, cleaner UI
3. Gantt charts -- replaces BigPicture
4. Epic Sum Up rollup -- replaces marketplace plugin
5. AQL search -- same power as JQL, cleaner syntax
6. Time tracking + SLA management -- replaces Tempo
7. Automation + scripting -- replaces ScriptRunner
8. Test management -- replaces Zephyr/Xray
9. CMDB/Assets -- replaces Insight
10. MCP integration -- Claude Code creates/queries issues via natural language

### Buy-In Success Criteria
- Leadership approval for dedicated dev time
- Budget for Azure infrastructure (Track B)
- 3+ pilot teams identified
- IT Security review initiated

## Risks and Mitigations

| Risk | Severity | Status | Mitigation |
|------|----------|--------|-----------|
| Single developer dependency | High | Active | Self-documenting code, Claude Code skills, 1,716+ tests across 116 files, modular architecture, comprehensive CLAUDE.md at every level |
| UI wiring gap (backend complete, frontend partially connected) | High | Active | Systematic batch approach; tRPC routers and types already defined for all 31 routers |
| Vercel serverless limitations | Medium | Mitigated | Provider abstraction layer in place; Trigger.dev for long jobs; Upstash for queues |
| Scripting engine security | High | Mitigated | isolated-vm design via Trigger.dev; resource limits; no fs/network access |
| Migration data integrity | High | Not yet addressed | Planned: automated validation, multiple dry runs, parallel operation period |
| Permission system integration | Medium | Active | Middleware built; needs systematic wiring across all routers |
| Chart/visualization library | Low | Not yet addressed | Recharts selected; integration planned for Batch 5 |

## Architecture Decisions Made

- **Prisma 7.4.0**: No `url`/`directUrl` in schema; uses `prisma.config.ts` with `datasource.url`; `driverAdapters` preview feature removed; `PrismaClient` requires `{ adapter }` argument; config file requires explicit `--config ./prisma/prisma.config.ts` flag
- **Dev authentication**: User picker at /auth/signin instead of Azure AD for development speed
- **Permission caching**: Redis with 5-minute TTL via Upstash
- **12 admin nav items**: groups, project-roles, issue-security, permissions, and 8 others
- **Provider interfaces**: StorageProvider, RealTimeProvider, EmailProvider abstracted for Track A to Track B migration
