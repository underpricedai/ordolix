/**
 * TypeScript types for the GitHub integration.
 *
 * Covers webhook payloads, API responses, and configuration.
 *
 * @module integrations/github/types
 */

// ── Configuration ──────────────────────────────────────────────────────────

/** GitHub integration configuration stored in IntegrationConfig.config */
export interface GitHubConfig {
  /** Default repository owner (organization or user) */
  owner: string;
  /** Default repository name */
  repo?: string;
  /** GitHub API base URL (defaults to https://api.github.com) */
  baseUrl?: string;
  /** Whether to auto-link PRs/commits mentioning issue keys */
  autoLink: boolean;
}

// ── API Response Types ────────────────────────────────────────────────────

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  state: "open" | "closed";
  merged: boolean;
  title: string;
  body: string | null;
  html_url: string;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
}

export interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
  };
  author: GitHubUser | null;
}

export interface GitHubIssueComment {
  id: number;
  body: string;
  html_url: string;
  user: GitHubUser;
  created_at: string;
}

// ── Webhook Event Types ───────────────────────────────────────────────────

export interface GitHubWebhookHeaders {
  "x-hub-signature-256": string;
  "x-github-event": string;
  "x-github-delivery": string;
}

export interface GitHubWebhookPayload {
  action?: string;
  sender: GitHubUser;
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: GitHubUser;
    html_url: string;
  };
}

export interface GitHubPREvent extends GitHubWebhookPayload {
  action: "opened" | "closed" | "reopened" | "synchronize" | "edited";
  number: number;
  pull_request: GitHubPullRequest;
}

export interface GitHubPushEvent extends GitHubWebhookPayload {
  ref: string;
  before: string;
  after: string;
  commits: Array<{
    id: string;
    message: string;
    url: string;
    author: { name: string; email: string; username?: string };
    added: string[];
    modified: string[];
    removed: string[];
  }>;
  head_commit: {
    id: string;
    message: string;
    url: string;
    author: { name: string; email: string; username?: string };
  } | null;
}

export interface GitHubIssueCommentEvent extends GitHubWebhookPayload {
  action: "created" | "edited" | "deleted";
  comment: GitHubIssueComment;
  issue: {
    number: number;
    title: string;
    html_url: string;
    pull_request?: { url: string };
  };
}

// ── Link Types ───────────────────────────────────────────────────────────

/** Resource types that can be linked from GitHub */
export type GitHubResourceType = "pull_request" | "branch" | "commit";

/** Input for creating a GitHub link record */
export interface CreateGitHubLinkInput {
  issueId: string;
  resourceType: GitHubResourceType;
  owner: string;
  repo: string;
  number?: number;
  sha?: string;
  branch?: string;
  state?: string;
  url: string;
}
