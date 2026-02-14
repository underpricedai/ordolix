import { describe, expect, it } from "vitest";
import { tokenize } from "./tokenizer";
import { parse, ParseError } from "./parser";

function parseQuery(q: string) {
  return parse(tokenize(q));
}

describe("parser", () => {
  it("parses simple comparison", () => {
    const result = parseQuery('status = "Done"');
    expect(result.where).toEqual({
      type: "comparison",
      field: "status",
      operator: "=",
      value: "Done",
    });
  });

  it("parses numeric comparison", () => {
    const result = parseQuery("storyPoints > 5");
    expect(result.where).toEqual({
      type: "comparison",
      field: "storyPoints",
      operator: ">",
      value: 5,
    });
  });

  it("parses AND expression", () => {
    const result = parseQuery('status = "Done" AND priority = "High"');
    expect(result.where).toMatchObject({
      type: "logical",
      operator: "AND",
      left: { type: "comparison", field: "status" },
      right: { type: "comparison", field: "priority" },
    });
  });

  it("parses OR expression", () => {
    const result = parseQuery('status = "Open" OR status = "Reopened"');
    expect(result.where).toMatchObject({
      type: "logical",
      operator: "OR",
    });
  });

  it("parses IN expression", () => {
    const result = parseQuery('priority IN ("High", "Critical")');
    expect(result.where).toEqual({
      type: "in",
      field: "priority",
      values: ["High", "Critical"],
    });
  });

  it("parses IS NULL", () => {
    const result = parseQuery("assignee IS NULL");
    expect(result.where).toEqual({
      type: "is",
      field: "assignee",
      negated: false,
      check: "null",
    });
  });

  it("parses IS NOT EMPTY", () => {
    const result = parseQuery("description IS NOT EMPTY");
    expect(result.where).toEqual({
      type: "is",
      field: "description",
      negated: true,
      check: "empty",
    });
  });

  it("parses NOT expression", () => {
    const result = parseQuery('NOT status = "Done"');
    expect(result.where).toMatchObject({
      type: "not",
      expression: { type: "comparison", field: "status" },
    });
  });

  it("parses parenthesized expressions", () => {
    const result = parseQuery(
      '(status = "Open" OR status = "Reopened") AND priority = "High"',
    );
    expect(result.where).toMatchObject({
      type: "logical",
      operator: "AND",
      left: { type: "logical", operator: "OR" },
      right: { type: "comparison", field: "priority" },
    });
  });

  it("parses ORDER BY", () => {
    const result = parseQuery("ORDER BY created DESC");
    expect(result.where).toBeNull();
    expect(result.orderBy).toEqual([{ field: "created", direction: "DESC" }]);
  });

  it("parses query with ORDER BY", () => {
    const result = parseQuery(
      'status = "Open" ORDER BY priority ASC, created DESC',
    );
    expect(result.where).toMatchObject({ type: "comparison" });
    expect(result.orderBy).toEqual([
      { field: "priority", direction: "ASC" },
      { field: "created", direction: "DESC" },
    ]);
  });

  it("defaults ORDER BY direction to ASC", () => {
    const result = parseQuery("ORDER BY created");
    expect(result.orderBy[0]!.direction).toBe("ASC");
  });

  it("throws ParseError on invalid input", () => {
    expect(() => parseQuery("= =")).toThrow(ParseError);
  });

  it("parses contains operator", () => {
    const result = parseQuery('summary ~ "login bug"');
    expect(result.where).toEqual({
      type: "comparison",
      field: "summary",
      operator: "~",
      value: "login bug",
    });
  });
});
