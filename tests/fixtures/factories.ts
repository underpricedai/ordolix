/**
 * Factory functions for creating test data.
 * All factories return plain objects matching Prisma create input types.
 * Factories do NOT write to DB — caller decides when to persist.
 */

let counter = 0;
function nextId() {
  return `test-${++counter}`;
}

/** Reset counter between tests for predictable IDs */
export function resetFactoryCounter() {
  counter = 0;
}

// ── Organization ────────────────────────────────────────────────────────────

export function createOrganization(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Test Org ${id}`,
    slug: `test-org-${id}`,
    plan: "free",
    settings: {},
    ...overrides,
  };
}

// ── User ────────────────────────────────────────────────────────────────────

export function createUser(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Test User ${id}`,
    email: `user-${id}@test.ordolix.dev`,
    passwordHash: null,
    ...overrides,
  };
}

// ── Project ─────────────────────────────────────────────────────────────────

export function createProject(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  const num = counter;
  return {
    id,
    name: `Test Project ${id}`,
    key: `TP${num}`,
    projectType: "software",
    templateKey: "kanban",
    issueCounter: 0,
    ...overrides,
  };
}

// ── Issue Type ──────────────────────────────────────────────────────────────

export function createIssueType(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Type ${id}`,
    icon: "check-square",
    color: "#4BADE8",
    isSubtask: false,
    hierarchyLevel: 0,
    category: "software",
    ...overrides,
  };
}

// ── Status ──────────────────────────────────────────────────────────────────

export function createStatus(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Status ${id}`,
    category: "TO_DO",
    color: "#42526E",
    ...overrides,
  };
}

// ── Workflow ────────────────────────────────────────────────────────────────

export function createWorkflow(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Workflow ${id}`,
    isDefault: false,
    isActive: true,
    ...overrides,
  };
}

// ── Transition ──────────────────────────────────────────────────────────────

export function createTransition(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Transition ${id}`,
    validators: [],
    conditions: [],
    postFunctions: [],
    ...overrides,
  };
}

// ── Priority ────────────────────────────────────────────────────────────────

export function createPriority(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Priority ${id}`,
    rank: counter,
    color: "#FFAB00",
    slaMultiplier: 1.0,
    ...overrides,
  };
}

// ── Resolution ──────────────────────────────────────────────────────────────

export function createResolution(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Resolution ${id}`,
    description: "Test resolution",
    ...overrides,
  };
}

// ── Issue ───────────────────────────────────────────────────────────────────

export function createIssue(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  const num = counter;
  return {
    id,
    key: `TEST-${num}`,
    summary: `Test Issue ${id}`,
    labels: [],
    customFieldValues: {},
    isArchived: false,
    ...overrides,
  };
}

// ── Comment ─────────────────────────────────────────────────────────────────

export function createComment(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    body: `Test comment ${id}`,
    isInternal: false,
    ...overrides,
  };
}

// ── Custom Field ────────────────────────────────────────────────────────────

export function createCustomField(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Custom Field ${id}`,
    fieldType: "text",
    context: {},
    isRequired: false,
    ...overrides,
  };
}

// ── Board ───────────────────────────────────────────────────────────────────

export function createBoard(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Board ${id}`,
    boardType: "kanban",
    columns: [],
    swimlanes: [],
    cardFields: ["key", "summary", "priority", "assignee"],
    cardColor: "priority",
    quickFilters: [],
    ...overrides,
  };
}

// ── Sprint ──────────────────────────────────────────────────────────────────

export function createSprint(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Sprint ${id}`,
    status: "future",
    ...overrides,
  };
}

// ── SLA Config ──────────────────────────────────────────────────────────────

export function createSLAConfig(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `SLA ${id}`,
    metric: "first_response",
    targetDuration: 4 * 60 * 60 * 1000,
    startCondition: { event: "issue_created" },
    stopCondition: { event: "first_agent_comment" },
    pauseConditions: [],
    calendar: {},
    escalationRules: [],
    isActive: true,
    ...overrides,
  };
}

// ── Time Log ────────────────────────────────────────────────────────────────

export function createTimeLog(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    date: new Date(),
    duration: 3600,
    billable: true,
    approvalStatus: "pending",
    ...overrides,
  };
}

// ── Test Case ───────────────────────────────────────────────────────────────

export function createTestCase(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    title: `Test Case ${id}`,
    steps: [],
    priority: "medium",
    status: "draft",
    ...overrides,
  };
}

// ── Asset ───────────────────────────────────────────────────────────────────

export function createAsset(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Asset ${id}`,
    status: "active",
    attributes: {},
    ...overrides,
  };
}

// ── Form Template ───────────────────────────────────────────────────────────

export function createFormTemplate(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Form ${id}`,
    config: { fields: [] },
    isActive: true,
    ...overrides,
  };
}

// ── Automation Rule ─────────────────────────────────────────────────────────

export function createAutomationRule(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Rule ${id}`,
    trigger: { type: "issue_created" },
    conditions: [],
    actions: [{ type: "add_comment", body: "Auto comment" }],
    priority: 0,
    enabled: true,
    ...overrides,
  };
}

// ── Checklist ───────────────────────────────────────────────────────────────

export function createChecklist(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    title: `Checklist ${id}`,
    position: 0,
    ...overrides,
  };
}

// ── Saved Report ────────────────────────────────────────────────────────────

export function createSavedReport(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Report ${id}`,
    dimensions: [],
    measures: [],
    chartType: "bar",
    filters: {},
    recipients: [],
    ...overrides,
  };
}
