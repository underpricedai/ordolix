import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import type {
  CreateIncidentInput,
  UpdateIncidentInput,
  ListIncidentsInput,
  TimelineEntry,
  CommunicationEntry,
} from "../types/schemas";

const ISSUE_SELECT = {
  select: { id: true, key: true, summary: true },
} as const;

export async function createIncident(
  db: PrismaClient,
  organizationId: string,
  input: CreateIncidentInput,
) {
  const issue = await db.issue.findFirst({
    where: { id: input.issueId, organizationId, deletedAt: null },
  });
  if (!issue) {
    throw new NotFoundError("Issue", input.issueId);
  }

  return db.incident.create({
    data: {
      organizationId,
      issueId: input.issueId,
      severity: input.severity,
      startedAt: new Date(),
    },
    include: { issue: ISSUE_SELECT },
  });
}

export async function getIncident(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const incident = await db.incident.findFirst({
    where: { id, organizationId },
    include: { issue: ISSUE_SELECT },
  });
  if (!incident) {
    throw new NotFoundError("Incident", id);
  }
  return incident;
}

export async function listIncidents(
  db: PrismaClient,
  organizationId: string,
  input: ListIncidentsInput,
) {
  const where: Record<string, unknown> = { organizationId };

  if (input.severity) {
    where["severity"] = input.severity;
  }

  if (input.resolved === true) {
    where["resolvedAt"] = { not: null };
  } else if (input.resolved === false) {
    where["resolvedAt"] = null;
  }

  return db.incident.findMany({
    where,
    include: { issue: ISSUE_SELECT },
    orderBy: { createdAt: "desc" as const },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });
}

export async function updateIncident(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: Omit<UpdateIncidentInput, "id">,
) {
  const incident = await db.incident.findFirst({
    where: { id, organizationId },
  });
  if (!incident) {
    throw new NotFoundError("Incident", id);
  }

  return db.incident.update({
    where: { id },
    data: {
      ...(input.severity !== undefined ? { severity: input.severity } : {}),
      ...(input.statusPageUpdate !== undefined
        ? { statusPageUpdate: input.statusPageUpdate }
        : {}),
    },
    include: { issue: ISSUE_SELECT },
  });
}

export async function addTimelineEntry(
  db: PrismaClient,
  organizationId: string,
  id: string,
  entry: TimelineEntry,
) {
  const incident = await db.incident.findFirst({
    where: { id, organizationId },
  });
  if (!incident) {
    throw new NotFoundError("Incident", id);
  }

  const timeline = Array.isArray(incident.timeline) ? incident.timeline : [];
  const newEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  return db.incident.update({
    where: { id },
    data: {
      timeline: [...timeline, newEntry],
    },
    include: { issue: ISSUE_SELECT },
  });
}

export async function addCommunication(
  db: PrismaClient,
  organizationId: string,
  id: string,
  entry: CommunicationEntry,
) {
  const incident = await db.incident.findFirst({
    where: { id, organizationId },
  });
  if (!incident) {
    throw new NotFoundError("Incident", id);
  }

  const communications = Array.isArray(incident.communications)
    ? incident.communications
    : [];
  const newEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  return db.incident.update({
    where: { id },
    data: {
      communications: [...communications, newEntry],
    },
    include: { issue: ISSUE_SELECT },
  });
}

export async function resolveIncident(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const incident = await db.incident.findFirst({
    where: { id, organizationId },
  });
  if (!incident) {
    throw new NotFoundError("Incident", id);
  }

  if (incident.resolvedAt) {
    throw new ValidationError("Incident has already been resolved", {
      code: "INCIDENT_ALREADY_RESOLVED",
      resolvedAt: incident.resolvedAt.toISOString(),
    });
  }

  const timeline = Array.isArray(incident.timeline) ? incident.timeline : [];
  const resolvedEntry = {
    event: "Incident resolved",
    timestamp: new Date().toISOString(),
  };

  return db.incident.update({
    where: { id },
    data: {
      resolvedAt: new Date(),
      timeline: [...timeline, resolvedEntry],
    },
    include: { issue: ISSUE_SELECT },
  });
}

export async function deleteIncident(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const incident = await db.incident.findFirst({
    where: { id, organizationId },
  });
  if (!incident) {
    throw new NotFoundError("Incident", id);
  }

  return db.incident.delete({
    where: { id },
  });
}
