# Ordolix - Default Configuration Reference

This document defines every default configuration that ships out-of-the-box, mirroring Jira Cloud fresh instance defaults.

## Seed & Factory System

### Factory File Structure
- `tests/fixtures/factories.ts` — All factory functions
- `tests/fixtures/defaults.ts` — Default configuration constants (this data as TypeScript objects)
- `tests/fixtures/scenarios.ts` — Scenario functions composing multiple factories
- `prisma/seed.ts` — Core seed (imports from factories + defaults)
- `prisma/seed-demo.ts` — Demo dataset for stakeholder demos

### Factory Design Rules
- Every factory returns a plain object matching Prisma create input type
- Every field has a sensible default (createIssue() with no args = valid issue)
- Sequential IDs via counter for predictable assertions
- Factories do NOT write to DB (caller decides)
- Scenario functions DO write to DB (for integration tests and seeds)

### Required Factory Functions
createOrganization, createUser, createProject, createIssueType, createStatus, createWorkflow, createTransition, createPriority, createResolution, createIssue, createComment, createCustomField, createBoard, createSprint, createSLAConfig, createTimeLog, createTestCase, createAsset, createFormTemplate, createAutomationRule, createChecklist, createTestCycle, createPlan, createStructureView, createBudget, createCostRate, createCapacity, createAllocation, createTimeOff, createGroup, createProjectRole, createPermissionScheme

### Required Scenario Functions
- seedDefaults(prisma) — All default types, statuses, priorities, resolutions, workflows, permissions
- createProjectWithBoard(prisma) — Project + workflow + Kanban board + defaults
- createSprintWithIssues(prisma, projectId, count?) — Sprint with N issues in varied statuses
- createServiceDeskProject(prisma) — JSM-style with queues, SLAs, forms
- createPortfolioProject(prisma) — Project with budget, capacity allocation, and plan scope
- seedPermissions(prisma) — Default groups, roles, permission schemes, global permissions
- createDemoDataset(prisma) — 3 projects, 50+ issues, epics, Gantt deps, time logs

## Default Issue Types

### Software
| Name | Icon | Color | Subtask? | Hierarchy |
|------|------|-------|----------|-----------|
| Epic | lightning bolt | #904EE2 (purple) | No | 1 (parent) |
| Story | bookmark | #63BA3C (green) | No | 0 (standard) |
| Task | check square | #4BADE8 (blue) | No | 0 (standard) |
| Bug | circle dot | #E5493A (red) | No | 0 (standard) |
| Subtask | subtask icon | #4BADE8 (blue) | Yes | -1 (child) |

### Service Management
| Name | Icon | Color | JSM Category |
|------|------|-------|-------------|
| Service Request | headset | #4BADE8 | Service Request |
| Incident | warning triangle | #E5493A | Incident |
| Problem | search | #FF8B00 | Problem |
| Change | arrows rotate | #904EE2 | Change |

## Status Categories

| Category | Color | Behavior |
|----------|-------|----------|
| TO_DO | #42526E (blue-gray) | Not started. Leftmost board column. |
| IN_PROGRESS | #0052CC (blue) | Actively worked on. SLA clocks running. |
| DONE | #00875A (green) | Complete. SLA clocks stop. Resolution set. |

### Simplified Workflow Statuses (Default)
To Do (TO_DO), In Progress (IN_PROGRESS), Done (DONE)

### Classic Workflow Statuses
Open (TO_DO), In Progress (IN_PROGRESS), In Review (IN_PROGRESS), Reopened (TO_DO), Resolved (DONE), Closed (DONE)

### Service Management Statuses
Waiting for Support (IN_PROGRESS), Waiting for Customer (IN_PROGRESS, SLA pauses), Escalated (IN_PROGRESS), Pending Approval (IN_PROGRESS), Approved (IN_PROGRESS), Implementing (IN_PROGRESS), Under Investigation (IN_PROGRESS), Known Error (IN_PROGRESS), Canceled (DONE)

## Default Workflows

### Simplified Workflow (Default for new projects)
All transitions allowed between all statuses:
- To Do → In Progress (Start Progress)
- In Progress → Done (Done) [set resolution]
- In Progress → To Do (Stop Progress)
- Done → To Do (Reopen) [clear resolution]
- To Do → Done (Done) [set resolution]
- Done → In Progress (Reopen and Start) [clear resolution]

### Classic Software Workflow
Restricted transitions:
- Open → In Progress (requires assignee set)
- In Progress → In Review → Resolved (requires resolution) → Closed
- Resolved/Closed → Reopened (clear resolution) → In Progress

### Service Request Workflow
Open → Waiting for Support → Waiting for Customer (pause SLA) → Waiting for Support (resume SLA) → Pending Approval → Resolved → Closed. Any → Canceled.

### Incident Workflow
Open → In Progress → Escalated (notify escalation group) → In Progress → Resolved → Closed. In Progress ↔ Waiting for Customer.

## Default Priorities

