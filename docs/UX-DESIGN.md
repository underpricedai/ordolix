# Ordolix - UX Design & Screen Specifications

## Design Philosophy

### Principle 1: Obvious Over Powerful
Every feature discoverable without documentation. New user completes any common task within 30 seconds.
- Single-click for top 10 operations (create, transition, assign, comment, log time, search, filter, create sprint, add label, change priority)
- Progressive disclosure: advanced features via keyboard shortcuts, command palette, contextual menus
- No "configuration required" states: projects work immediately with sensible defaults

### Principle 2: One Way to Do Things
One path to each configuration. No scheme-of-schemes indirection.
- Direct configuration: project has a workflow, permission set, notification config. No indirection layers.
- Every admin action reachable from the object it configures
- Cmd+K as universal entry point: finds issues, projects, settings, admin pages, people, filters

### Principle 3: Show, Don't Configure
Admin pages show live previews of configuration effects.
- Visual workflow editor with live board column preview
- Permission preview: shows affected users before saving
- Automation preview: simulates rule against current data
- Field config preview: shows mock issue form with field placement

### Principle 4: Speed as a Feature
- All page loads <500ms
- Board drag-and-drop: optimistic UI, zero perceived latency
- Search results as-you-type, sub-200ms
- Inline editing: click field, change, click away to save
- Skeleton loading: never show blank screen or spinner on primary views

### Principle 5: Beautiful by Default
- 4px base spacing unit (all spacing multiples of 4)
- Clear type hierarchy: title, section headers, body, labels, metadata
- Purposeful color: for status, priority, actionable elements only. Neutral base UI.
- Microinteractions on state changes. Respect prefers-reduced-motion.
- Beautiful empty states with illustration, explanation, CTA

### Principle 6: AI-Native, Not AI-Bolted
- MCP server as first-class integration with full UI capabilities
- AI-aware automation triggers
- AI-assisted triage (future)
- AI-generated reports via MCP

## Global Layout

```
┌─────────────────────────────────────────────────────────┐
│ Logo    [    Cmd+K Search (40% width)    ]  + Create 🔔 🌓 👤 │  ← Top bar (48px fixed)
├──────────┬──────────────────────────────────┬───────────┤
│ Project  │                                  │           │
│ Switcher │     Main Content Area            │  Right    │
│          │     (full remaining width)       │  Panel    │
│ Board    │     Single scroll context        │  (360px)  │
│ Backlog  │                                  │  Issue    │
│ Timeline │                                  │  detail   │
│ Sprints  │                                  │  or       │
│ Reports  │                                  │  filter   │
│ Queues   │                                  │  config   │
│ Settings │                                  │           │
│ (240px)  │                                  │           │
└──────────┴──────────────────────────────────┴───────────┘
```

- **Left sidebar**: collapsible to icons-only mode
- **Right panel**: slides out contextually, can be pinned
- **Command palette (Cmd+K)**: full-screen overlay, categorized results, keyboard navigable

## Board View
- **Header**: board name, quick filter bar (My Issues, Recently Updated, custom), sprint selector, view toggle (Board/List/Timeline)
- **Columns**: vertical with status name, count, WIP limit indicator. Auto-distributed width. Horizontal scroll if needed.
- **Cards**: compact default (key, summary, priority icon, assignee avatar, story points). Expand on hover (labels, due date, checklist progress). Click → right panel. Double-click → full page.
- **Drag-and-drop**: smooth animation, drop target highlighting, optimistic update, snap-back on sync failure with error toast
- **Swimlanes**: by Epic, Assignee, or Priority. Collapsible. Aggregate stats in header.
- **Footer**: connected users indicator, board analytics toggle (avg time in column, throughput)

## Issue Detail View
- **Layout**: full-page or right-panel mode. Desktop: left (70%) description/activity/comments + right (30%) field sidebar
- **Status transition**: large button at top of sidebar → dropdown of available transitions
- **Inline editing**: click any field → becomes input → edit → Enter/click away to save
- **Field sidebar groups**: Details, Dates, People, Development, Time Tracking, Checklists, Assets, Links. Collapsible. Empty sections hidden.
- **Activity tab**: All, Comments, History, Time Logs, DevOps. Actor avatar, action, timestamp. Reply/edit/delete/react on comments.
- **Rich text editor**: Tiptap/Plate with formatting toolbar, @mentions, image paste, code blocks, tables, templates
- **Development panel**: branch/PR/commit from GitHub with status badges
- **Keyboard**: Tab cycles fields, Cmd+Enter saves, Escape closes

