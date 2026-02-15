# Ordolix - Feature Specifications

## Feature Implementation Priority

### Tier 1: Demo-Critical
These are required for the stakeholder demo at end of Month 3.

| Feature | Key Architecture Decision |
|---------|--------------------------|
| **Issue CRUD + Custom Fields** | Custom field values as JSONB; Zod validation per field type |
| **Epic Sum Up (Rollup)** | Values computed async on child change; cached in Redis; pushed via real-time |
| **Workflow Engine** | Finite state machine as adjacency list in Postgres; sync validation; async post-functions via QStash |
| **Board Views** | Kanban + list with drag-and-drop; optimistic UI; real-time sync across tabs |
| **Gantt Charts** | Dependencies as GanttDependency records; critical path client-side via topological sort; D3.js rendering |
| **Search (AQL)** | Custom parser: Lexer → Parser → AST → SQL Generator; parameterized queries only |
| **Dashboards** | Drag-and-drop widget grid; widgets reference saved filters or inline AQL |
| **Plans / Advanced Roadmaps** | Cross-project timeline planning with scenarios; Plan module with scope (projects/epics), timeline view, scenario creation/comparison/application; multi-project issue queries with scenario overrides (JSON). Replaces Jira Advanced Roadmaps / BigPicture |
| **Structure Module** | Hierarchical tree visualization with configurable grouping (by epic, component, assignee, priority, sprint, label); generic grouping engine that groups issues by any field value; tree builder with aggregate computation (sum story points, progress); saved views. Replaces Structure for Jira plugin |

### Tier 2: Platform Complete
| Feature | Key Architecture Decision |
|---------|--------------------------|
| **Time Tracking** | Timer state in Redis; manual entries in TimeLog table; timesheets via Postgres materialized views; timesheet approval workflow (submit/approve/reject); timer/stopwatch hook; time reports with aggregation |
| **Advanced SLAs** | Background worker via QStash at 1-min intervals; pause/resume on status change; breach predictions from rolling average; business hours calendar with timezone-aware calculation of business milliseconds respecting weekends and holidays; escalation processing that evaluates rules when SLA approaches breach and triggers notifications |
| **Automation Engine** | Visual rule builder; 21 triggers, 12 conditions, 22 actions; smart values; max 100 exec/issue/hour; circuit break at 10 chains |
| **Scripting Engine** | isolated-vm sandbox via Trigger.dev; 128MB memory, 5s CPU, 100 SDK calls max |
| **Checklists** | Ordered items with assignee, due date; workflow-integrated completion requirements |
| **Dynamic Forms** | JSON schema in FormTemplate.config (JSONB); client-side rendering; conditional logic |
| **Approval Workflows** | Multi-stage, parallel/sequential; Azure AD groups; delegation; expiry |
| **Report Builder** | Dynamic SQL from dimension/measure configs; results cached in Redis |
| **Notifications** | 30 events, 6 channels (in-app, email, Teams chat, Teams channel, PWA push, webhook) |
| **Service Management** | Queues, request types, customer portal, SLA tracking; queue auto-assignment with strategies: round_robin, least_busy, manual |
| **Budget & Cost Management** | CAPEX/OPEX tracking; cost rates (per-user and per-role); budget entries linked to time logs; cost = hours x rate resolved per TimeLog (user-specific, role-based, org default); budget vs actual comparison; forecasting; alert thresholds. Replaces Tempo Cost Tracker |
| **Capacity Planner** | Team capacity computation; user allocation (percentage-based across projects); time-off tracking; capacity vs load analysis with overallocation warnings; working days x hours/day x allocation% minus time-off. Replaces Tempo Planner |
| **Priority Management** | CRUD with drag-to-reorder ranking; color picker; SLA multiplier configuration |
| **Issue Type Management** | CRUD with icon, color, hierarchy level, subtask flag, category |
| **Component Management** | Project-scoped CRUD (PM self-service) |
| **Version/Release Management** | Project-scoped CRUD with status lifecycle (unreleased, released, archived) |
| **Permission System** | Full Jira-style RBAC: ProjectRole, Group, PermissionScheme, PermissionGrant, GlobalPermission, IssueSecurityScheme/Level; Redis-cached permission checker (5min TTL); requirePermission and adminProcedure tRPC middleware |

### Tier 3: Enterprise Ready
| Feature | Key Architecture Decision |
|---------|--------------------------|
| **Test Management** | Steps as JSONB array; results append-only; coverage matrix as Postgres view; test cycles (CRUD); bulk result recording; folder hierarchy (TestSuite parentId); parameterized tests |
| **CMDB/Assets** | Configurable asset types; attributes JSONB; relationships; Azure AD device sync |
| **Incident Management** | Severity escalation; communication templates; status page integration |
| **Retrospectives** | Anonymous mode; voting; auto-create issues from action items |
| **SharePoint** | Microsoft Graph API; bi-directional linking; search; page creation |
| **GitHub** | GitHub App; PR/branch/commit linking; automated transitions; deployment tracking |
| **Salesforce** | REST API + Platform Events; case-to-ticket; bi-directional status sync |
| **Power BI** | OData v4 endpoint; .pbit templates; row-level security |
| **MCP Server** | Separate process; stdio + HTTP transport; API token auth; full CRUD + query |
| **Migration Toolkit** | Jira API export; add-on data; transform; import; validation suite |

