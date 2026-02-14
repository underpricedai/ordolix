export enum TokenType {
  IDENTIFIER = "IDENTIFIER",
  STRING = "STRING",
  NUMBER = "NUMBER",
  OPERATOR = "OPERATOR",
  AND = "AND",
  OR = "OR",
  NOT = "NOT",
  IN = "IN",
  IS = "IS",
  EMPTY = "EMPTY",
  NULL = "NULL",
  ORDER = "ORDER",
  BY = "BY",
  ASC = "ASC",
  DESC = "DESC",
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  COMMA = "COMMA",
  EOF = "EOF",
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export interface ComparisonNode {
  type: "comparison";
  field: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "~" | "!~";
  value: string | number;
}

export interface InNode {
  type: "in";
  field: string;
  values: (string | number)[];
}

export interface IsNode {
  type: "is";
  field: string;
  negated: boolean;
  check: "empty" | "null";
}

export interface LogicalNode {
  type: "logical";
  operator: "AND" | "OR";
  left: ASTNode;
  right: ASTNode;
}

export interface NotNode {
  type: "not";
  expression: ASTNode;
}

export type ASTNode =
  | ComparisonNode
  | InNode
  | IsNode
  | LogicalNode
  | NotNode;

export interface OrderByItem {
  field: string;
  direction: "ASC" | "DESC";
}

export interface ParseResult {
  where: ASTNode | null;
  orderBy: OrderByItem[];
}
