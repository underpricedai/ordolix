import { describe, expect, it } from "vitest";
import { tokenize } from "./tokenizer";
import { TokenType } from "./types";

describe("tokenizer", () => {
  it("tokenizes simple comparison", () => {
    const tokens = tokenize('status = "Done"');
    expect(tokens[0]).toMatchObject({ type: TokenType.IDENTIFIER, value: "status" });
    expect(tokens[1]).toMatchObject({ type: TokenType.OPERATOR, value: "=" });
    expect(tokens[2]).toMatchObject({ type: TokenType.STRING, value: "Done" });
    expect(tokens[3]).toMatchObject({ type: TokenType.EOF });
  });

  it("tokenizes keywords case-insensitively", () => {
    const tokens = tokenize("status = \"x\" and priority = \"y\"");
    expect(tokens[3]).toMatchObject({ type: TokenType.AND });
  });

  it("tokenizes multi-char operators", () => {
    const tokens = tokenize("storyPoints >= 5");
    expect(tokens[1]).toMatchObject({ type: TokenType.OPERATOR, value: ">=" });
  });

  it("tokenizes != and !~ operators", () => {
    const ne = tokenize('status != "Done"');
    expect(ne[1]).toMatchObject({ type: TokenType.OPERATOR, value: "!=" });
    const nc = tokenize('summary !~ "login"');
    expect(nc[1]).toMatchObject({ type: TokenType.OPERATOR, value: "!~" });
  });

  it("tokenizes numbers including negative", () => {
    const tokens = tokenize("storyPoints > -3");
    expect(tokens[2]).toMatchObject({ type: TokenType.NUMBER, value: "-3" });
  });

  it("tokenizes decimal numbers", () => {
    const tokens = tokenize("storyPoints = 3.5");
    expect(tokens[2]).toMatchObject({ type: TokenType.NUMBER, value: "3.5" });
  });

  it("tokenizes IN with parenthesized list", () => {
    const tokens = tokenize('priority IN ("High", "Critical")');
    expect(tokens[0]).toMatchObject({ type: TokenType.IDENTIFIER, value: "priority" });
    expect(tokens[1]).toMatchObject({ type: TokenType.IN });
    expect(tokens[2]).toMatchObject({ type: TokenType.LPAREN });
    expect(tokens[3]).toMatchObject({ type: TokenType.STRING, value: "High" });
    expect(tokens[4]).toMatchObject({ type: TokenType.COMMA });
    expect(tokens[5]).toMatchObject({ type: TokenType.STRING, value: "Critical" });
    expect(tokens[6]).toMatchObject({ type: TokenType.RPAREN });
  });

  it("tokenizes IS NOT NULL", () => {
    const tokens = tokenize("assignee IS NOT NULL");
    expect(tokens[1]).toMatchObject({ type: TokenType.IS });
    expect(tokens[2]).toMatchObject({ type: TokenType.NOT });
    expect(tokens[3]).toMatchObject({ type: TokenType.NULL });
  });

  it("tokenizes ORDER BY with direction", () => {
    const tokens = tokenize("ORDER BY created DESC");
    expect(tokens[0]).toMatchObject({ type: TokenType.ORDER });
    expect(tokens[1]).toMatchObject({ type: TokenType.BY });
    expect(tokens[2]).toMatchObject({ type: TokenType.IDENTIFIER, value: "created" });
    expect(tokens[3]).toMatchObject({ type: TokenType.DESC });
  });

  it("tokenizes single-quoted strings", () => {
    const tokens = tokenize("status = 'In Progress'");
    expect(tokens[2]).toMatchObject({ type: TokenType.STRING, value: "In Progress" });
  });

  it("handles escaped quotes in strings", () => {
    const tokens = tokenize('summary ~ "hello \\"world\\""');
    expect(tokens[2]).toMatchObject({ type: TokenType.STRING, value: 'hello "world"' });
  });

  it("tokenizes contains operator", () => {
    const tokens = tokenize('summary ~ "login"');
    expect(tokens[1]).toMatchObject({ type: TokenType.OPERATOR, value: "~" });
  });

  it("tracks position", () => {
    const tokens = tokenize('a = "b"');
    expect(tokens[0]!.position).toBe(0);
    expect(tokens[1]!.position).toBe(2);
    expect(tokens[2]!.position).toBe(4);
  });
});
