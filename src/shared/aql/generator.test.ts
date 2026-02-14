import { describe, expect, it } from "vitest";
import { generate } from "./generator";
import type { ASTNode, OrderByItem } from "./types";

describe("generator", () => {
  it("generates equality comparison", () => {
    const node: ASTNode = {
      type: "comparison",
      field: "key",
      operator: "=",
      value: "TEST-1",
    };
    const result = generate(node, []);
    expect(result.where).toEqual({ key: "TEST-1" });
  });

  it("maps AQL field names to Prisma paths", () => {
    const node: ASTNode = {
      type: "comparison",
      field: "status",
      operator: "=",
      value: "Done",
    };
    const result = generate(node, []);
    expect(result.where).toEqual({ status: { name: "Done" } });
  });

  it("generates nested where for dot-path fields", () => {
    const node: ASTNode = {
      type: "comparison",
      field: "priority",
      operator: "=",
      value: "High",
    };
    const result = generate(node, []);
    expect(result.where).toEqual({ priority: { name: "High" } });
  });

  it("generates greater-than comparison", () => {
    const node: ASTNode = {
      type: "comparison",
      field: "storyPoints",
      operator: ">",
      value: 5,
    };
    const result = generate(node, []);
    expect(result.where).toEqual({ storyPoints: { gt: 5 } });
  });

  it("generates contains comparison", () => {
    const node: ASTNode = {
      type: "comparison",
      field: "summary",
      operator: "~",
      value: "login",
    };
    const result = generate(node, []);
    expect(result.where).toEqual({
      summary: { contains: "login", mode: "insensitive" },
    });
  });

  it("generates IN for regular fields", () => {
    const node: ASTNode = {
      type: "in",
      field: "status",
      values: ["Open", "Reopened"],
    };
    const result = generate(node, []);
    expect(result.where).toEqual({
      status: { name: { in: ["Open", "Reopened"] } },
    });
  });

  it("generates hasSome for labels IN", () => {
    const node: ASTNode = {
      type: "in",
      field: "labels",
      values: ["bug", "urgent"],
    };
    const result = generate(node, []);
    expect(result.where).toEqual({
      labels: { hasSome: ["bug", "urgent"] },
    });
  });

  it("generates has for labels equality", () => {
    const node: ASTNode = {
      type: "comparison",
      field: "labels",
      operator: "=",
      value: "bug",
    };
    const result = generate(node, []);
    expect(result.where).toEqual({ labels: { has: "bug" } });
  });

  it("generates IS NULL", () => {
    const node: ASTNode = {
      type: "is",
      field: "assignee",
      negated: false,
      check: "null",
    };
    const result = generate(node, []);
    expect(result.where).toEqual({ assigneeId: null });
  });

  it("generates IS NOT NULL", () => {
    const node: ASTNode = {
      type: "is",
      field: "assignee",
      negated: true,
      check: "null",
    };
    const result = generate(node, []);
    expect(result.where).toEqual({ assigneeId: { not: null } });
  });

  it("generates AND logical expression", () => {
    const node: ASTNode = {
      type: "logical",
      operator: "AND",
      left: { type: "comparison", field: "key", operator: "=", value: "A" },
      right: { type: "comparison", field: "key", operator: "=", value: "B" },
    };
    const result = generate(node, []);
    expect(result.where).toEqual({
      AND: [{ key: "A" }, { key: "B" }],
    });
  });

  it("generates NOT expression", () => {
    const node: ASTNode = {
      type: "not",
      expression: { type: "comparison", field: "key", operator: "=", value: "X" },
    };
    const result = generate(node, []);
    expect(result.where).toEqual({ NOT: { key: "X" } });
  });

  it("generates ORDER BY", () => {
    const orderBy: OrderByItem[] = [
      { field: "created", direction: "DESC" },
      { field: "priority", direction: "ASC" },
    ];
    const result = generate(null, orderBy);
    expect(result.where).toEqual({});
    expect(result.orderBy).toEqual([
      { createdAt: "desc" },
      { priority: { rank: "asc" } },
    ]);
  });

  it("returns undefined orderBy when empty", () => {
    const result = generate(null, []);
    expect(result.orderBy).toBeUndefined();
  });
});
