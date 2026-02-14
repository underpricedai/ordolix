# Ordolix - Data Model Reference

## Overview

40+ Prisma models organized into three categories: Core, Add-On Features, and Integrations. All tables include `organizationId` for multi-tenant row-level isolation.

## Core Entities

| Entity | Description | Key Relationships |
|--------|-------------|-------------------|
| Organization | Top-level tenant | Has Projects, Users, Roles. Fields: slug, name, logo, accentColor, favicon, plan, trialEndsAt, ssoConfig (JSONB), settings (JSONB) |
| User | Azure AD synced user | Roles, assigned Issues, TimeLogs, Approvals |
| Project | Issue container | Workflow, IssueTypes, Permissions, Components, Versions, Boards |
| Issue | Core work item | Comments, Attachments, CustomFieldValues, History, TimeLogs, Checklists, TestLinks, GanttDependencies |
| Workflow | State machine definition | Statuses, Transitions (with Validators, Conditions, PostFunctions, ApprovalGates) |
| Status | Workflow state | Category (TO_DO / IN_PROGRESS / DONE) |
| Transition | Directed edge between statuses | Validators, Conditions, PostFunctions, ApprovalRequirements |
| CustomField | Field definition with rollup config | Type, options, context, aggregation function |
| AutomationRule | Trigger-condition-action rule | Scoped to Project or Global, execution history. Fields: trigger (JSONB), conditions (JSONB), actions (JSONB), priority, enabled |
| Board | Kanban/Scrum view | Columns, filters, swimlanes |
| Dashboard | Widget collection | DashboardWidgets with saved queries |
| Queue | Service request queue | SLA configs, assignment rules |
| AuditLog | Immutable change record | Entity, action, user, timestamp, diff |

## Add-On Feature Entities

| Entity | Description | Key Relationships |
|--------|-------------|-------------------|
| TimeLog | Time entry on an issue | Issue, User, duration, billable flag, approval status |
| Timesheet | Aggregated time per user/period | TimeLogs, User, approval workflow |
| GanttDependency | Issue dependency for timeline | Source/target Issues, type (FS/SS/FF/SF), lag |
| SLAConfig | SLA metric definition | Queue/Project, targets, calendar, escalation rules, pause conditions |
| SLAInstance | Active SLA on an issue | Issue, SLAConfig, elapsed/remaining, breach status |
| Checklist | Checklist on an issue | Ordered ChecklistItems with assignee, due date, completion |
| Asset | CMDB configuration item | AssetType, attributes (JSONB), relationships, linked Issues |
| TestCase | Test case definition | TestSuite, steps (JSONB array), expected results, linked requirements |
| TestRun | Test plan execution | TestResults linking TestCases to pass/fail/skip (append-only) |
| Incident | Incident record | Issues, severity, timeline, communications, status page updates |
| Approval | Approval request | Issue/Transition, approvers, status, delegation, expiry |
| FormTemplate | Dynamic form definition | Conditional fields, validation rules, issue field mappings (JSONB config) |
| Retrospective | Sprint retro board | Categories, cards, votes, linked Issues |
| Script | Custom ScriptRunner script | Trigger type, TS/JS code, execution history |
| SavedReport | Report configuration | Dimensions, measures, chart type, schedule, recipients |

## Integration Entities

| Entity | Description | Key Relationships |
|--------|-------------|-------------------|
| SharePointLink | Issue → SharePoint resource | Graph API resource ID, preview metadata |
| GitHubLink | Issue → GitHub resource | PR/branch/commit, state, review/merge status |
| SalesforceLink | Issue → Salesforce record | Case/Account/Contact, sync status, field mapping |
| IntegrationConfig | External service config | OAuth tokens (encrypted), webhooks, field mappings, sync rules |
| MCPSession | Active MCP client session | Connected clients, permissions, audit log |

## Additional Entities (Feature Parity)