| Name | Rank | Color | SLA Multiplier |
|------|------|-------|---------------|
| Highest | 1 | #CE0000 (red) | 0.25x (fastest) |
| High | 2 | #EA7D24 (orange) | 0.5x |
| Medium | 3 (default) | #FFAB00 (yellow) | 1.0x (baseline) |
| Low | 4 | #2A8735 (green) | 2.0x |
| Lowest | 5 | #4A6785 (blue-gray) | 4.0x |

## Default Resolutions
Done, Won't Do, Duplicate, Cannot Reproduce

## Default Permission Scheme

### Roles
- **Administrator**: Full project admin. Default: project creator + Azure AD admin group.
- **Member**: Standard participant. Default: all project members.
- **Viewer**: Read-only. Default: anyone in org (configurable).

### Permission Matrix
| Permission | Admin | Member | Viewer |
|-----------|-------|--------|--------|
| Browse Project | Y | Y | Y |
| Create Issues | Y | Y | N |
| Edit Issues | Y | Y | N |
| Delete Issues | Y | N | N |
| Transition Issues | Y | Y | N |
| Assign Issues | Y | Y | N |
| Add Comments | Y | Y | N |
| Delete Comments (own) | Y | Y | N |
| Delete Comments (all) | Y | N | N |
| Add Attachments | Y | Y | N |
| Log Time | Y | Y | N |
| Edit Time (all) | Y | N | N |
| Manage Sprints | Y | Y | N |
| Manage Board | Y | N | N |
| Manage Gantt Dependencies | Y | Y | N |
| Manage Checklists | Y | Y | N |
| Manage Test Cases | Y | Y | N |
| Manage Assets | Y | N | N |
| Manage Automation Rules | Y | N | N |
| Manage Scripts | Y | N | N |
| Administer Project | Y | N | N |

## Default Groups

| Group | Description |
|-------|-------------|
| jira-administrators | Organization-wide administrators |
| jira-software-users | Standard software project users |
| jira-servicemanagement-users | Service management users |
| jira-core-users | Basic project users |

## Default Project Roles

| Role | Description |
|------|-------------|
| Administrators | Full project administration |
| Developers | Development team members |
| Service Desk Team | Service desk agents |
| Service Desk Customers | External customers |

## Default Board Configuration

### Kanban Board (auto-created per project)
| Column | Mapped Statuses | WIP Limit |
|--------|----------------|-----------|
| To Do | To Do | No limit |
| In Progress | In Progress | No limit |
| Done | Done | No limit |

Card fields: Key, Summary, Priority icon, Assignee avatar, Story Points badge
Card color: by Priority (default)
Quick filters: "Only My Issues", "Recently Updated"
Swimlanes: None (options: Assignee, Epic, Priority, Issue Type)

## Default SLA Configurations

### Service Request SLAs
| Metric | Target (Medium) | Start | Stop | Pause |
|--------|----------------|-------|------|-------|
| Time to First Response | 4 business hours | Issue created | First agent comment | Waiting for Customer |
| Time to Resolution | 8 business hours | Issue created | Status → DONE | Waiting for Customer |

### Incident SLAs
| Metric | Target (Medium) | Start | Stop | Pause |
|--------|----------------|-------|------|-------|
| Time to First Response | 1 business hour | Issue created | First agent comment | Waiting for Customer |
| Time to Resolution | 4 business hours | Issue created | Status → DONE | Waiting for Customer |

### Business Hours Calendar
Monday-Friday, 9:00 AM - 5:00 PM, org default timezone. Holidays configured per org.

## Default Project Templates

| Template | Issue Types | Workflow | Board | Extras |
|----------|-----------|----------|-------|--------|
| Kanban Software | Epic, Story, Task, Bug, Subtask | Simplified (3 statuses) | Kanban | Backlog, Story Points |
| Scrum Software | Same | Simplified | Scrum (sprints) | + Sprints, Velocity chart |
| Bug Tracking | Bug, Task, Subtask | Classic (6 statuses) | Kanban | Environment, Components |
| IT Service Management | SR, Incident, Problem, Change | JSM workflows | Queue-based | SLAs, Forms, Approvals, Portal |
| Blank Project | Task only | Simplified | Kanban | Minimal |

## Default Dashboard Widgets
Assigned to Me, Activity Stream (7 days), Created vs Resolved (30 days), Pie Chart by Priority, Sprint Burndown (Scrum only), SLA Compliance (Service Desk only)

## Demo Seed Data

### Projects
- ORDOLIX (Scrum): 20+ issues, 3 epics with child stories, Gantt deps, time logs, approvals
- INFRA (Kanban): 10 tasks with dependency chain, 2 epics with rollup
- ITSM (Service Desk): 5 service requests, 3 incidents (1 breached, 1 at risk, 1 healthy), 1 problem, 1 change

### Demo Users
Alex Morgan (Admin, all projects), Jordan Lee (Member, ORDOLIX+INFRA), Casey Smith (Member, ORDOLIX), Riley Johnson (Member, ITSM), Taylor Brown (Viewer, ORDOLIX)

## Migration Overlay Pattern
- Defaults created first by seedDefaults()
- Migration adds custom configs on top (never removes defaults)
- Matching defaults reused (not duplicated)
- Migration configs tagged with `source: "migration"` metadata
