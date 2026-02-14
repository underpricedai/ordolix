export { tokenize } from "./tokenizer";
export { parse, ParseError } from "./parser";
export { generate } from "./generator";
export type {
  Token,
  TokenType,
  ASTNode,
  ComparisonNode,
  InNode,
  IsNode,
  LogicalNode,
  NotNode,
  OrderByItem,
  ParseResult,
} from "./types";

import { tokenize } from "./tokenizer";
import { parse } from "./parser";
import { generate } from "./generator";

export function parseAQL(query: string) {
  const tokens = tokenize(query);
  const ast = parse(tokens);
  return generate(ast.where, ast.orderBy);
}
