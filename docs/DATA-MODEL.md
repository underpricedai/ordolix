# Ordolix - Data Model Reference

## Overview

99 Prisma models organized into ten sections: Auth, Core, Add-On Features, Integrations, Permissions & Security, Plans, Structure, Budgets, Capacity, and Test Cycles. All tables include `organizationId` for multi-tenant row-level isolation.

## Section 1: Auth (4 models)

| Entity | Description | Key Fields/Relationships |
|--------|-------------|--------------------------|
| User | Azure AD synced user | email (unique), name, locale, timezone. Has Roles, Issues, TimeLogs, Approvals, GroupMembers, ApiTokens |
| Account | OAuth provider account | userId, provider, providerAccountId, access_token, refresh_token. Belongs to User |
| Session | Active user session | sessionToken (unique), userId, expires. Belongs to User |
| VerificationToken | Email verification token | identifier, token, expires. Composite unique on [identifier, token] |

## Section 2: Core Entities (33 models)

| Entity | Description | Key Fields/Relationships |
|--------|-------------|--------------------------|
| Organization | Top-level tenant | slug (unique), name, logo, accentColor, favicon, plan, trialEndsAt, ssoConfig (JSONB), settings (JSONB). Has Projects, Users, Roles, Groups, PermissionSchemes |
| OrganizationMember | User membership in org | organizationId, userId, role (default "member"). Unique on [organizationId, userId] |
| Project | Issue container | organizationId, name, key, projectType, templateKey, issueCounter, isArchived, permissionSchemeId, issueSecuritySchemeId. Has Workflow, IssueTypes, Components, Versions, Boards, Sprints |
| ProjectMember | User membership in project | projectId, userId, role, projectRoleId. Unique on [projectId, userId] |
| Component | Project sub-area | projectId, name, description, lead. Unique on [projectId, name] |
| Version | Release/version | projectId, name, startDate, releaseDate, status. Has ReleaseNotes, Issues |
| ReleaseNote | Auto-generated release notes | versionId, content (Text), generatedAt |
| IssueType | Issue classification | name, icon, color, isSubtask, hierarchyLevel, category. Has Issues, IssueTemplates |
| Priority | Issue priority level | name, rank, color, slaMultiplier. Unique on [organizationId, rank] |
| Resolution | Issue resolution reason | name, description. Unique on [organizationId, name] |
| Workflow | State machine definition | name, description, isDefault, isActive. Has WorkflowStatuses, Transitions, Projects |
| Status | Workflow state | name, category (TO_DO/IN_PROGRESS/DONE), color. Has WorkflowStatuses, Issues, Transitions |
| WorkflowStatus | Status assignment to workflow | workflowId, statusId, position. Unique on [workflowId, statusId] |
| Transition | Directed edge between statuses | workflowId, name, fromStatusId, toStatusId, validators (JSON), conditions (JSON), postFunctions (JSON). Has ApprovalRequirements |
| ApprovalRequirement | Approval gate on transition | transitionId, approverRole, minApprovals |
| Issue | Core work item | key (unique), summary, description, issueTypeId, statusId, priorityId, resolutionId, assigneeId, reporterId, parentId, sprintId, fixVersionId, labels[], storyPoints, originalEstimate, remainingEstimate, timeSpent, dueDate, startDate, rank, securityLevelId, isArchived, deletedAt. Has Comments, Attachments, History, Watchers, Links, TimeLogs, Checklists, SLAInstances, GanttDeps, TestCaseLinks, Incidents, Approvals, Votes |
| IssueWatcher | User watching an issue | issueId, userId. Unique on [issueId, userId] |
| IssueLink | Typed link between issues | linkType, fromIssueId, toIssueId. Unique on [linkType, fromIssueId, toIssueId] |
| IssueRank | Backlog ordering | issueId, rank (lexorank string), contextId. Unique on [issueId, contextId] |
| Comment | Issue comment | issueId, authorId, body (Text), isInternal |
| Attachment | File attached to issue | issueId, uploaderId, filename, mimeType, size, storageKey |
| IssueHistory | Field change audit trail | issueId, userId, field, oldValue (Text), newValue (Text) |
| CustomField | Field definition with rollup | name, fieldType, description, options (JSON), defaultValue (JSON), context (JSON), isRequired, aggregation (sum/min/max/avg) |
| CustomFieldValue | Custom field value on entity | fieldId, entityId, entityType ("issue"/"asset"), value (JSON). Unique on [fieldId, entityId, entityType] |
| Board | Kanban/Scrum view | projectId, name, boardType, columns (JSON), swimlanes (JSON), cardFields (JSON), cardColor, quickFilters (JSON), filterQuery |
| Sprint | Time-boxed iteration | projectId, name, goal (Text), startDate, endDate, status (future/active/completed). Has Issues |
| Dashboard | Widget collection | name, ownerId, isShared, layout (JSON). Has DashboardWidgets |
| DashboardWidget | Single dashboard widget | dashboardId, widgetType, title, config (JSON), position (JSON) |
| Queue | Service request queue | projectId, name, filterQuery, sortBy, assignmentRule (JSON) |
| AuditLog | Immutable change record | entityType, entityId, action, diff (JSON), ipAddress, userAgent, userId |
| AutomationRule | Trigger-condition-action rule | projectId (nullable), name, trigger (JSON), conditions (JSON), actions (JSON), priority, enabled, executionCount. Has AutomationExecutions |
| AutomationExecution | Single rule execution record | ruleId, triggerId, conditionResults (JSON), actionsExecuted (JSON), duration, status, error |
| AutomationTemplate | Reusable rule template | name, description, trigger (JSON), conditions (JSON), actions (JSON), category, isBuiltIn |

