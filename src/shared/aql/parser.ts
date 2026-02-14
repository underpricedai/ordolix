import {
  TokenType,
  type Token,
  type ASTNode,
  type OrderByItem,
  type ParseResult,
  type ComparisonNode,
  type InNode,
  type IsNode,
  type LogicalNode,
  type NotNode,
} from "./types";

export class ParseError extends Error {
  constructor(
    message: string,
    public position: number,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

export function parse(tokens: Token[]): ParseResult {
  let pos = 0;

  function current(): Token {
    return tokens[pos] ?? { type: TokenType.EOF, value: "", position: -1 };
  }

  function advance(): Token {
    const token = current();
    pos++;
    return token;
  }

  function expect(type: TokenType): Token {
    const token = current();
    if (token.type !== type) {
      throw new ParseError(
        `Expected ${type} but got ${token.type}`,
        token.position,
      );
    }
    return advance();
  }

  function parseExpression(): ASTNode {
    return parseOr();
  }

  function parseOr(): ASTNode {
    let left = parseAnd();
    while (current().type === TokenType.OR) {
      advance();
      const right = parseAnd();
      left = {
        type: "logical",
        operator: "OR",
        left,
        right,
      } satisfies LogicalNode;
    }
    return left;
  }

  function parseAnd(): ASTNode {
    let left = parseNot();
    while (current().type === TokenType.AND) {
      advance();
      const right = parseNot();
      left = {
        type: "logical",
        operator: "AND",
        left,
        right,
      } satisfies LogicalNode;
    }
    return left;
  }

  function parseNot(): ASTNode {
    if (current().type === TokenType.NOT) {
      advance();
      const expr = parsePrimary();
      return { type: "not", expression: expr } satisfies NotNode;
    }
    return parsePrimary();
  }

  function parsePrimary(): ASTNode {
    // Parenthesized expression
    if (current().type === TokenType.LPAREN) {
      advance();
      const expr = parseExpression();
      expect(TokenType.RPAREN);
      return expr;
    }

    const fieldToken = expect(TokenType.IDENTIFIER);
    const field = fieldToken.value;

    // IS [NOT] EMPTY/NULL
    if (current().type === TokenType.IS) {
      advance();
      let negated = false;
      if (current().type === TokenType.NOT) {
        advance();
        negated = true;
      }
      const checkToken = current();
      if (checkToken.type === TokenType.EMPTY) {
        advance();
        return { type: "is", field, negated, check: "empty" } satisfies IsNode;
      }
      if (checkToken.type === TokenType.NULL) {
        advance();
        return { type: "is", field, negated, check: "null" } satisfies IsNode;
      }
      throw new ParseError(
        `Expected EMPTY or NULL after IS`,
        checkToken.position,
      );
    }

    // IN (value1, value2, ...)
    if (current().type === TokenType.IN) {
      advance();
      expect(TokenType.LPAREN);
      const values: (string | number)[] = [];
      while (
        current().type !== TokenType.RPAREN &&
        current().type !== TokenType.EOF
      ) {
        const valToken = current();
        if (valToken.type === TokenType.STRING) {
          values.push(valToken.value);
          advance();
        } else if (valToken.type === TokenType.NUMBER) {
          values.push(Number(valToken.value));
          advance();
        } else {
          throw new ParseError(
            `Expected value in IN list`,
            valToken.position,
          );
        }
        if (current().type === TokenType.COMMA) {
          advance();
        }
      }
      expect(TokenType.RPAREN);
      return { type: "in", field, values } satisfies InNode;
    }

    // Comparison: field operator value
    const opToken = expect(TokenType.OPERATOR);
    const valueToken = current();
    let value: string | number;
    if (valueToken.type === TokenType.STRING) {
      value = valueToken.value;
      advance();
    } else if (valueToken.type === TokenType.NUMBER) {
      value = Number(valueToken.value);
      advance();
    } else if (valueToken.type === TokenType.IDENTIFIER) {
      value = valueToken.value;
      advance();
    } else {
      throw new ParseError(
        `Expected value after operator`,
        valueToken.position,
      );
    }

    return {
      type: "comparison",
      field,
      operator: opToken.value as ComparisonNode["operator"],
      value,
    } satisfies ComparisonNode;
  }

  // Parse WHERE clause
  let where: ASTNode | null = null;
  if (
    current().type !== TokenType.EOF &&
    current().type !== TokenType.ORDER
  ) {
    where = parseExpression();
  }

  // Parse ORDER BY clause
  const orderBy: OrderByItem[] = [];
  if (current().type === TokenType.ORDER) {
    advance();
    expect(TokenType.BY);
    while (current().type === TokenType.IDENTIFIER) {
      const sortField = advance();
      let direction: "ASC" | "DESC" = "ASC";
      if (current().type === TokenType.ASC) {
        advance();
      } else if (current().type === TokenType.DESC) {
        advance();
        direction = "DESC";
      }
      orderBy.push({ field: sortField.value, direction });
      if (current().type === TokenType.COMMA) {
        advance();
      }
    }
  }

  return { where, orderBy };
}
