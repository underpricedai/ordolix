/**
 * GitHub REST API client.
 *
 * Uses raw fetch (no @octokit dependency). Provides methods for PR, commit,
 * and comment operations, plus GitHubLink record creation.
 *
 * @module integrations/github/client
 */

import type { PrismaClient } from "@prisma/client";
import { IntegrationError } from "@/server/lib/errors";
import type {
  GitHubPullRequest,
  GitHubCommit,
  GitHubIssueComment,
  CreateGitHubLinkInput,
} from "./types";

const DEFAULT_BASE_URL = "https://api.github.com";

/**
 * GitHub REST API client using native fetch.
 *
 * @example
 * ```ts
 * const gh = new GitHubClient("ghp_abc123");
 * const pr = await gh.getPR("ordolix", "ordolix", 42);
 * ```
 */
export class GitHubClient {
  private readonly token: string;
  private readonly baseUrl: string;

  /**
   * @param token - GitHub personal access token or installation token
   * @param baseUrl - API base URL, defaults to https://api.github.com
   */
  constructor(token: string, baseUrl?: string) {
    this.token = token;
    this.baseUrl = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  /**
   * Execute an authenticated request against the GitHub API.
   *
   * @param path - API path (e.g., "/repos/owner/repo/pulls/1")
   * @param options - Additional fetch options
   * @returns Parsed JSON response
   * @throws IntegrationError on non-2xx responses
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...((options.headers as Record<string, string>) ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "Unknown error");
      throw new IntegrationError("GitHub", `API request failed: ${response.status} ${response.statusText}`, {
        url,
        status: response.status,
        body,
      });
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get a pull request by number.
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param number - PR number
   * @returns GitHub pull request data
   */
  async getPR(owner: string, repo: string, number: number): Promise<GitHubPullRequest> {
    return this.request<GitHubPullRequest>(`/repos/${owner}/${repo}/pulls/${number}`);
  }

  /**
   * Get a commit by SHA.
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param sha - Commit SHA
   * @returns GitHub commit data
   */
  async getCommit(owner: string, repo: string, sha: string): Promise<GitHubCommit> {
    return this.request<GitHubCommit>(`/repos/${owner}/${repo}/commits/${sha}`);
  }

  /**
   * Create a comment on an issue or pull request.
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param issueNumber - Issue or PR number
   * @param body - Comment body (Markdown)
   * @returns The created comment
   */
  async createIssueComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
  ): Promise<GitHubIssueComment> {
    return this.request<GitHubIssueComment>(
      `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      },
    );
  }

  /**
   * Create a GitHubLink record for a pull request.
   *
   * @param db - Prisma client
   * @param issueId - Ordolix issue ID to link
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pr - Pull request data
   * @returns The created GitHubLink record
   */
  async linkPR(
    db: PrismaClient,
    issueId: string,
    owner: string,
    repo: string,
    pr: GitHubPullRequest,
  ) {
    return createGitHubLink(db, {
      issueId,
      resourceType: "pull_request",
      owner,
      repo,
      number: pr.number,
      sha: pr.head.sha,
      branch: pr.head.ref,
      state: pr.merged ? "merged" : pr.state,
      url: pr.html_url,
    });
  }

  /**
   * Create a GitHubLink record for a branch.
   *
   * @param db - Prisma client
   * @param issueId - Ordolix issue ID to link
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param branch - Branch name
   * @returns The created GitHubLink record
   */
  async linkBranch(
    db: PrismaClient,
    issueId: string,
    owner: string,
    repo: string,
    branch: string,
  ) {
    return createGitHubLink(db, {
      issueId,
      resourceType: "branch",
      owner,
      repo,
      branch,
      url: `https://github.com/${owner}/${repo}/tree/${branch}`,
    });
  }

  /**
   * Create a GitHubLink record for a commit.
   *
   * @param db - Prisma client
   * @param issueId - Ordolix issue ID to link
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param commit - Commit data
   * @returns The created GitHubLink record
   */
  async linkCommit(
    db: PrismaClient,
    issueId: string,
    owner: string,
    repo: string,
    commit: GitHubCommit,
  ) {
    return createGitHubLink(db, {
      issueId,
      resourceType: "commit",
      owner,
      repo,
      sha: commit.sha,
      url: commit.html_url,
    });
  }
}

/**
 * Create a GitHubLink record in the database.
 *
 * @param db - Prisma client
 * @param input - Link creation data
 * @returns The created GitHubLink record
 */
async function createGitHubLink(db: PrismaClient, input: CreateGitHubLinkInput) {
  return db.gitHubLink.create({
    data: {
      issueId: input.issueId,
      resourceType: input.resourceType,
      owner: input.owner,
      repo: input.repo,
      number: input.number ?? null,
      sha: input.sha ?? null,
      branch: input.branch ?? null,
      state: input.state ?? null,
      url: input.url,
    },
  });
}