## Section 3: Add-On Feature Entities (24 models)

| Entity | Description | Key Fields/Relationships |
|--------|-------------|--------------------------|
| TimeLog | Time entry on an issue | issueId, userId, date, duration, description, billable, approvalStatus, timesheetId |
| Timesheet | Aggregated time per user/period | userId, periodStart, periodEnd, status (draft/submitted/approved), submittedAt, approvedAt, approvedBy. Has TimeLogs |
| GanttDependency | Issue dependency for timeline | sourceIssueId, targetIssueId, dependencyType (FS/SS/FF/SF), lag |
| SLAConfig | SLA metric definition | projectId (nullable), name, metric, targetDuration, startCondition (JSON), stopCondition (JSON), pauseConditions (JSON), calendar (JSON), escalationRules (JSON), isActive. Has SLAInstances |
| SLAInstance | Active SLA on an issue | issueId, slaConfigId, status, elapsedMs, remainingMs, breachTime, startedAt, pausedAt, completedAt |
| Checklist | Checklist on an issue | issueId, title, position. Has ChecklistItems |
| ChecklistItem | Individual checklist item | checklistId, text, isChecked, assigneeId, dueDate, position |
| AssetType | CMDB object type definition | name, icon, schema (JSON attribute definitions). Has Assets |
| Asset | CMDB configuration item | assetTypeId, name, status, attributes (JSON). Has AssetRelationships |
| AssetRelationship | Link between two assets | fromAssetId, toAssetId, relationshipType. Unique on [fromAssetId, toAssetId, relationshipType] |
| TestSuite | Test case folder/grouping | name, description, parentId (self-referential hierarchy). Has TestCases, child TestSuites |
| TestCase | Test case definition | testSuiteId, title, description, preconditions, steps (JSON), expectedResult, parameters (JSON), priority, status. Has TestResults, TestCaseIssueLinks |
| TestCaseIssueLink | Link between test case and issue | testCaseId, issueId, linkType (default "tests"). Unique on [testCaseId, issueId] |
| TestRun | Test plan execution | name, status, executedBy, testCycleId. Has TestResults |
| TestResult | Individual test execution result | testRunId, testCaseId, status (pass/fail/skip), comment, duration, executedAt. Unique on [testRunId, testCaseId] |
| Incident | Incident record | issueId, severity, timeline (JSON), communications (JSON), statusPageUpdate (Text), startedAt, resolvedAt |
| Approval | Approval request | issueId, approverId, status, decision, comment, delegatedTo, expiresAt, decidedAt |
| FormTemplate | Dynamic form definition | name, description, config (JSON), isActive. Has FormSubmissions |
| FormSubmission | Submitted form data | templateId, issueId (nullable), submittedBy, data (JSON), status |
| Retrospective | Sprint retro board | projectId, name, sprintId, status, categories (JSON). Has RetroCards |
| RetroCard | Individual retro card | retrospectiveId, authorId, category, text (Text), votes, linkedIssueId |
| Script | Custom ScriptRunner script | name, description, triggerType, code (Text), isEnabled. Has ScriptExecutions |
| ScriptExecution | Script execution record | scriptId, executedBy, status, output (Text), error (Text), duration |
| SavedReport | Report configuration | name, reportType, query (JSON), dimensions (JSON), measures (JSON), chartType, filters (JSON), visualization (JSON), isShared, schedule (JSON), recipients (JSON), createdBy |

