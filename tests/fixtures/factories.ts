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

// ── Asset Type ──────────────────────────────────────────────────────────────

export function createAssetType(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `AssetType ${id}`,
    icon: null,
    description: null,
    color: null,
    schema: {},
    ...overrides,
  };
}

// ── Asset ───────────────────────────────────────────────────────────────────

export function createAsset(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  const num = counter;
  return {
    id,
    assetTag: `AST-${String(num).padStart(5, "0")}`,
    name: `Asset ${id}`,
    status: "ordered",
    assigneeId: null,
    attributes: {},
    ...overrides,
  };
}

// ── Asset Attribute Definition ──────────────────────────────────────────────

export function createAssetAttributeDefinition(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `attr_${counter}`,
    label: `Attribute ${id}`,
    fieldType: "text",
    isRequired: false,
    options: null,
    defaultValue: null,
    position: 0,
    description: null,
    ...overrides,
  };
}

// ── Asset History ───────────────────────────────────────────────────────────

export function createAssetHistory(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    action: "created",
    field: null,
    oldValue: null,
    newValue: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ── Asset Financial ─────────────────────────────────────────────────────────

export function createAssetFinancial(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    purchasePrice: 1500.00,
    purchaseCurrency: "USD",
    purchaseDate: new Date("2024-01-15"),
    costCenter: null,
    costType: null,
    depreciationMethod: "straight_line",
    usefulLifeMonths: 36,
    salvageValue: 200.00,
    warrantyStart: new Date("2024-01-15"),
    warrantyEnd: new Date("2027-01-15"),
    warrantyProvider: null,
    warrantyNotes: null,
    maintenanceCost: null,
    disposalValue: null,
    disposalDate: null,
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

// ── Software License ─────────────────────────────────────────────────────────

export function createSoftwareLicense(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `License ${id}`,
    vendor: null,
    licenseType: "subscription",
    licenseKey: null,
    totalEntitlements: 10,
    purchasePrice: null,
    currency: "USD",
    purchaseDate: null,
    renewalDate: null,
    expirationDate: null,
    autoRenew: false,
    renewalCost: null,
    notes: null,
    status: "active",
    ...overrides,
  };
}

// ── Software License Allocation ──────────────────────────────────────────────

export function createSoftwareLicenseAllocation(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    allocatedAt: new Date(),
    revokedAt: null,
    ...overrides,
  };
}

// ── Vendor ───────────────────────────────────────────────────────────────────

export function createVendor(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Vendor ${id}`,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    website: null,
    address: null,
    isActive: true,
    ...overrides,
  };
}

// ── Vendor Contract ──────────────────────────────────────────────────────────

export function createVendorContract(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    contractNumber: `CNT-${String(counter).padStart(5, "0")}`,
    startDate: new Date(),
    endDate: null,
    value: null,
    autoRenew: false,
    status: "active",
    attachmentUrl: null,
    ...overrides,
  };
}

// ── Procurement Request ─────────────────────────────────────────────────────

export function createProcurementRequest(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  const num = counter;
  return {
    id,
    requestNumber: `PR-${String(num).padStart(5, "0")}`,
    title: `Request ${id}`,
    description: null,
    estimatedCost: null,
    quantity: 1,
    costCenter: null,
    urgency: "normal",
    status: "draft",
    ...overrides,
  };
}

// ── Purchase Order ──────────────────────────────────────────────────────────

export function createPurchaseOrder(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  const num = counter;
  return {
    id,
    orderNumber: `PO-${String(num).padStart(5, "0")}`,
    totalAmount: null,
    status: "ordered",
    expectedDelivery: null,
    invoiceNumber: null,
    invoiceAmount: null,
    invoiceDate: null,
    ...overrides,
  };
}

// ── Procurement Line Item ───────────────────────────────────────────────────

export function createProcurementLineItem(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    description: `Line Item ${id}`,
    quantity: 1,
    unitPrice: 100.00,
    assetId: null,
    ...overrides,
  };
}

// ── Asset Import Job ────────────────────────────────────────────────────────

export function createAssetImportJob(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    fileName: `import-${id}.csv`,
    status: "pending",
    totalRows: 0,
    processedRows: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
    columnMapping: {},
    completedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ── Omnea Mapping ───────────────────────────────────────────────────────────

export function createTestOmneaMapping(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  const num = counter;
  return {
    id,
    omneaRequestId: `omnea-req-${String(num).padStart(5, "0")}`,
    procurementRequestId: null,
    licenseId: null,
    status: "pending",
    lastSyncAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── Survey Template ──────────────────────────────────────────────────────────

export function createTestSurveyTemplate(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Survey Template ${id}`,
    description: null,
    trigger: "issue_resolved",
    isActive: true,
    delayMinutes: 30,
    questions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── Survey Response ──────────────────────────────────────────────────────────

export function createTestSurveyResponse(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    issueId: null,
    respondentId: null,
    respondentEmail: null,
    starRating: 4,
    answers: {},
    comment: null,
    submittedAt: new Date(),
    ...overrides,
  };
}

// ── Issue Type Scheme ────────────────────────────────────────────────────────

export function createIssueTypeScheme(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Issue Type Scheme ${id}`,
    description: null,
    isDefault: false,
    parentId: null,
    ...overrides,
  };
}

// ── Issue Type Scheme Entry ─────────────────────────────────────────────────

export function createIssueTypeSchemeEntry(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    isDefault: false,
    position: 0,
    ...overrides,
  };
}

// ── Field Configuration Scheme ──────────────────────────────────────────────

export function createFieldConfigurationScheme(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Field Config Scheme ${id}`,
    description: null,
    isDefault: false,
    parentId: null,
    ...overrides,
  };
}

// ── Field Configuration Entry ───────────────────────────────────────────────

export function createFieldConfigurationEntry(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    isVisible: true,
    isRequired: false,
    position: 0,
    ...overrides,
  };
}

// ── Notification Scheme ─────────────────────────────────────────────────────

export function createNotificationScheme(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Notification Scheme ${id}`,
    description: null,
    isDefault: false,
    parentId: null,
    ...overrides,
  };
}

// ── Notification Scheme Entry ───────────────────────────────────────────────

export function createNotificationSchemeEntry(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    event: "issue_created",
    recipientType: "reporter",
    recipientId: null,
    channels: ["in_app", "email"],
    ...overrides,
  };
}

// ── Component Scheme ─────────────────────────────────────────────────────────

export function createComponentScheme(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    name: `Component Scheme ${id}`,
    description: null,
    isDefault: false,
    parentId: null,
    ...overrides,
  };
}

// ── Component Scheme Entry ──────────────────────────────────────────────────

export function createComponentSchemeEntry(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    isDefault: false,
    position: 0,
    ...overrides,
  };
}

// ── SailPoint Mapping ────────────────────────────────────────────────────────

export function createTestSailPointMapping(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    sailPointGroupId: `sp-grp-${String(counter).padStart(3, "0")}`,
    sailPointGroupName: `SailPoint Group ${id}`,
    targetType: "group",
    targetId: `target-${id}`,
    roleName: null,
    syncDirection: "pull",
    lastSyncAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── SailPoint Sync Log ──────────────────────────────────────────────────────

export function createTestSailPointSyncLog(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    mappingId: null,
    action: "group_synced",
    details: {},
    status: "success",
    error: null,
    createdAt: new Date(),
    ...overrides,
  };
}
