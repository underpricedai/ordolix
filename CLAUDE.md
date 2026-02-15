# Ordolix - Enterprise Project & Issue Tracking Platform

## What Is This Project?

Ordolix is a Jira Cloud replacement built as a modern, AI-native enterprise issue tracker. It replaces Jira Cloud, Confluence (via SharePoint), and all marketplace add-ons (Tempo, ScriptRunner, BigPicture, eazyBI, Insight, ProForma, etc.) with a single unified platform. Hosted on Vercel with Neon DB.

**Origin:** Proofpoint IT Engineering internal tool, with a path to external SaaS product.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + shadcn/ui (Radix UI) |
| API | tRPC (internal) + REST /api/v1/ (external) |
| Database | Neon (PostgreSQL 16) via Prisma ORM |
| Cache/Queue | Upstash Redis + Upstash QStash |
| Auth | NextAuth.js / Auth.js with Azure AD |
| Real-time | Ably or SSE + Upstash pub/sub |
| Storage | Cloudflare R2 (S3-compatible) |
| Background Jobs | Trigger.dev (long-running), QStash (short) |
| Testing | Vitest (unit/integration) + Playwright (E2E) |
| Logging | Pino (structured JSON) |
| Email | Resend + React Email |
| Search | AQL (Ordolix Query Language) - custom parser |
| Charts | D3.js (Gantt, visualizations) |
| Code Editor | Monaco Editor (ScriptRunner) |
| i18n | next-intl |

## Hosting Architecture

**Track A (Current - Independent Dev):** Vercel + Neon + Upstash + Cloudflare R2 (~$20-40/mo)
**Track B (Future - Enterprise):** Azure Container Apps + Azure PostgreSQL + Azure Redis + Azure Blob Storage

All infrastructure-dependent code is abstracted behind provider interfaces (StorageProvider, RealTimeProvider, EmailProvider) so Track A -> Track B migration requires only config changes.

## Directory Structure

```
src/app/                    — Next.js App Router pages and layouts
src/modules/                — Feature modules (self-contained, 30 total)
  issues/                   — Issue CRUD, history, watchers, voting, links
  workflows/                — Workflow engine, transitions, validators
  boards/                   — Kanban/Scrum board views
  projects/                 — Project management, components, versions
  sprints/                  — Sprint planning and management
  time-tracking/            — Time logs, timesheets, approval
  gantt/                    — Gantt charts, dependencies, critical path
  sla/                      — SLA configs, instances, business hours, escalation
  test-management/          — Test suites, cases, runs, cycles, results
  assets/                   — CMDB, asset types, relationships
  scripts/                  — ScriptRunner, sandboxed execution
  forms/                    — Dynamic forms, conditional logic
  reports/                  — Report builder, saved reports
  incidents/                — Incident management, severity, timeline
  retrospectives/           — Retro boards, cards, voting
  approvals/                — Multi-stage approval workflows
  checklists/               — Issue checklists with items
  dashboards/               — Dashboard widgets, layouts
  notifications/            — Notification preferences, delivery
  queues/                   — Service desk queues, auto-assignment
  search/                   — AQL parser, full-text search
  custom-fields/            — Custom field definitions, values
  users/                    — User management, profiles
  admin/                    — Admin services (priorities, issue types)
  permissions/              — RBAC, permission schemes, security levels
  plans/                    — Advanced Roadmaps, cross-project planning
  structure/                — Tree views, grouping, aggregates
  budgets/                  — Cost tracking, CAPEX/OPEX, rates
  capacity/                 — Resource planning, allocations, time-off
  automation/               — Automation rules, execution engine
src/shared/                 — Shared components, hooks, utilities, types
src/integrations/           — External integrations (sharepoint/, github/, salesforce/, powerbi/, mcp/)
src/server/                 — Server config, middleware, auth, DB client
src/emails/                 — React Email templates
src/messages/               — i18n translation files (en.json)
prisma/                     — Schema, migrations, seed files
tests/e2e/                  — Playwright E2E tests
tests/fixtures/             — Shared test factories and mock data
  factories.ts              — All factory functions
  defaults.ts               — Default configuration constants
  scenarios.ts              — Pre-built scenario functions
skills/                     — Claude Code skill files
docs/                       — Project documentation
ordolix-files/              — Source specification documents (.docx)
```

## Key Modules

issues, workflows, boards, projects, sprints, time-tracking, gantt, sla, test-management, assets, scripts, forms, reports, incidents, retrospectives, approvals, checklists, dashboards, notifications, queues, search, custom-fields, users, admin, permissions, plans, structure, budgets, capacity

## Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| Components | PascalCase.tsx | IssueDetail.tsx |
| Logic files | kebab-case.ts | workflow-engine.ts |
| Tests | *.test.ts | workflow-engine.test.ts |
| React components | PascalCase | IssueCard, BoardColumn |
| Functions/hooks | camelCase | useIssueQuery, parseAQL |
| Types/interfaces | PascalCase | Issue, WorkflowTransition |
| Prisma models | PascalCase singular | Issue, TimeLog, TestCase |
| tRPC routers | camelCase | issueRouter, workflowRouter |
| API routes | kebab-case | /api/issues, /api/time-tracking |
| Env vars | UPPER_SNAKE_CASE | DATABASE_URL |
| AQL keywords | UPPER_CASE | AND, OR, ORDER BY |

