import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createBoard,
  getBoard,
  getBoardData,
  updateBoard,
  deleteBoard,
} from "./board-service";
import { NotFoundError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    project: { findFirst: vi.fn() },
    workflow: { findFirst: vi.fn() },
    board: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    issue: { findMany: vi.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";

const mockProject = {
  id: "proj-1",
  organizationId: ORG_ID,
  name: "Test Project",
};

const mockWorkflow = {
  id: "wf-1",
  workflowStatuses: [
    { statusId: "status-todo", status: { name: "To Do" }, position: 0 },
    {
      statusId: "status-ip",
      status: { name: "In Progress" },
      position: 1,
    },
    { statusId: "status-done", status: { name: "Done" }, position: 2 },
  ],
};

const mockBoard = {
  id: "board-1",
  organizationId: ORG_ID,
  projectId: "proj-1",
  name: "My Board",
  boardType: "kanban",
  columns: [
    { id: "col-1", name: "To Do", statusIds: ["status-todo"] },
    { id: "col-2", name: "In Progress", statusIds: ["status-ip"] },
    { id: "col-3", name: "Done", statusIds: ["status-done"] },
  ],
};

// ── createBoard ──────────────────────────────────────────────────────────────

describe("createBoard", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.project.findFirst.mockResolvedValue(mockProject);
    db.workflow.findFirst.mockResolvedValue(mockWorkflow);
    db.board.create.mockResolvedValue(mockBoard);
  });

  it("creates board with provided columns", async () => {
    const columns = [
      { id: "col-1", name: "To Do", statusIds: ["status-todo"] },
    ];
    await createBoard(db, ORG_ID, {
      projectId: "proj-1",
      name: "My Board",
      boardType: "kanban",
      columns,
    });

    expect(db.board.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        columns,
        name: "My Board",
        boardType: "kanban",
      }),
    });
  });

  it("auto-generates columns from workflow when not provided", async () => {
    await createBoard(db, ORG_ID, {
      projectId: "proj-1",
      name: "My Board",
      boardType: "kanban",
    });

    expect(db.workflow.findFirst).toHaveBeenCalled();
    const createCall = db.board.create.mock.calls[0][0];
    const columns = createCall.data.columns as Array<{
      statusIds: string[];
    }>;
    expect(columns).toHaveLength(3);
    expect(columns[0]!.statusIds).toEqual(["status-todo"]);
    expect(columns[1]!.statusIds).toEqual(["status-ip"]);
    expect(columns[2]!.statusIds).toEqual(["status-done"]);
  });

  it("throws NotFoundError if project not in org", async () => {
    db.project.findFirst.mockResolvedValue(null);

    await expect(
      createBoard(db, ORG_ID, {
        projectId: "nope",
        name: "Board",
        boardType: "kanban",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("sets boardType from input", async () => {
    await createBoard(db, ORG_ID, {
      projectId: "proj-1",
      name: "Sprint Board",
      boardType: "scrum",
    });

    expect(db.board.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ boardType: "scrum" }),
    });
  });

  it("scopes project lookup to organization", async () => {
    await createBoard(db, ORG_ID, {
      projectId: "proj-1",
      name: "Board",
      boardType: "kanban",
    });

    expect(db.project.findFirst).toHaveBeenCalledWith({
      where: { id: "proj-1", organizationId: ORG_ID },
    });
  });
});

// ── getBoard ─────────────────────────────────────────────────────────────────

describe("getBoard", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns board when found", async () => {
    db.board.findFirst.mockResolvedValue(mockBoard);

    const result = await getBoard(db, ORG_ID, "board-1");
    expect(result).toEqual(mockBoard);
  });

  it("throws NotFoundError when not found", async () => {
    db.board.findFirst.mockResolvedValue(null);

    await expect(getBoard(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });

  it("scopes query to organization", async () => {
    db.board.findFirst.mockResolvedValue(null);
    await getBoard(db, "other-org", "board-1").catch(() => {});

    expect(db.board.findFirst).toHaveBeenCalledWith({
      where: { id: "board-1", organizationId: "other-org" },
    });
  });
});

// ── getBoardData ─────────────────────────────────────────────────────────────

describe("getBoardData", () => {
  let db: ReturnType<typeof createMockDb>;

  const mockIssues = [
    { id: "i-1", statusId: "status-todo", summary: "Task A" },
    { id: "i-2", statusId: "status-ip", summary: "Task B" },
    { id: "i-3", statusId: "status-todo", summary: "Task C" },
  ];

  beforeEach(() => {
    db = createMockDb();
    db.board.findFirst.mockResolvedValue(mockBoard);
    db.issue.findMany.mockResolvedValue(mockIssues);
  });

  it("returns board with issues grouped by column", async () => {
    const result = await getBoardData(db, ORG_ID, { id: "board-1" });

    expect(result.board).toEqual(mockBoard);
    expect(result.columns).toHaveLength(3);
    expect(result.columns[0]!.issues).toHaveLength(2); // 2 in To Do
    expect(result.columns[1]!.issues).toHaveLength(1); // 1 in Progress
    expect(result.columns[2]!.issues).toHaveLength(0); // 0 in Done
  });

  it("filters by sprintId", async () => {
    await getBoardData(db, ORG_ID, { id: "board-1", sprintId: "sprint-1" });

    expect(db.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sprintId: "sprint-1" }),
      }),
    );
  });

  it("filters by assigneeId", async () => {
    await getBoardData(db, ORG_ID, {
      id: "board-1",
      assigneeId: "user-1",
    });

    expect(db.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assigneeId: "user-1" }),
      }),
    );
  });

  it("returns empty columns when no issues", async () => {
    db.issue.findMany.mockResolvedValue([]);

    const result = await getBoardData(db, ORG_ID, { id: "board-1" });
    expect(result.columns.every((c) => c.issues.length === 0)).toBe(true);
  });
});

// ── updateBoard ──────────────────────────────────────────────────────────────

describe("updateBoard", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.board.findFirst.mockResolvedValue(mockBoard);
    db.board.update.mockResolvedValue({ ...mockBoard, name: "Renamed" });
  });

  it("updates board fields", async () => {
    const result = await updateBoard(db, ORG_ID, "board-1", {
      name: "Renamed",
    });

    expect(result.name).toBe("Renamed");
    expect(db.board.update).toHaveBeenCalledWith({
      where: { id: "board-1" },
      data: { name: "Renamed" },
    });
  });

  it("throws NotFoundError when not found", async () => {
    db.board.findFirst.mockResolvedValue(null);

    await expect(
      updateBoard(db, ORG_ID, "nope", { name: "X" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteBoard ──────────────────────────────────────────────────────────────

describe("deleteBoard", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.board.findFirst.mockResolvedValue(mockBoard);
    db.board.delete.mockResolvedValue({});
  });

  it("deletes board", async () => {
    await deleteBoard(db, ORG_ID, "board-1");

    expect(db.board.delete).toHaveBeenCalledWith({
      where: { id: "board-1" },
    });
  });

  it("throws NotFoundError when not found", async () => {
    db.board.findFirst.mockResolvedValue(null);

    await expect(deleteBoard(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});
