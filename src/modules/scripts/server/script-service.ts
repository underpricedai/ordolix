import type { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/server/lib/errors";
import type {
  CreateScriptInput,
  ExecuteScriptInput,
  ListScriptsInput,
  ListExecutionsInput,
} from "../types/schemas";

export async function createScript(
  db: PrismaClient,
  organizationId: string,
  input: CreateScriptInput,
) {
  const existing = await db.script.findFirst({
    where: { organizationId, name: input.name },
  });
  if (existing) {
    throw new ConflictError(`Script '${input.name}' already exists`);
  }

  return db.script.create({
    data: {
      organizationId,
      name: input.name,
      description: input.description,
      triggerType: input.triggerType,
      code: input.code,
      isEnabled: input.isEnabled,
    },
  });
}

export async function getScript(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const script = await db.script.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { executions: true } } },
  });
  if (!script) {
    throw new NotFoundError("Script", id);
  }
  return script;
}

export async function listScripts(
  db: PrismaClient,
  organizationId: string,
  input: ListScriptsInput,
) {
  return db.script.findMany({
    where: {
      organizationId,
      ...(input.triggerType ? { triggerType: input.triggerType } : {}),
      ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
    },
    orderBy: { name: "asc" as const },
  });
}

export async function updateScript(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: Omit<Partial<CreateScriptInput>, "isEnabled"> & { isEnabled?: boolean },
) {
  const script = await db.script.findFirst({
    where: { id, organizationId },
  });
  if (!script) {
    throw new NotFoundError("Script", id);
  }

  if (input.name && input.name !== script.name) {
    const existing = await db.script.findFirst({
      where: { organizationId, name: input.name },
    });
    if (existing) {
      throw new ConflictError(`Script '${input.name}' already exists`);
    }
  }

  return db.script.update({
    where: { id },
    data: input,
  });
}

export async function deleteScript(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const script = await db.script.findFirst({
    where: { id, organizationId },
  });
  if (!script) {
    throw new NotFoundError("Script", id);
  }

  return db.script.delete({ where: { id } });
}

export async function executeScript(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: ExecuteScriptInput,
) {
  const script = await db.script.findFirst({
    where: { id: input.scriptId, organizationId },
  });
  if (!script) {
    throw new NotFoundError("Script", input.scriptId);
  }
  if (!script.isEnabled) {
    throw new ValidationError("Script is disabled", {
      code: "SCRIPT_DISABLED",
    });
  }

  const startTime = Date.now();

  // Sandboxed execution stub — in production this runs in an isolate
  let status = "success";
  let output: string | null = "Execution completed";
  let error: string | null = null;

  try {
    // Stub: actual execution would use a sandboxed runtime
    output = JSON.stringify({ result: "ok", context: input.context });
  } catch (e) {
    status = "error";
    error = e instanceof Error ? e.message : "Unknown error";
    output = null;
  }

  const duration = Date.now() - startTime;

  const execution = await db.scriptExecution.create({
    data: {
      scriptId: input.scriptId,
      executedBy: userId,
      status,
      output,
      error,
      duration,
    },
  });

  return execution;
}

export async function listExecutions(
  db: PrismaClient,
  organizationId: string,
  input: ListExecutionsInput,
) {
  // Verify script belongs to org
  const script = await db.script.findFirst({
    where: { id: input.scriptId, organizationId },
  });
  if (!script) {
    throw new NotFoundError("Script", input.scriptId);
  }

  return db.scriptExecution.findMany({
    where: {
      scriptId: input.scriptId,
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: { createdAt: "desc" as const },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });
}