## Section 4: Integration Entities (18 models)

| Entity | Description | Key Fields/Relationships |
|--------|-------------|--------------------------|
| IntegrationConfig | External service config | provider, config (JSON), encryptedTokens (Text), webhookSecret, isActive. Unique on [organizationId, provider] |
| SharePointLink | Issue to SharePoint resource | issueId, resourceId, resourceType, url, title, preview (JSON) |
| GitHubLink | Issue to GitHub resource | issueId, resourceType, owner, repo, number, sha, branch, state, url |
| SalesforceLink | Issue to Salesforce record | issueId, recordType, recordId, displayName, syncStatus, fieldMapping (JSON) |
| MCPSession | Active MCP client session | clientName, permissions (JSON), lastActiveAt |
| TeamsChannelMapping | Links project to Teams channel | projectId, channelId, tenantId, events (JSON), quietHours (JSON). Unique on [projectId, channelId] |
| TeamsNotification | Tracks sent Teams notifications | issueId, channelId, messageId, cardVersion, sentAt |
| OutlookSubscription | Email-to-issue Graph subscription | projectId, subscriptionId (unique), emailAddress, expiresAt |
| EmailThread | Maps email threads to issues | issueId, messageId (unique), threadId, subject |
| Filter | Saved AQL query | projectId (nullable), ownerId, name, aql (Text), sharedWith (JSON), isStarred, subscriptionEnabled |
| IssueTemplate | Pre-filled issue template | projectId, issueTypeId, name, fields (JSON), description (Text) |
| NotificationPreference | User notification settings | userId, projectId (nullable), event, channels (JSON), digestFrequency. Unique on [userId, projectId, event] |
| NotificationRecord | Sent notification log | userId, event, issueId, channel, title, body (Text), metadata (JSON), isRead, sentAt, readAt |
| Vote | User vote on issue | issueId, userId. Unique on [issueId, userId] |
| ApiToken | Personal API access token | userId, name, tokenHash (unique), lastUsedAt, expiresAt |
| BillingSubscription | Stripe subscription link | organizationId (unique), stripeCustomerId (unique), plan, status, currentPeriodEnd |
| UsageMetric | Track usage per tenant | metric, value, measuredAt. Indexed on [organizationId, metric, measuredAt] |
| WebhookEndpoint | Outbound webhook config | url, events (JSON), secretHash, isActive, lastTriggeredAt |

## Section 5: Permissions & Security (9 models)

Jira-style RBAC with project roles, groups, permission schemes, and issue-level security. Replaces Jira's built-in permission system.

