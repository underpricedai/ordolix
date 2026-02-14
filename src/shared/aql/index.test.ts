import { describe, expect, it } from "vitest";
import { parseAQL } from "./index";

describe("parseAQL integration", () => {
  it("parses simple equality query", () => {
    const result = parseAQL('status = "In Progress"');
    expect(result.where).toEqual({
      status: { name: "In Progress" },
    });
  });

  it("parses compound AND query", () => {
    const result = parseAQL(
      'project = "TP1" AND status = "Open"',
    );
    expect(result.where).toEqual({
      AND: [
        { project: { key: "TP1" } },
        { status: { name: "Open" } },
      ],
    });
  });

  it("parses IN query", () => {
    const result = parseAQL('priority IN ("High", "Critical")');
    expect(result.where).toEqual({
      priority: { name: { in: ["High", "Critical"] } },
    });
  });

  it("parses contains query with ORDER BY", () => {
    const result = parseAQL(
      'summary ~ "login" ORDER BY created DESC',
    );
    expect(result.where).toEqual({
      summary: { contains: "login", mode: "insensitive" },
    });
    expect(result.orderBy).toEqual([{ createdAt: "desc" }]);
  });

  it("parses complex nested query", () => {
    const result = parseAQL(
      '(status = "Open" OR status = "Reopened") AND assignee IS NOT NULL',
    );
    expect(result.where).toEqual({
      AND: [
        {
          OR: [
            { status: { name: "Open" } },
            { status: { name: "Reopened" } },
          ],
        },
        { assigneeId: { not: null } },
      ],
    });
  });

  it("parses labels query", () => {
    const result = parseAQL('labels IN ("bug", "urgent")');
    expect(result.where).toEqual({
      labels: { hasSome: ["bug", "urgent"] },
    });
  });

  it("handles ORDER BY only", () => {
    const result = parseAQL("ORDER BY priority ASC, created DESC");
    expect(result.where).toEqual({});
    expect(result.orderBy).toEqual([
      { priority: { rank: "asc" } },
      { createdAt: "desc" },
    ]);
  });

  it("parses numeric comparison", () => {
    const result = parseAQL("storyPoints >= 3");
    expect(result.where).toEqual({
      storyPoints: { gte: 3 },
    });
  });
});
