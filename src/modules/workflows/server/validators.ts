import type { PrismaClient } from "@prisma/client";
import { ValidationError } from "@/server/lib/errors";
import type { ValidatorConfig } from "../types/schemas";

export interface ValidatorContext {
  db: PrismaClient;
  organizationId: string;
  issue: Record<string, unknown> & { id: string };
}

export type ValidatorFn = (
  ctx: ValidatorContext,
  config: Record<string, unknown>,
) => Promise<void>;

const registry = new Map<string, ValidatorFn>();

registry.set("required_field", async (ctx, config) => {
  const field = config.field as string | undefined;
  if (!field) {
    throw new ValidationError(
      "Validator 'required_field' missing 'field' in config",
    );
  }
  const value = ctx.issue[field];
  if (value === null || value === undefined) {
    throw new ValidationError(
      `Field '${field}' is required for this transition`,
      { code: "WORKFLOW_TRANSITION_BLOCKED", field },
    );
  }
});

registry.set("no_open_subtasks", async (ctx) => {
  const openChildren = await ctx.db.issue.count({
    where: {
      parentId: ctx.issue.id,
      organizationId: ctx.organizationId,
      deletedAt: null,
      status: { category: { not: "DONE" } },
    },
  });
  if (openChildren > 0) {
    throw new ValidationError(
      `Cannot transition: ${openChildren} subtask(s) are still open`,
      { code: "WORKFLOW_TRANSITION_BLOCKED", openSubtasks: openChildren },
    );
  }
});

export async function runValidators(
  ctx: ValidatorContext,
  validators: ValidatorConfig[],
): Promise<void> {
  for (const v of validators) {
    const fn = registry.get(v.type);
    if (!fn) {
      throw new ValidationError(`Unknown validator type: '${v.type}'`, {
        code: "WORKFLOW_TRANSITION_BLOCKED",
        validatorType: v.type,
      });
    }
    await fn(ctx, v.config);
  }
}

export { registry as validatorRegistry };
