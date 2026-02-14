# Ordolix - Development Plan

## 8-Month Timeline

Primary developer: Frank + Claude Code AI tooling (agent mode)

## Phase 1: Foundation + Demo Prep (Months 1-3)

| Week | Deliverable | Acceptance Criteria |
|------|-------------|-------------------|
| 1 | Project scaffolding: Next.js + Prisma + tRPC + Tailwind + shadcn/ui + Vitest + Playwright. CI/CD pipeline. Claude Code skills files. | npm run dev works; CI passes; skills files reviewed |
| 1-2 | Prisma schema for all 40+ entities with seed data scripts | prisma migrate runs cleanly; seed creates realistic test data; schema comments on all fields |
| 2-3 | Azure AD SSO authentication (dev tenant) | Login works; roles display; session management functional |
| 3-5 | Issue CRUD + custom fields + Epic Sum Up rollup engine | CRUD works; custom fields persist; rollup computes in real-time |
| 5-7 | Workflow engine with approval gates + permission system | Transitions enforced; validators block invalid moves; RBAC on all endpoints |
| 7-9 | Board views (Kanban + list) with real-time updates | Drag-and-drop works; real-time sync across tabs; swimlanes functional |
| 9-11 | Gantt charts with dependencies and critical path | Timeline renders; dependencies display; drag-to-reschedule; critical path highlights |
| 11-12 | Search (AQL) + dashboards + tooltips | AQL returns correct results; dashboards configurable; tooltips on all features |
| 12 | Stakeholder demo preparation | Demo environment on Vercel with realistic data |

**MILESTONE: Stakeholder demo at end of Month 3.** Demo shows core issue tracking, Gantt charts, Epic Sum Up, real-time boards, and cost comparison.

## Phase 2: Platform Complete (Months 4-5)

| Week | Deliverable | Acceptance Criteria |
|------|-------------|-------------------|
| 13-14 | Time tracking: timers, manual entry, timesheets, approvals | Timer start/stop; timesheet grid; approval workflow; rollup |
| 14-15 | Advanced SLAs: multi-metric, calendars, escalations, predictions | SLA clocks track; escalations fire; predictions alert |
| 15-16 | Automation engine + scripting engine | Rules execute; scripts run sandboxed; execution logs |
| 16-17 | Checklists + dynamic forms + approval workflows | Checklists CRUD; forms render conditionally; approvals gate transitions |
| 17-18 | Report builder + notification system | Reports build/render; scheduled delivery; notifications configurable |
| 18-20 | Service management: queues, request types, customer portal | Queues functional; portal renders forms; SLAs track |

## Phase 3: Integrations & Enterprise (Months 6-7)

| Week | Deliverable | Acceptance Criteria |
|------|-------------|-------------------|
| 21-22 | SharePoint + GitHub integration | SharePoint linking/search; GitHub PRs auto-link |
| 22-23 | Salesforce + Power BI OData endpoint | Cases create tickets; status syncs; Power BI connects |
| 23-24 | MCP server + test management | Claude queries via MCP; test cases/plans/runs functional |
| 24-25 | CMDB/assets + incident management + retrospectives | Assets CRUD; incidents from issues; retro action items create issues |
| 25-28 | Migration toolkit: Jira + all add-on data | Dry run migration with full data integrity validation |

## Phase 4: Launch (Month 8)

| Week | Deliverable | Acceptance Criteria |
|------|-------------|-------------------|
| 29-30 | Internal beta with pilot teams | 3+ teams using Ordolix daily |
| 30-31 | Bug fixes, performance optimization, UX polish | All critical bugs resolved; performance budgets met |
| 31-32 | Final migration, cutover, documentation, training | All projects migrated; Jira decommissioned; user guides published |

## Demo Strategy

### Demo Environment
- Vercel preview URL (ordolix-demo.vercel.app)
- Realistic (non-sensitive) data from Jira export
- Azure AD SSO for stakeholder login
- All Tier 1 features functional

### Demo Narrative
1. Cost slide: current Atlassian spend vs $25/mo infrastructure
2. Board view side-by-side with Jira — feature parity, cleaner UI
3. Gantt charts — "replaces BigPicture at $X/year"
4. Epic Sum Up rollup — "replaces plugin at $X/year"
5. AQL search — "same power as JQL, cleaner syntax"
6. Real-time collaboration (two devices)
7. MCP integration — Claude Code creates issue via natural language
8. Roadmap: Phase 2 add-ons, Phase 3 integrations, Phase 4 migration

### Buy-In Success Criteria
- Leadership approval for dedicated dev time
- Budget for Azure infrastructure (Track B)
- 3+ pilot teams identified
- IT Security review initiated

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Scope exceeds 8 months | High | Tier-based priority; Tier 1 delivers demo in 3 months |
| Single developer dependency | High | Self-documenting code, Claude skills, comprehensive tests, modular arch |
| Vercel serverless limitations | Medium | Ably for real-time, Trigger.dev for long jobs; abstraction layer |
| Scripting engine security | High | isolated-vm via Trigger.dev; resource limits; no fs/network; code review |
| Migration data integrity | High | Automated validation; multiple dry runs; parallel operation |
| Stakeholder demo fails | Medium | Focus on visually impressive Tier 1; detailed cost comparison |

## Immediate Next Steps

1. Initialize GitHub repo with Next.js 15, TypeScript strict, Prisma, tRPC, Tailwind, shadcn/ui, Vitest, Playwright
2. Create CLAUDE.md and all Claude Code skills files
3. Configure Vercel project linked to GitHub with preview deployments
4. Set up Neon database with dev branch and Prisma
5. Set up Upstash Redis and QStash with Vercel integration
6. Register Azure AD dev tenant (M365 Developer Program)
7. Create GitHub Actions CI/CD with all quality gates
8. Begin Phase 1: Prisma schema (40+ models) as first task