## Automation Builder Specification

### Visual Rule Builder
- Drag-and-drop canvas: Trigger (blue), Condition (yellow), Action (green), Branch (purple)
- Connection lines animate during testing
- Live plain-English summary below canvas
- Validation before save

### 21 Trigger Types
Issue Created, Issue Updated, Field Value Changed, Status Changed, Comment Added, Attachment Added, Issue Linked, Sprint Started, Sprint Completed, SLA Breach Warning, SLA Breached, Approval Decision, Time Logged, Test Run Completed, Incident Created, Salesforce Case Created, GitHub PR Merged, GitHub PR Opened, Webhook Received, Scheduled (cron), Manual (button)

### 12 Condition Types
Field Comparison, User/Group Check, Issue Type Check, Priority Check, Label Check, AQL Expression, Time-Based, SLA Status, Checklist Status, Related Issues, Regex Match, Sub-Conditions (nested AND/OR)

### 22 Action Types
Set Field Value, Transition Issue, Assign Issue, Add Comment, Send Email, Send Teams Notification, Send Webhook, Create Issue, Create Sub-Task, Link Issues, Add/Remove Label, Log Time, Start/Stop Timer, Create SharePoint Page, Trigger Incident, Update Salesforce Case, Add/Remove Watcher, Clone Issue, Move Issue, Delete Issue, Execute Script, Branch (If/Else)

### Smart Values
`{{issue.key}}`, `{{issue.summary}}`, `{{issue.status.name}}`, `{{issue.priority.name}}`, `{{issue.assignee.displayName}}`, `{{issue.assignee.email}}`, `{{issue.reporter.displayName}}`, `{{issue.customField["Story Points"]}}`, `{{issue.url}}`, `{{trigger.user.displayName}}`, `{{trigger.comment.body}}`, `{{trigger.changelog.*}}`, `{{now}}`, `{{now.plusDays(3)}}`, `{{sprint.name}}`, `{{project.name}}`

### 12 Pre-built Templates
Auto-assign, close stale issues, SLA escalation, PR merged → Done, customer response → resume SLA, new bug → Teams, sprint complete → move incomplete, auto-close resolved, Salesforce sync, incident postmortem, approval reminder, epic auto-complete

## Microsoft Teams Integration

### Channel Notifications
- Project-to-channel mapping in project settings
- Adaptive Cards with action buttons (Assign, Change Status, Comment, Approve/Reject)
- Thread replies for subsequent events on same issue
- Quiet hours per channel

### Personal Bot
- Natural language commands: "Show my issues", "Create a bug in ORDOLIX", "Move ORDOLIX-123 to Done"
- Opt-in personal chat notifications

### Teams Tab App
- Embed board, dashboard, or queue as Teams tab
- SSO via Teams context token

## Microsoft Outlook Integration

### Email-to-Issue
- Dedicated inbound email per project/queue
- Subject → summary, body → description, sender → reporter, attachments → attachments
- Reply threading: replies become comments
- Routing rules by sender domain, subject keywords

### Outlook Add-In
- Sidebar in Outlook desktop/web/mobile
- View linked issues, create from email, quick search, transition/assign/comment

### Calendar Integration
- Due dates on assignee's Outlook calendar
- Sprint start/end as calendar events
- SLA deadline reminders

## Notification System

### 6 Channels
In-App, Email (individual/digest), Teams Personal Chat, Teams Channel, PWA Push, Webhook

### Preference Resolution
Global defaults → per-project overrides → per-event granularity per channel
- Do Not Disturb (quiet hours)
- @mention always overrides preferences
- Mute specific issues

### 30 Notification Events
Issue Created/Assigned/Updated, Status Changed, Priority Changed, Comment Added, Comment @Mention, Description @Mention, Issue Deleted/Moved/Linked, Attachment Added, Watcher Added, SLA Warning (75%)/Breached, Approval Requested/Approved/Rejected, Sprint Started/Completed, Version Released, Timesheet Submitted/Decision, Test Run Completed, Incident Created/Updated/Resolved, Automation Failed, Script Failed, Admin Broadcast

## Jira Core Features (Gap Analysis)

### Included in v1
- Unified activity timeline with diff view
- Saved filters as first-class objects with sharing and subscriptions
- Quick search (Cmd+K) + Advanced AQL search
- Issue templates (pre-filled field configs)
- Full sprint management with velocity/burndown/burnup charts
- Release/version management with auto-generated release notes
- Backlog with drag-to-reorder (lexorank)
- Issue actions: Clone, Move, Split, Watch/Unwatch, Vote, Archive, Export PDF, Share
- Personal views: My Issues, Reported by Me, Recently Viewed, Watched, Voted, My Approvals, My Time Log
- Rich text editor (Tiptap/Plate) with @mentions, code blocks, tables
- Drag-and-drop file upload with clipboard paste
- Issue linking with visual dependency indicators and suggested links
- Issue archiving (auto-archive completed >90 days)
- Development panel (GitHub branches, PRs, commits, build status, deployments)
- Board enhancements: card aging, WIP limits, quick edit, column sub-groups, analytics overlay
