import type { PrismaClient, Prisma } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import type {
  CreateSLAConfigInput,
  UpdateSLAConfigInput,
  ListSLAConfigsInput,
  StartSLAInput,
  GetSLAInstancesInput,
} from "../types/schemas";

export async function createSLAConfig(
  db: PrismaClient,
  organizationId: string,
  input: CreateSLAConfigInput,
) {
  return db.sLAConfig.create({
    data: {
      organizationId,
      name: input.name,
      metric: input.metric,
      targetDuration: input.targetDuration,
      projectId: input.projectId,
      startCondition:
        input.startCondition as unknown as Prisma.InputJsonValue,
      stopCondition:
        input.stopCondition as unknown as Prisma.InputJsonValue,
      pauseConditions:
        input.pauseConditions as unknown as Prisma.InputJsonValue,
      calendar: input.calendar as unknown as Prisma.InputJsonValue,
      escalationRules:
        input.escalationRules as unknown as Prisma.InputJsonValue,
      isActive: input.isActive,
    },
  });
}

export async function updateSLAConfig(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: Omit<UpdateSLAConfigInput, "id">,
) {
  const existing = await db.sLAConfig.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("SLAConfig", id);
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.metric !== undefined) data.metric = input.metric;
  if (input.targetDuration !== undefined)
    data.targetDuration = input.targetDuration;
  if (input.projectId !== undefined) data.projectId = input.projectId;
  if (input.startCondition !== undefined)
    data.startCondition =
      input.startCondition as unknown as Prisma.InputJsonValue;
  if (input.stopCondition !== undefined)
    data.stopCondition =
      input.stopCondition as unknown as Prisma.InputJsonValue;
  if (input.pauseConditions !== undefined)
    data.pauseConditions =
      input.pauseConditions as unknown as Prisma.InputJsonValue;
  if (input.calendar !== undefined)
    data.calendar = input.calendar as unknown as Prisma.InputJsonValue;
  if (input.escalationRules !== undefined)
    data.escalationRules =
      input.escalationRules as unknown as Prisma.InputJsonValue;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  return db.sLAConfig.update({
    where: { id },
    data,
  });
}

export async function listSLAConfigs(
  db: PrismaClient,
  organizationId: string,
  input: ListSLAConfigsInput,
) {
  return db.sLAConfig.findMany({
    where: {
      organizationId,
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    orderBy: { createdAt: "desc" as const },
  });
}

export async function getSLAConfig(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const config = await db.sLAConfig.findFirst({
    where: { id, organizationId },
  });
  if (!config) {
    throw new NotFoundError("SLAConfig", id);
  }
  return config;
}

export async function deleteSLAConfig(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const existing = await db.sLAConfig.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("SLAConfig", id);
  }

  return db.sLAConfig.delete({ where: { id } });
}

export async function startSLA(
  db: PrismaClient,
  organizationId: string,
  input: StartSLAInput,
) {
  const config = await db.sLAConfig.findFirst({
    where: { id: input.slaConfigId, organizationId },
  });
  if (!config) {
    throw new NotFoundError("SLAConfig", input.slaConfigId);
  }

  const startedAt = new Date();
  const breachTime = new Date(
    startedAt.getTime() + config.targetDuration * 60 * 1000,
  );
  const remainingMs = config.targetDuration * 60 * 1000;

  return db.sLAInstance.create({
    data: {
      organizationId,
      slaConfigId: input.slaConfigId,
      issueId: input.issueId,
      status: "active",
      startedAt,
      breachTime,
      remainingMs,
      elapsedMs: 0,
    },
  });
}

export async function pauseSLA(
  db: PrismaClient,
  organizationId: string,
  instanceId: string,
) {
  const instance = await db.sLAInstance.findFirst({
    where: { id: instanceId, organizationId },
  });
  if (!instance) {
    throw new NotFoundError("SLAInstance", instanceId);
  }
  if (instance.status !== "active") {
    throw new ValidationError("SLA instance must be active to pause", {
      code: "SLA_NOT_ACTIVE",
      currentStatus: instance.status,
    });
  }

  const now = new Date();
  const elapsedSinceStart = now.getTime() - instance.startedAt.getTime();

  return db.sLAInstance.update({
    where: { id: instanceId },
    data: {
      status: "paused",
      pausedAt: now,
      elapsedMs: elapsedSinceStart,
    },
  });
}

export async function resumeSLA(
  db: PrismaClient,
  organizationId: string,
  instanceId: string,
) {
  const instance = await db.sLAInstance.findFirst({
    where: { id: instanceId, organizationId },
  });
  if (!instance) {
    throw new NotFoundError("SLAInstance", instanceId);
  }
  if (instance.status !== "paused") {
    throw new ValidationError("SLA instance must be paused to resume", {
      code: "SLA_NOT_PAUSED",
      currentStatus: instance.status,
    });
  }

  const now = new Date();
  const pausedMs = instance.pausedAt
    ? now.getTime() - instance.pausedAt.getTime()
    : 0;
  const newBreachTime = instance.breachTime
    ? new Date(instance.breachTime.getTime() + pausedMs)
    : null;

  return db.sLAInstance.update({
    where: { id: instanceId },
    data: {
      status: "active",
      pausedAt: null,
      ...(newBreachTime && { breachTime: newBreachTime }),
    },
  });
}

export async function completeSLA(
  db: PrismaClient,
  organizationId: string,
  instanceId: string,
) {
  const instance = await db.sLAInstance.findFirst({
    where: { id: instanceId, organizationId },
  });
  if (!instance) {
    throw new NotFoundError("SLAInstance", instanceId);
  }
  if (instance.status !== "active" && instance.status !== "paused") {
    throw new ValidationError(
      "SLA instance must be active or paused to complete",
      {
        code: "SLA_CANNOT_COMPLETE",
        currentStatus: instance.status,
      },
    );
  }

  const completedAt = new Date();
  const status =
    instance.breachTime && completedAt <= instance.breachTime
      ? "met"
      : "breached";

  return db.sLAInstance.update({
    where: { id: instanceId },
    data: {
      status,
      completedAt,
    },
  });
}

export async function getSLAInstances(
  db: PrismaClient,
  organizationId: string,
  issueId: string,
  input: GetSLAInstancesInput,
) {
  return db.sLAInstance.findMany({
    where: {
      organizationId,
      issueId,
      ...(input.status !== undefined && { status: input.status }),
    },
    include: { slaConfig: true },
    orderBy: { startedAt: "desc" as const },
  });
}