## Gantt/Timeline View
- **Left panel (40%)**: issue hierarchy tree (epic > story > subtask). Columns: Key, Summary, Assignee, Start, End, Progress
- **Right panel (60%)**: timeline bars with today marker. Dependency arrows. Critical path in red.
- **Interactions**: drag bar ends → change dates; drag middle → reschedule; draw dependency arrows; right-click context menu
- **Zoom**: Day/Week/Month/Quarter. Pinch-to-zoom on trackpad.
- **Baseline overlay**: toggle for baseline plan (dashed) vs actual (solid)

## Search & Filter View
- **AQL editor**: syntax-highlighted with autocomplete for field names, operators, values, functions. Error underlines with fix suggestions.
- **Results table**: configurable columns (drag to reorder), sortable, inline editing on cells
- **Quick actions**: bulk select via checkboxes → action bar (Edit, Transition, Assign, Label, Delete, Export)
- **Save as filter**: name, sharing permissions, star for favorites

## Dashboard View
- **Grid layout**: drag-and-drop widget positioning, resize by dragging corners
- **Widget types**: metric card, bar/line/area/pie charts, issue list, activity stream, sprint burndown, SLA compliance gauge, calendar, custom AQL
- **Sharing**: personal (default), team (project members), global (all users)

## Admin Experience
- **Unified admin sidebar**: Users, Groups, Project Roles, Workflows, Fields, Permissions, Issue Security, Automation, Integrations, Webhooks, Audit Log, System
- **Visual workflow editor**: canvas-based with drag status nodes, draw transition arrows, inline config per transition, live board column preview
- **Permission editor**: matrix (roles × permissions) with toggle switches. Impact preview on hover.
- **Integration wizards**: step-by-step with test-connection buttons
- **Audit trail**: who changed what, when, before/after diff, one-click undo

## Color System (CSS Variables)

| Variable | Light | Dark | Usage |
|----------|-------|------|-------|
| --color-bg-primary | #FFFFFF | #0F172A | Page/card background |
| --color-bg-secondary | #F8FAFC | #1E293B | Sidebar, secondary panels |
| --color-bg-tertiary | #F1F5F9 | #334155 | Hover states, table stripes |
| --color-text-primary | #0F172A | #F8FAFC | Primary text |
| --color-text-secondary | #64748B | #94A3B8 | Secondary text, labels |
| --color-border | #E2E8F0 | #334155 | Borders, dividers |
| --color-accent | #1B4F72 | #60A5FA | Links, active states, brand |
| --color-danger | #DC2626 | #EF4444 | Errors, SLA breached, bugs |
| --color-warning | #D97706 | #F59E0B | Warnings, SLA at risk |
| --color-success | #16A34A | #22C55E | Success, SLA met, Done |

## Responsive Breakpoints

| Breakpoint | Tailwind | Target | Adaptation |
|-----------|----------|--------|-----------|
| <640px | Default | Phones | Single column, bottom nav, collapsed sidebar |
| 640-768px | sm: | Large phones | Single column, sidebar overlay |
| 768-1024px | md: | Tablets | Two columns, collapsible sidebar |
| 1024-1280px | lg: | Laptops | Full sidebar, multi-column, full Gantt |
| 1280px+ | xl: | Desktops | Full layout, wide boards |

## Keyboard Shortcuts

### Global
| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl+K | Command palette |
| C | Create new issue |
| ? | Shortcuts help dialog |
| / | Focus search/filter bar |
| G then D/B/L/T/R/S | Go to Dashboard/Board/Backlog/Timeline/Reports/Settings |
| Escape | Close modal/dialog/dropdown |

### Issue Detail
| Shortcut | Action |
|----------|--------|
| J/K | Next/previous issue in list |
| Enter | Open selected issue |
| A | Assign issue |
| L | Add label |
| P | Change priority |
| M | Add comment |
| T | Log time |
| E | Edit summary/description |
| Cmd/Ctrl+Enter | Submit/save |
| Cmd/Ctrl+. | Quick transition |

### Board
| Shortcut | Action |
|----------|--------|
| Arrow keys | Navigate cards/columns |
| Space | Select/deselect card |
| D | Move to Done column |
| 1-9 | Move to column N |
| F | Toggle quick filter panel |
