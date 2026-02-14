import { describe, expect, it } from "vitest";
import {
  boardColumnSchema,
  createBoardInput,
  updateBoardInput,
  getBoardDataInput,
} from "./schemas";

describe("boardColumnSchema", () => {
  it("accepts valid column", () => {
    const result = boardColumnSchema.safeParse({
      id: "col-1",
      name: "To Do",
      statusIds: ["status-1"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty statusIds", () => {
    const result = boardColumnSchema.safeParse({
      id: "col-1",
      name: "To Do",
      statusIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional limits", () => {
    const result = boardColumnSchema.safeParse({
      id: "col-1",
      name: "In Progress",
      statusIds: ["status-2"],
      minLimit: 0,
      maxLimit: 5,
    });
    expect(result.success).toBe(true);
  });
});

describe("createBoardInput", () => {
  it("accepts valid minimal input", () => {
    const result = createBoardInput.safeParse({
      projectId: "proj-1",
      name: "My Board",
    });
    expect(result.success).toBe(true);
  });

  it("defaults boardType to kanban", () => {
    const result = createBoardInput.parse({
      projectId: "proj-1",
      name: "My Board",
    });
    expect(result.boardType).toBe("kanban");
  });

  it("accepts input with columns", () => {
    const result = createBoardInput.safeParse({
      projectId: "proj-1",
      name: "My Board",
      columns: [{ id: "col-1", name: "To Do", statusIds: ["s-1"] }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing projectId", () => {
    const result = createBoardInput.safeParse({ name: "My Board" });
    expect(result.success).toBe(false);
  });
});

describe("updateBoardInput", () => {
  it("accepts id only", () => {
    const result = updateBoardInput.safeParse({ id: "board-1" });
    expect(result.success).toBe(true);
  });

  it("accepts partial updates", () => {
    const result = updateBoardInput.safeParse({
      id: "board-1",
      name: "Renamed",
      cardColor: "issueType",
    });
    expect(result.success).toBe(true);
  });
});

describe("getBoardDataInput", () => {
  it("accepts valid input", () => {
    const result = getBoardDataInput.safeParse({ id: "board-1" });
    expect(result.success).toBe(true);
  });

  it("accepts optional filters", () => {
    const result = getBoardDataInput.safeParse({
      id: "board-1",
      sprintId: "sprint-1",
      assigneeId: "user-1",
    });
    expect(result.success).toBe(true);
  });
});
