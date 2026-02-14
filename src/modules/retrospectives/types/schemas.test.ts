import { describe, expect, it } from "vitest";
import {
  createRetroInput,
  updateRetroInput,
  listRetrosInput,
  addCardInput,
  updateCardInput,
  voteCardInput,
  deleteCardInput,
} from "./schemas";

describe("createRetroInput", () => {
  it("accepts valid input with defaults", () => {
    const result = createRetroInput.parse({
      projectId: "proj-1",
      name: "Sprint 10 Retro",
    });

    expect(result.projectId).toBe("proj-1");
    expect(result.name).toBe("Sprint 10 Retro");
    expect(result.categories).toEqual([
      "Went Well",
      "To Improve",
      "Action Items",
    ]);
  });

  it("accepts custom categories", () => {
    const result = createRetroInput.parse({
      projectId: "proj-1",
      name: "Custom Retro",
      categories: ["Good", "Bad", "Ideas"],
    });

    expect(result.categories).toEqual(["Good", "Bad", "Ideas"]);
  });

  it("rejects empty name", () => {
    expect(() =>
      createRetroInput.parse({ projectId: "proj-1", name: "" }),
    ).toThrow();
  });

  it("rejects name over 255 characters", () => {
    expect(() =>
      createRetroInput.parse({ projectId: "proj-1", name: "x".repeat(256) }),
    ).toThrow();
  });
});

describe("updateRetroInput", () => {
  it("accepts valid status update", () => {
    const result = updateRetroInput.parse({
      id: "retro-1",
      status: "completed",
    });

    expect(result.status).toBe("completed");
  });

  it("rejects invalid status", () => {
    expect(() =>
      updateRetroInput.parse({ id: "retro-1", status: "invalid" }),
    ).toThrow();
  });
});

describe("listRetrosInput", () => {
  it("accepts projectId with optional status", () => {
    const result = listRetrosInput.parse({
      projectId: "proj-1",
      status: "active",
    });

    expect(result.projectId).toBe("proj-1");
    expect(result.status).toBe("active");
  });
});

describe("addCardInput", () => {
  it("accepts valid card input", () => {
    const result = addCardInput.parse({
      retrospectiveId: "retro-1",
      category: "Went Well",
      text: "Great teamwork!",
    });

    expect(result.text).toBe("Great teamwork!");
  });

  it("rejects text over 2000 characters", () => {
    expect(() =>
      addCardInput.parse({
        retrospectiveId: "retro-1",
        category: "Went Well",
        text: "x".repeat(2001),
      }),
    ).toThrow();
  });
});

describe("updateCardInput", () => {
  it("accepts partial update", () => {
    const result = updateCardInput.parse({
      id: "card-1",
      text: "Updated text",
    });

    expect(result.text).toBe("Updated text");
    expect(result.category).toBeUndefined();
  });
});

describe("voteCardInput", () => {
  it("accepts valid id", () => {
    const result = voteCardInput.parse({ id: "card-1" });
    expect(result.id).toBe("card-1");
  });
});

describe("deleteCardInput", () => {
  it("rejects empty id", () => {
    expect(() => deleteCardInput.parse({ id: "" })).toThrow();
  });
});
