import { describe, expect, it } from "vitest";
import {
  createQueueInput,
  updateQueueInput,
  listQueuesInput,
  getQueueIssuesInput,
  assignFromQueueInput,
  queueSortOrder,
  queueFilterSchema,
} from "./schemas";

describe("queueSortOrder", () => {
  it("accepts valid sort orders", () => {
    const valid = [
      "created_asc",
      "created_desc",
      "priority_desc",
      "updated_desc",
      "sla_breach_asc",
    ];
    for (const v of valid) {
      expect(queueSortOrder.parse(v)).toBe(v);
    }
  });

  it("rejects invalid sort order", () => {
    expect(() => queueSortOrder.parse("invalid")).toThrow();
  });
});

describe("queueFilterSchema", () => {
  it("accepts valid filter with all fields", () => {
    const input = {
      issueTypeIds: ["type-1"],
      priorityIds: ["pri-1"],
      statusIds: ["status-1"],
      assigneeIds: ["user-1"],
      labels: ["urgent"],
    };
    expect(queueFilterSchema.parse(input)).toEqual(input);
  });

  it("accepts empty filter object", () => {
    expect(queueFilterSchema.parse({})).toEqual({});
  });

  it("rejects filter with empty string in array", () => {
    expect(() =>
      queueFilterSchema.parse({ issueTypeIds: [""] }),
    ).toThrow();
  });
});

describe("createQueueInput", () => {
  it("accepts valid input", () => {
    const input = {
      projectId: "proj-1",
      name: "Support Queue",
      description: "Handles support requests",
      filter: { priorityIds: ["pri-high"] },
    };
    const result = createQueueInput.parse(input);
    expect(result.name).toBe("Support Queue");
    expect(result.filter.priorityIds).toEqual(["pri-high"]);
  });

  it("accepts input without optional description", () => {
    const input = {
      projectId: "proj-1",
      name: "Queue",
      filter: {},
    };
    expect(createQueueInput.parse(input)).toEqual(input);
  });

  it("rejects missing projectId", () => {
    expect(() =>
      createQueueInput.parse({ name: "Queue", filter: {} }),
    ).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      createQueueInput.parse({ projectId: "p", name: "", filter: {} }),
    ).toThrow();
  });

  it("rejects name exceeding 255 characters", () => {
    expect(() =>
      createQueueInput.parse({
        projectId: "p",
        name: "a".repeat(256),
        filter: {},
      }),
    ).toThrow();
  });
});

describe("updateQueueInput", () => {
  it("accepts partial update", () => {
    const input = { id: "q-1", name: "Renamed" };
    expect(updateQueueInput.parse(input).name).toBe("Renamed");
  });

  it("accepts update with sortOrder", () => {
    const input = { id: "q-1", sortOrder: "priority_desc" as const };
    expect(updateQueueInput.parse(input).sortOrder).toBe("priority_desc");
  });

  it("rejects missing id", () => {
    expect(() => updateQueueInput.parse({ name: "X" })).toThrow();
  });
});

describe("listQueuesInput", () => {
  it("accepts valid projectId", () => {
    expect(listQueuesInput.parse({ projectId: "proj-1" }).projectId).toBe(
      "proj-1",
    );
  });

  it("rejects empty projectId", () => {
    expect(() => listQueuesInput.parse({ projectId: "" })).toThrow();
  });
});

describe("getQueueIssuesInput", () => {
  it("accepts valid input with defaults", () => {
    const result = getQueueIssuesInput.parse({ queueId: "q-1" });
    expect(result.limit).toBe(50);
    expect(result.sortOrder).toBe("desc");
  });

  it("rejects limit above 100", () => {
    expect(() =>
      getQueueIssuesInput.parse({ queueId: "q-1", limit: 101 }),
    ).toThrow();
  });

  it("accepts custom limit and cursor", () => {
    const result = getQueueIssuesInput.parse({
      queueId: "q-1",
      cursor: "cursor-abc",
      limit: 25,
    });
    expect(result.cursor).toBe("cursor-abc");
    expect(result.limit).toBe(25);
  });
});

describe("assignFromQueueInput", () => {
  it("accepts valid input", () => {
    const input = { issueId: "issue-1", assigneeId: "user-1" };
    expect(assignFromQueueInput.parse(input)).toEqual(input);
  });

  it("rejects missing assigneeId", () => {
    expect(() =>
      assignFromQueueInput.parse({ issueId: "issue-1" }),
    ).toThrow();
  });
});
