import { TokenType, type Token } from "./types";

const KEYWORDS: Record<string, TokenType> = {
  AND: TokenType.AND,
  OR: TokenType.OR,
  NOT: TokenType.NOT,
  IN: TokenType.IN,
  IS: TokenType.IS,
  EMPTY: TokenType.EMPTY,
  NULL: TokenType.NULL,
  ORDER: TokenType.ORDER,
  BY: TokenType.BY,
  ASC: TokenType.ASC,
  DESC: TokenType.DESC,
};

const OPERATORS = ["!=", ">=", "<=", "!~", "=", ">", "<", "~"];

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    const ch = input[pos]!;

    // Skip whitespace
    if (/\s/.test(ch)) {
      pos++;
      continue;
    }

    // String literal
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = pos;
      pos++;
      let value = "";
      while (pos < input.length && input[pos] !== quote) {
        if (input[pos] === "\\" && pos + 1 < input.length) {
          pos++;
        }
        value += input[pos];
        pos++;
      }
      if (pos < input.length) pos++; // closing quote
      tokens.push({ type: TokenType.STRING, value, position: start });
      continue;
    }

    // Parentheses
    if (ch === "(") {
      tokens.push({ type: TokenType.LPAREN, value: "(", position: pos });
      pos++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: TokenType.RPAREN, value: ")", position: pos });
      pos++;
      continue;
    }

    // Comma
    if (ch === ",") {
      tokens.push({ type: TokenType.COMMA, value: ",", position: pos });
      pos++;
      continue;
    }

    // Operators (multi-char first)
    let matchedOp = false;
    for (const op of OPERATORS) {
      if (input.startsWith(op, pos)) {
        tokens.push({ type: TokenType.OPERATOR, value: op, position: pos });
        pos += op.length;
        matchedOp = true;
        break;
      }
    }
    if (matchedOp) continue;

    // Number (including negative)
    if (
      /\d/.test(ch) ||
      (ch === "-" && pos + 1 < input.length && /\d/.test(input[pos + 1]!))
    ) {
      const start = pos;
      if (ch === "-") pos++;
      while (pos < input.length && /[\d.]/.test(input[pos]!)) {
        pos++;
      }
      tokens.push({
        type: TokenType.NUMBER,
        value: input.slice(start, pos),
        position: start,
      });
      continue;
    }

    // Identifier or keyword
    if (/[a-zA-Z_]/.test(ch)) {
      const start = pos;
      while (pos < input.length && /[a-zA-Z0-9_.]/.test(input[pos]!)) {
        pos++;
      }
      const word = input.slice(start, pos);
      const upper = word.toUpperCase();
      const keywordType = KEYWORDS[upper];
      if (keywordType) {
        tokens.push({ type: keywordType, value: upper, position: start });
      } else {
        tokens.push({
          type: TokenType.IDENTIFIER,
          value: word,
          position: start,
        });
      }
      continue;
    }

    // Unknown character — skip
    pos++;
  }

  tokens.push({ type: TokenType.EOF, value: "", position: pos });
  return tokens;
}
