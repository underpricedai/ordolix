import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getWorkflowForProject,
  getAvailableTransitions,
  transitionIssue,
} from "./workflow-engine";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockTx() {
  return {
    issue: { update: vi.fn() },
    issueHistory: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
}

function createMockDb() {
  const mockTx = createMockTx();
  return {
    workflow: { findFirst: vi.fn() },
    issue: { findFirst: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(
      async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
    ),
    _tx: mockTx,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockTodoStatus = {
  id: "status-todo",
  name: "To Do",
  category: "TO_DO",
  color: "#42526E",
};

const mockInProgressStatus = {
  id: "status-ip",
  name: "In Progress",
  category: "IN_PROGRESS",
  color: "#0052CC",
};

const mockDoneStatus = {
  id: "status-done",
  name: "Done",
  category: "DONE",
  color: "#00875A",
};

const mockTransitionStartProgress = {
  id: "trans-start",
  name: "Start Progress",
  fromStatusId: "status-todo",
  toStatusId: "status-ip",
  fromStatus: mockTodoStatus,
  toStatus: mockInProgressStatus,
  validators: [],
  conditions: [],
  postFunctions: [],
};

const mockTransitionDone = {
  id: "trans-done",
  name: "Done",
  fromStatusId: "status-ip",
  toStatusId: "status-done",
  fromStatus: mockInProgressStatus,
  toStatus: mockDoneStatus,
  validators: [],
  conditions: [],
  postFunctions: [],
};

const mockWorkflow = {
  id: "wf-1",
  name: "Default Workflow",
  organizationId: ORG_ID,
  isDefault: true,
  isActive: true,
  workflowStatuses: [
    { status: mockTodoStatus, statusId: "status-todo", position: 0 },
    { status: mockInProgressStatus, statusId: "status-ip", position: 1 },
    { status: mockDoneStatus, statusId: "status-done", position: 2 },
  ],
  transitions: [mockTransitionStartProgress, mockTransitionDone],
};

const mockIssue = {
  id: "issue-1",
  key: "TEST-1",
  organizationId: ORG_ID,
  projectId: "proj-1",
  statusId: "status-todo",
  resolutionId: null,
  summary: "Test Issue",
  deletedAt: null,
};

// ── getWorkflowForProject ────────────────────────────────────────────────────

describe("getWorkflowForProject", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns project-specific workflow", async () => {
    db.workflow.findFirst.mockResolvedValue(mockWorkflow);

    const result = await getWorkflowForProject(db, ORG_ID, "proj-1");

    expect(result).toEqual(mockWorkflow);
    expect(db.workflow.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projects: { some: { id: "proj-1" } },
        }),
      }),
    );
  });

  it("falls back to org default when no project-specific workflow", async () => {
    db.workflow.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockWorkflow);

    const result = await getWorkflowForProject(db, ORG_ID, "proj-1");

    expect(result).toEqual(mockWorkflow);
    expect(db.workflow.findFirst).toHaveBeenCalledTimes(2);
  });

  it("throws NotFoundError when no workflow exists", async () => {
    db.workflow.findFirst.mockResolvedValue(null);

    await expect(
      getWorkflowForProject(db, ORG_ID, "proj-1"),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── getAvailableTransitions ──────────────────────────────────────────────────

describe("getAvailableTransitions", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns transitions from current status", async () => {
    db.issue.findFirst.mockResolvedValue(mockIssue);
    db.workflow.findFirst.mockResolvedValue(mockWorkflow);

    const result = await getAvailableTransitions(db, ORG_ID, "issue-1");

    expect(result).toEqual([
      {
        id: "trans-start",
        name: "Start Progress",
        toStatus: mockInProgressStatus,
      },
    ]);
  });

  it("returns empty array when no transitions from current status", async () => {
    db.issue.findFirst.mockResolvedValue({
      ...mockIssue,
      statusId: "status-done",
    });
    db.workflow.findFirst.mockResolvedValue(mockWorkflow);

    const result = await getAvailableTransitions(db, ORG_ID, "issue-1");

    expect(result).toEqual([]);
  });

  it("throws NotFoundError when issue not found", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await expect(
      getAvailableTransitions(db, ORG_ID, "nonexistent"),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── transitionIssue ──────────────────────────────────────────────────────────

describe("transitionIssue", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue(mockIssue);
    db.workflow.findFirst.mockResolvedValue(mockWorkflow);
    db._tx.issue.update.mockResolvedValue({
      ...mockIssue,
      statusId: "status-ip",
      status: mockInProgressStatus,
    });
    db._tx.issueHistory.create.mockResolvedValue({});
    db._tx.auditLog.create.mockResolvedValue({});
  });

  it("updates issue statusId", async () => {
    await transitionIssue(db, ORG_ID, USER_ID, "issue-1", "trans-start");

    expect(db._tx.issue.update).toHaveBeenCalledWith({
      where: { id: "issue-1" },
      data: { statusId: "status-ip" },
      include: expect.any(Object),
    });
  });

  it("creates IssueHistory record", async () => {
    await transitionIssue(db, ORG_ID, USER_ID, "issue-1", "trans-start");

    expect(db._tx.issueHistory.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_ID,
        issueId: "issue-1",
        userId: USER_ID,
        field: "statusId",
        oldValue: "status-todo",
        newValue: "status-ip",
      },
    });
  });

  it("creates AuditLog with TRANSITIONED action", async () => {
    await transitionIssue(db, ORG_ID, USER_ID, "issue-1", "trans-start");

    expect(db._tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        userId: USER_ID,
        entityType: "Issue",
        entityId: "issue-1",
        action: "TRANSITIONED",
        diff: expect.objectContaining({
          fromStatusId: "status-todo",
          toStatusId: "status-ip",
        }),
      }),
    });
  });

  it("returns updated issue with relations", async () => {
    const result = await transitionIssue(
      db,
      ORG_ID,
      USER_ID,
      "issue-1",
      "trans-start",
    );

    expect(result.statusId).toBe("status-ip");
    expect(result.status).toEqual(mockInProgressStatus);
  });

  it("throws NotFoundError when issue not found", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await expect(
      transitionIssue(db, ORG_ID, USER_ID, "nonexistent", "trans-start"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when transition not found", async () => {
    await expect(
      transitionIssue(db, ORG_ID, USER_ID, "issue-1", "nonexistent"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError when fromStatus does not match current status", async () => {
    // Issue is at "status-todo" but trans-done starts at "status-ip"
    await expect(
      transitionIssue(db, ORG_ID, USER_ID, "issue-1", "trans-done"),
    ).rejects.toThrow(ValidationError);
  });

  it("blocks transition when required_field validator fails", async () => {
    const workflowWithValidator = {
      ...mockWorkflow,
      transitions: [
        {
          ...mockTransitionStartProgress,
          validators: [
            { type: "required_field", config: { field: "resolutionId" } },
          ],
        },
        mockTransitionDone,
      ],
    };
    db.workflow.findFirst.mockResolvedValue(workflowWithValidator);
    // mockIssue has resolutionId: null

    await expect(
      transitionIssue(db, ORG_ID, USER_ID, "issue-1", "trans-start"),
    ).rejects.toThrow(ValidationError);
  });

  it("succeeds when required_field validator passes", async () => {
    const workflowWithValidator = {
      ...mockWorkflow,
      transitions: [
        {
          ...mockTransitionStartProgress,
          validators: [
            { type: "required_field", config: { field: "resolutionId" } },
          ],
        },
        mockTransitionDone,
      ],
    };
    db.workflow.findFirst.mockResolvedValue(workflowWithValidator);
    db.issue.findFirst.mockResolvedValue({
      ...mockIssue,
      resolutionId: "res-1",
    });

    const result = await transitionIssue(
      db,
      ORG_ID,
      USER_ID,
      "issue-1",
      "trans-start",
    );

    expect(result.statusId).toBe("status-ip");
  });

  it("blocks transition when no_open_subtasks validator fails", async () => {
    const workflowWithValidator = {
      ...mockWorkflow,
      transitions: [
        {
          ...mockTransitionStartProgress,
          validators: [{ type: "no_open_subtasks", config: {} }],
        },
        mockTransitionDone,
      ],
    };
    db.workflow.findFirst.mockResolvedValue(workflowWithValidator);
    db.issue.count.mockResolvedValue(2);

    await expect(
      transitionIssue(db, ORG_ID, USER_ID, "issue-1", "trans-start"),
    ).rejects.toThrow(ValidationError);
  });

  it("succeeds with empty validators array", async () => {
    const result = await transitionIssue(
      db,
      ORG_ID,
      USER_ID,
      "issue-1",
      "trans-start",
    );

    expect(result).toBeDefined();
    expect(db._tx.issue.update).toHaveBeenCalled();
  });
});
