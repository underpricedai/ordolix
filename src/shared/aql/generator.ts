import type { ASTNode, OrderByItem } from "./types";

const FIELD_MAP: Record<string, string> = {
  project: "project.key",
  status: "status.name",
  assignee: "assigneeId",
  reporter: "reporterId",
  priority: "priority.name",
  issueType: "issueType.name",
  type: "issueType.name",
  summary: "summary",
  description: "description",
  labels: "labels",
  created: "createdAt",
  createdAt: "createdAt",
  updated: "updatedAt",
  updatedAt: "updatedAt",
  dueDate: "dueDate",
  startDate: "startDate",
  storyPoints: "storyPoints",
  sprint: "sprint.name",
  resolution: "resolution.name",
  key: "key",
};

const SORT_FIELD_MAP: Record<string, string> = {
  created: "createdAt",
  createdAt: "createdAt",
  updated: "updatedAt",
  updatedAt: "updatedAt",
  priority: "priority",
  rank: "rank",
  dueDate: "dueDate",
  summary: "summary",
  key: "key",
};

function resolveField(field: string): string {
  return FIELD_MAP[field] ?? field;
}

function buildNestedWhere(
  path: string,
  condition: unknown,
): Record<string, unknown> {
  const parts = path.split(".");
  if (parts.length === 1) {
    return { [parts[0]!]: condition };
  }
  const result: Record<string, unknown> = {};
  let current = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const next: Record<string, unknown> = {};
    current[parts[i]!] = next;
    current = next;
  }
  current[parts[parts.length - 1]!] = condition;
  return result;
}

function generateNode(node: ASTNode): Record<string, unknown> {
  switch (node.type) {
    case "comparison": {
      const path = resolveField(node.field);
      if (path === "labels" && node.operator === "=") {
        return { labels: { has: node.value } };
      }
      switch (node.operator) {
        case "=":
          return buildNestedWhere(path, node.value);
        case "!=":
          return buildNestedWhere(path, { not: node.value });
        case ">":
          return buildNestedWhere(path, { gt: node.value });
        case "<":
          return buildNestedWhere(path, { lt: node.value });
        case ">=":
          return buildNestedWhere(path, { gte: node.value });
        case "<=":
          return buildNestedWhere(path, { lte: node.value });
        case "~":
          return buildNestedWhere(path, {
            contains: String(node.value),
            mode: "insensitive",
          });
        case "!~":
          return {
            NOT: buildNestedWhere(path, {
              contains: String(node.value),
              mode: "insensitive",
            }),
          };
        default:
          return {};
      }
    }

    case "in": {
      const path = resolveField(node.field);
      if (path === "labels") {
        return { labels: { hasSome: node.values } };
      }
      return buildNestedWhere(path, { in: node.values });
    }

    case "is": {
      const path = resolveField(node.field);
      return node.negated
        ? buildNestedWhere(path, { not: null })
        : buildNestedWhere(path, null);
    }

    case "logical": {
      const left = generateNode(node.left);
      const right = generateNode(node.right);
      return node.operator === "AND"
        ? { AND: [left, right] }
        : { OR: [left, right] };
    }

    case "not": {
      return { NOT: generateNode(node.expression) };
    }
  }
}

function generateOrderBy(
  items: OrderByItem[],
): Record<string, unknown>[] {
  return items.map((item) => {
    const field = SORT_FIELD_MAP[item.field] ?? item.field;
    const direction = item.direction.toLowerCase();
    if (field === "priority") {
      return { priority: { rank: direction } };
    }
    return { [field]: direction };
  });
}

export function generate(
  where: ASTNode | null,
  orderBy: OrderByItem[],
): {
  where: Record<string, unknown>;
  orderBy: Record<string, unknown>[] | undefined;
} {
  return {
    where: where ? generateNode(where) : {},
    orderBy: orderBy.length > 0 ? generateOrderBy(orderBy) : undefined,
  };
}