| Entity | Description | Key Fields/Relationships |
|--------|-------------|--------------------------|
| ProjectRole | Named role within projects | name, description, isDefault. Has ProjectMembers, PermissionGrants. Unique on [organizationId, name] |
| Group | Named group of users | name, description. Has GroupMembers, PermissionGrants, IssueSecurityLevelMembers. Unique on [organizationId, name] |
| GroupMember | User membership in group | groupId, userId. Unique on [groupId, userId] |
| PermissionScheme | Collection of permission grants | name, description, isDefault. Has PermissionGrants, Projects. Unique on [organizationId, name]. Assigned to projects via Project.permissionSchemeId |
| PermissionGrant | Single permission rule in a scheme | permissionSchemeId, permissionKey, holderType (project_role/group/user/reporter/assignee/anyone), projectRoleId, groupId, userId. Indexed on [permissionSchemeId, permissionKey] |
| GlobalPermission | Org-wide permission grant | permissionKey, holderType, groupId, userId. Indexed on [organizationId, permissionKey] |
| IssueSecurityScheme | Collection of security levels | name, description. Has IssueSecurityLevels, Projects. Assigned to projects via Project.issueSecuritySchemeId |
| IssueSecurityLevel | Visibility level for issues | issueSecuritySchemeId, name, description, orderIndex. Has IssueSecurityLevelMembers, Issues. Issues reference via Issue.securityLevelId |
| IssueSecurityLevelMember | Who can see issues at a level | issueSecurityLevelId, holderType, projectRoleId, groupId, userId |

## Section 6: Plans / Advanced Roadmaps (3 models)

Cross-project roadmaps with what-if scenarios. Replaces Jira Advanced Roadmaps (formerly Portfolio for Jira).

| Entity | Description | Key Fields/Relationships |
|--------|-------------|--------------------------|
| Plan | Cross-project roadmap | name, description (Text), ownerId, isShared, status. Has PlanIssueScopes, PlanScenarios |
| PlanIssueScope | Project/issue included in a plan | planId, projectId, issueId (nullable for whole-project scope), position. Unique on [planId, projectId, issueId] |
| PlanScenario | What-if scenario on a plan | planId, name, isDraft, isBaseline, overrides (JSON array of field changes) |

## Section 7: Structure Views (1 model)

Hierarchical tree views for issues. Replaces the Structure for Jira add-on.

| Entity | Description | Key Fields/Relationships |
|--------|-------------|--------------------------|
| StructureView | Configurable tree visualization | projectId (nullable for cross-project), ownerId, name, groupBy (default "epic"), columns (JSON), sortBy (default "rank"), filterQuery (Text), isShared |

## Section 8: Budgets & Cost Management (3 models)

Project cost tracking and budget management. Replaces Tempo Cost Tracker.

| Entity | Description | Key Fields/Relationships |
|--------|-------------|--------------------------|
| Budget | Cost budget for a project period | projectId, name, amount, currency (default "USD"), costType (opex/capex), periodStart, periodEnd, alertThreshold (default 80%). Has BudgetEntries |
| CostRate | Hourly cost rate definition | userId (nullable), projectRoleId (nullable), ratePerHour, currency, effectiveFrom, effectiveTo. Supports per-user or per-role rates |
| BudgetEntry | Individual cost line item | budgetId, timeLogId (unique, links to TimeLog), userId, hours, ratePerHour, cost, costType, currency, date |

## Section 9: Capacity Planning (3 models)

Resource planning and allocation. Replaces Tempo Planner.

| Entity | Description | Key Fields/Relationships |
|--------|-------------|--------------------------|
| TeamCapacity | Aggregate capacity for a team/sprint | projectId, sprintId (nullable), periodStart, periodEnd, totalHours, allocatedHours. Unique on [projectId, periodStart, periodEnd] |
| UserAllocation | User allocation to a project | userId, projectId, percentage (default 100%), hoursPerDay (default 8), startDate, endDate |
| TimeOff | User time off / leave | userId, date, hours (default 8), type (vacation/sick/etc), description. Unique on [userId, date] |

## Section 10: Test Cycles (1 model)

Groups test runs into release cycles for organized test management.

| Entity | Description | Key Fields/Relationships |
|--------|-------------|--------------------------|
| TestCycle | Container for test runs in a release | name, description (Text), plannedStart, plannedEnd, status (default "not_started"). Has TestRuns (via TestRun.testCycleId) |

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
