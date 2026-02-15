/**
 * GitHub integration service.
 *
 * Manages IntegrationConfig for GitHub and queries GitHubLink records.
 *
 * @module integrations/github/github-service
 */

import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import { createHmac, randomBytes } from "crypto";

const PROVIDER = "github";

// ── Config CRUD ────────────────────────────────────────────────────────────

export async function getConfig(db: PrismaClient, organizationId: string) {
  return db.integrationConfig.findFirst({
    where: { organizationId, provider: PROVIDER },
    select: {
      id: true,
      provider: true,
      config: true,
      isActive: true,
      webhookSecret: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function upsertConfig(
  db: PrismaClient,
  organizationId: string,
  input: { owner: string; repo?: string; baseUrl?: string; autoLink?: boolean; isActive?: boolean },
) {
  const existing = await db.integrationConfig.findUnique({
    where: { organizationId_provider: { organizationId, provider: PROVIDER } },
  });

  const config = {
    owner: input.owner,
    repo: input.repo ?? null,
    baseUrl: input.baseUrl ?? null,
    autoLink: input.autoLink ?? true,
  };

  if (existing) {
    return db.integrationConfig.update({
      where: { id: existing.id },
      data: {
        config,
        isActive: input.isActive ?? existing.isActive,
      },
    });
  }

  // Generate a webhook secret for new configs
  const webhookSecret = randomBytes(32).toString("hex");

  return db.integrationConfig.create({
    data: {
      organizationId,
      provider: PROVIDER,
      config,
      webhookSecret,
      isActive: input.isActive ?? true,
    },
  });
}

export async function deleteConfig(db: PrismaClient, organizationId: string) {
  const existing = await db.integrationConfig.findUnique({
    where: { organizationId_provider: { organizationId, provider: PROVIDER } },
  });

  if (!existing) {
    throw new NotFoundError("IntegrationConfig", PROVIDER);
  }

  return db.integrationConfig.delete({ where: { id: existing.id } });
}

export async function regenerateWebhookSecret(db: PrismaClient, organizationId: string) {
  const existing = await db.integrationConfig.findUnique({
    where: { organizationId_provider: { organizationId, provider: PROVIDER } },
  });

  if (!existing) {
    throw new NotFoundError("IntegrationConfig", PROVIDER);
  }

  const webhookSecret = randomBytes(32).toString("hex");

  return db.integrationConfig.update({
    where: { id: existing.id },
    data: { webhookSecret },
  });
}

// ── Link Queries ───────────────────────────────────────────────────────────

export async function getLinksForIssue(
  db: PrismaClient,
  organizationId: string,
  issueId: string,
) {
  // Verify the issue belongs to this org
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId },
    select: { id: true },
  });

  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  return db.gitHubLink.findMany({
    where: { issueId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteLink(db: PrismaClient, organizationId: string, linkId: string) {
  const link = await db.gitHubLink.findUnique({
    where: { id: linkId },
    include: { issue: { select: { organizationId: true } } },
  });

  if (!link || link.issue.organizationId !== organizationId) {
    throw new NotFoundError("GitHubLink", linkId);
  }

  return db.gitHubLink.delete({ where: { id: linkId } });
}

export async function getRecentLinks(
  db: PrismaClient,
  organizationId: string,
  limit: number = 20,
) {
  return db.gitHubLink.findMany({
    where: {
      issue: { organizationId },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      issue: { select: { id: true, key: true, summary: true } },
    },
  });
}