## Development Methodology

- **TDD is mandatory**: Write failing tests first, implement minimum code to pass, then refactor
- Test file co-location: tests live adjacent to source files
- Factory pattern for test fixtures (createTestIssue(), createTestWorkflow())
- 100% coverage on core business logic; 80% overall
- Vitest for unit/integration, Playwright for E2E, MSW for API mocking

## Error Handling

- Typed error classes: AppError > ValidationError, NotFoundError, PermissionError, ConflictError, IntegrationError
- Every error has a machine-readable code (e.g., WORKFLOW_TRANSITION_BLOCKED)
- Consistent API error response: { code, message, details, requestId }
- React ErrorBoundary at app and module level

## Core Design Principles

1. **Obvious Over Powerful** - Every feature discoverable without docs
2. **One Way to Do Things** - Single path to each configuration
3. **Show, Don't Configure** - Live previews in admin
4. **Speed as a Feature** - All page loads <500ms, optimistic UI
5. **Beautiful by Default** - 4px spacing system, purposeful color, microinteractions
6. **AI-Native, Not AI-Bolted** - MCP server as first-class integration

## Cross-Cutting Requirements (Apply to ALL modules)

- **Accessibility**: WCAG 2.1 AA. Semantic HTML, ARIA, keyboard nav, 4.5:1 contrast
- **i18n**: All strings via t() from next-intl, never hardcoded. Intl.* for dates/numbers
- **Dark Mode**: CSS variables with Tailwind dark: class strategy. Independent contrast validation
- **Security**: RBAC at tRPC middleware layer. Zod validation on all inputs. No sensitive data in logs
- **Performance**: Redis caching, optimistic UI, skeleton loading, sub-200ms search
- **Rate Limiting**: @upstash/ratelimit at tRPC middleware (300 req/min browser, 600 API token)

## Data Model Overview

99 Prisma models in nine categories:
- **Auth**: User, Account, Session, VerificationToken
- **Core**: Organization, OrganizationMember, Project, ProjectMember, Component, Version, ReleaseNote, IssueType, Priority, Resolution, Workflow, Status, WorkflowStatus, Transition, ApprovalRequirement, Issue, IssueWatcher, IssueLink, IssueRank, Comment, Attachment, IssueHistory, CustomField, CustomFieldValue, Board, Sprint, Dashboard, DashboardWidget, Queue, AuditLog, AutomationRule, AutomationExecution, AutomationTemplate
- **Add-On Features**: TimeLog, Timesheet, GanttDependency, SLAConfig, SLAInstance, Checklist, ChecklistItem, AssetType, Asset, AssetRelationship, TestSuite, TestCase, TestCaseIssueLink, TestRun, TestResult, TestCycle, Incident, Approval, FormTemplate, FormSubmission, Retrospective, RetroCard, Script, ScriptExecution, SavedReport
- **Integrations**: IntegrationConfig, SharePointLink, GitHubLink, SalesforceLink, MCPSession, TeamsChannelMapping, TeamsNotification, OutlookSubscription, EmailThread, Filter, IssueTemplate, NotificationPreference, NotificationRecord, Vote, ApiToken, BillingSubscription, UsageMetric, WebhookEndpoint
- **Permissions & Security**: ProjectRole, Group, GroupMember, PermissionScheme, PermissionGrant, GlobalPermission, IssueSecurityScheme, IssueSecurityLevel, IssueSecurityLevelMember
- **Plans & Roadmaps**: Plan, PlanIssueScope, PlanScenario
- **Structure**: StructureView
- **Budgets**: Budget, CostRate, BudgetEntry
- **Capacity**: TeamCapacity, UserAllocation, TimeOff

## Multi-Tenancy

Row-level isolation via organizationId on every table. Prisma middleware injects filter automatically. Per-org storage prefixes, Redis namespace isolation. Single DB with row-level isolation for v1.

## Feature Priority Tiers

- **Tier 1 (Demo-Critical)**: Issue CRUD, Workflows, Boards, Epic Sum Up, Gantt, Search (AQL), Dashboards
- **Tier 2 (Platform Complete)**: Time Tracking, SLAs, Automation, Scripting, Checklists, Forms, Approvals, Reports, Notifications
- **Tier 3 (Enterprise Ready)**: Test Management, CMDB, Incidents, Retros, SharePoint, GitHub, Salesforce, Power BI, MCP, Migration Toolkit

## CI/CD Pipeline

GitHub Actions: Lint > Type Check > Unit Tests > Integration Tests > E2E (PR to main) > Security Scan > Schema Validation > Build > Deploy
Branch strategy: main (production), feature/*, fix/* with squash merge
Neon branching per PR, Vercel preview deployments per PR

## Source Documentation

Five companion documents in `ordolix-files/`:
1. **Blueprint** - Features, architecture, tech stack, dev plan, cost analysis
2. **Defaults Reference** - All Jira defaults, seed data, factories, migration overlay
3. **Cross-Cutting Concerns** - Security, a11y, i18n, caching, indexing, admin panel, email, AQL
4. **Feature Parity Addendum** - Teams, Outlook, automation builder, notifications, Jira gap analysis
5. **Product Vision** - UX philosophy, screen specs, multi-tenancy, competitive positioning, pricing