| Entity | Description | Key Fields |
|--------|-------------|------------|
| TeamsChannelMapping | Links project to Teams channel | projectId, channelId, tenantId, events (JSONB), quietHours |
| TeamsNotification | Tracks sent Teams notifications | issueId, channelId, messageId, cardVersion, sentAt |
| OutlookSubscription | Email-to-issue Graph subscription | projectId, subscriptionId, emailAddress, expiresAt |
| EmailThread | Maps email threads to issues | issueId, messageId, threadId, subject |
| AutomationExecution | Single rule execution record | ruleId, triggerId, conditionResults, actionsExecuted, duration, status, error |
| AutomationTemplate | Reusable rule template | name, description, trigger, conditions, actions, category, isBuiltIn |
| Filter | Saved AQL query | name, aql, ownerId, sharedWith (JSONB), isStarred, subscriptionEnabled |
| IssueTemplate | Pre-filled issue template | name, projectId, issueTypeId, fields (JSONB), description template |
| IssueRank | Backlog ordering | issueId, rank (lexorank string), contextId |
| IssueArchive | Archived issue marker | issueId, archivedAt, archivedBy, originalStatus |
| Vote | User vote on issue | issueId, userId, createdAt |
| NotificationPreference | User notification settings | userId, projectId (nullable), event, channels (JSONB), digestFrequency |
| NotificationRecord | Sent notification log | userId, event, issueId, channel, sentAt, readAt |
| Version | Release/version | projectId, name, startDate, releaseDate, status, description |
| ReleaseNote | Auto-generated release notes | versionId, content, generatedAt |
| BillingSubscription | Stripe subscription link | organizationId, stripeCustomerId, plan, status, currentPeriodEnd |
| UsageMetric | Track usage per tenant | organizationId, metric (users/issues/storage), value, measuredAt |

## Default System Fields (on Issue table)

### Core Fields
| Field | Type | Required | Default |
|-------|------|----------|---------|
| Key | String (auto) | Yes | PROJECT-N (auto-generated) |
| Summary | String | Yes | None |
| Description | Rich Text | No | Empty |
| Issue Type | Relation | Yes | Task |
| Status | Relation | Yes | First status in workflow |
| Priority | Relation | Yes | Medium |
| Resolution | Relation | No | Null (unresolved) |
| Assignee | Relation (User) | No | Unassigned |
| Reporter | Relation (User) | Yes | Current user |
| Labels | String[] | No | Empty array |
| Components | Relation[] | No | Empty |
| Fix Version | Relation | No | None |
| Sprint | Relation | No | None (Backlog) |
| Parent | Relation (Issue) | No | None |

### Estimation & Time Fields
| Field | Type | Rollup Behavior |
|-------|------|----------------|
| Story Points | Number (float) | Sum from children (Epic Sum Up) |
| Original Estimate | Duration (seconds) | Sum from children |
| Remaining Estimate | Duration (seconds) | Sum from children |
| Time Spent | Duration (seconds) | Sum from children |
| Due Date | DateTime | Earliest child due date |
| Start Date | DateTime | Earliest child start date |

## Default Issue Link Types

| Link Type | Outward | Inward | Behavior |
|-----------|---------|--------|----------|
| Blocks | blocks | is blocked by | Visual indicator; transition validator |
| Clones | clones | is cloned by | Informational |
| Duplicates | duplicates | is duplicated by | Suggests closing one |
| Relates to | relates to | relates to | Bidirectional info |
| Causes | causes | is caused by | Incident/problem linking |
| Epic Link | has epic | is epic of | System-managed |
| Parent/Child | is parent of | is child of | System-managed hierarchy |

## Multi-Tenancy Data Model

- Every table has `organizationId` foreign key
- Prisma middleware automatically injects org filter on all queries
- Storage: per-org prefixes (`org-{id}/attachments/`)
- Redis: per-org key prefixes (`org:{id}:cache:...`)
- System defaults created per-organization during onboarding
