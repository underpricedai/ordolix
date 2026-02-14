/**
 * GitHub webhook handler.
 *
 * Verifies webhook signatures and processes push, PR, and issue comment events.
 * Auto-links resources when issue keys (e.g., "ORD-123") are mentioned.
 *
 * @module integrations/github/webhook
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { IntegrationError } from "@/server/lib/errors";
import { GitHubClient } from "./client";
import type {
  GitHubPREvent,
  GitHubPushEvent,
  GitHubIssueCommentEvent,
} from "./types";

/**
 * Regex to match Ordolix issue keys in text.
 * Matches patterns like "ORD-123", "PROJ-9999".
 */
const ISSUE_KEY_REGEX = /\b([A-Z][A-Z0-9]+-\d+)\b/g;

/**
 * Extract all issue keys from a string.
 *
 * @param text - The text to scan for issue keys
 * @returns Array of unique issue keys found
 *
 * @example
 * ```ts
 * extractIssueKeys("Fix ORD-123 and ORD-456"); // ["ORD-123", "ORD-456"]
 * ```
 */
export function extractIssueKeys(text: string): string[] {
  const matches = text.match(ISSUE_KEY_REGEX);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Verify a GitHub webhook signature (HMAC SHA-256).
 *
 * @param secret - The webhook secret configured in GitHub
 * @param payload - The raw request body
 * @param signature - The X-Hub-Signature-256 header value
 * @returns True if the signature is valid
 *
 * @example
 * ```ts
 * const valid = verifySignature("mysecret", rawBody, req.headers["x-hub-signature-256"]);
 * ```
 */
export function verifySignature(
  secret: string,
  payload: string,
  signature: string,
): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;

  if (expected.length !== signature.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Look up an Ordolix issue by its key.
 *
 * @param db - Prisma client
 * @param organizationId - The organization to search within
 * @param key - Issue key (e.g., "ORD-123")
 * @returns The issue record or null
 */
async function findIssueByKey(
  db: PrismaClient,
  organizationId: string,
  key: string,
) {
  return db.issue.findFirst({
    where: { organizationId, key },
    select: { id: true, key: true, projectId: true },
  });
}

/**
 * Handle a GitHub push event.
 *
 * Scans commit messages for issue keys and creates GitHubLink records for
 * each mentioned issue.
 *
 * @param db - Prisma client
 * @param organizationId - The organization owning the integration
 * @param token - GitHub API token for creating links
 * @param event - The push event payload
 * @returns Array of created link records
 */
export async function handlePushEvent(
  db: PrismaClient,
  organizationId: string,
  token: string,
  event: GitHubPushEvent,
): Promise<Array<{ issueKey: string; commitSha: string }>> {
  const client = new GitHubClient(token);
  const owner = event.repository.owner.login;
  const repo = event.repository.name;
  const linked: Array<{ issueKey: string; commitSha: string }> = [];

  for (const commit of event.commits) {
    const keys = extractIssueKeys(commit.message);
    for (const key of keys) {
      const issue = await findIssueByKey(db, organizationId, key);
      if (!issue) continue;

      try {
        const commitData = await client.getCommit(owner, repo, commit.id);
        await client.linkCommit(db, issue.id, owner, repo, commitData);
        linked.push({ issueKey: key, commitSha: commit.id });
      } catch (error) {
        // Log but continue processing other commits
        if (error instanceof IntegrationError) {
          // Skip already-linked commits silently
          continue;
        }
        throw error;
      }
    }
  }

  return linked;
}

/**
 * Handle a GitHub pull request event.
 *
 * Scans PR title and body for issue keys and creates GitHubLink records.
 * Updates existing links when PR state changes.
 *
 * @param db - Prisma client
 * @param organizationId - The organization owning the integration
 * @param token - GitHub API token
 * @param event - The PR event payload
 * @returns Array of linked issue keys
 */
export async function handlePREvent(
  db: PrismaClient,
  organizationId: string,
  token: string,
  event: GitHubPREvent,
): Promise<Array<{ issueKey: string; prNumber: number }>> {
  const client = new GitHubClient(token);
  const owner = event.repository.owner.login;
  const repo = event.repository.name;
  const pr = event.pull_request;
  const linked: Array<{ issueKey: string; prNumber: number }> = [];

  // Extract issue keys from PR title and body
  const text = `${pr.title} ${pr.body ?? ""}`;
  const keys = extractIssueKeys(text);

  // Also check the branch name (e.g., feature/ORD-123-description)
  const branchKeys = extractIssueKeys(pr.head.ref.replace(/_/g, "-").replace(/\//g, " ").toUpperCase());
  const allKeys = [...new Set([...keys, ...branchKeys])];

  for (const key of allKeys) {
    const issue = await findIssueByKey(db, organizationId, key);
    if (!issue) continue;

    if (event.action === "opened" || event.action === "reopened") {
      try {
        await client.linkPR(db, issue.id, owner, repo, pr);
        linked.push({ issueKey: key, prNumber: pr.number });
      } catch {
        // May already be linked
      }
    } else if (event.action === "closed" || event.action === "synchronize") {
      // Update existing link state
      const state = pr.merged ? "merged" : pr.state;
      await db.gitHubLink.updateMany({
        where: {
          issueId: issue.id,
          resourceType: "pull_request",
          owner,
          repo,
          number: pr.number,
        },
        data: {
          state,
          sha: pr.head.sha,
          updatedAt: new Date(),
        },
      });
      linked.push({ issueKey: key, prNumber: pr.number });
    }
  }

  return linked;
}

/**
 * Handle a GitHub issue comment event.
 *
 * Scans comment body for issue keys and creates links when comments
 * on PRs/issues reference Ordolix issues.
 *
 * @param db - Prisma client
 * @param organizationId - The organization owning the integration
 * @param event - The issue comment event payload
 * @returns Array of issue keys found in the comment
 */
export async function handleIssueCommentEvent(
  db: PrismaClient,
  organizationId: string,
  event: GitHubIssueCommentEvent,
): Promise<string[]> {
  if (event.action !== "created") return [];

  const keys = extractIssueKeys(event.comment.body);
  const found: string[] = [];

  for (const key of keys) {
    const issue = await findIssueByKey(db, organizationId, key);
    if (issue) {
      found.push(key);
    }
  }

  return found;
}
