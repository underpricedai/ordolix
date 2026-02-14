/**
 * Tests for the GitHub REST API client.
 *
 * @module integrations/github/client.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubClient } from "./client";
import type { GitHubPullRequest, GitHubCommit } from "./types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function createMockDb() {
  return {
    gitHubLink: {
      create: vi.fn().mockResolvedValue({ id: "gl-1" }),
    },
  } as unknown as import("@prisma/client").PrismaClient;
}

const samplePR: GitHubPullRequest = {
  id: 1,
  number: 42,
  state: "open",
  merged: false,
  title: "Fix ORD-123 bug",
  body: "Resolves ORD-123",
  html_url: "https://github.com/ordolix/ordolix/pull/42",
  head: { ref: "fix/ORD-123", sha: "abc123" },
  base: { ref: "main", sha: "def456" },
  user: { id: 1, login: "dev", avatar_url: "", html_url: "" },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  merged_at: null,
};

const sampleCommit: GitHubCommit = {
  sha: "abc123def456",
  html_url: "https://github.com/ordolix/ordolix/commit/abc123def456",
  commit: {
    message: "Fix ORD-123: resolve null pointer",
    author: { name: "Dev", email: "dev@test.com", date: "2026-01-01T00:00:00Z" },
  },
  author: { id: 1, login: "dev", avatar_url: "", html_url: "" },
};

describe("GitHubClient", () => {
  let client: GitHubClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new GitHubClient("ghp_test-token");
  });

  describe("getPR", () => {
    it("should fetch a pull request by number", async () => {
      mockFetch.mockResolvedValue(jsonResponse(samplePR));

      const pr = await client.getPR("ordolix", "ordolix", 42);

      expect(pr.number).toBe(42);
      expect(pr.title).toBe("Fix ORD-123 bug");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/ordolix/ordolix/pulls/42",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer ghp_test-token",
          }),
        }),
      );
    });

    it("should throw IntegrationError on 404", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message: "Not Found" }, 404));

      await expect(client.getPR("ordolix", "ordolix", 999)).rejects.toThrow(
        "GitHub: API request failed: 404",
      );
    });
  });

  describe("getCommit", () => {
    it("should fetch a commit by SHA", async () => {
      mockFetch.mockResolvedValue(jsonResponse(sampleCommit));

      const commit = await client.getCommit("ordolix", "ordolix", "abc123def456");

      expect(commit.sha).toBe("abc123def456");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/ordolix/ordolix/commits/abc123def456",
        expect.any(Object),
      );
    });
  });

  describe("createIssueComment", () => {
    it("should POST a comment to the issues API", async () => {
      const comment = {
        id: 101,
        body: "Linked to ORD-123",
        html_url: "https://github.com/ordolix/ordolix/issues/42#comment-101",
        user: { id: 1, login: "bot", avatar_url: "", html_url: "" },
        created_at: "2026-01-01T00:00:00Z",
      };
      mockFetch.mockResolvedValue(jsonResponse(comment));

      const result = await client.createIssueComment("ordolix", "ordolix", 42, "Linked to ORD-123");

      expect(result.id).toBe(101);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/ordolix/ordolix/issues/42/comments",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ body: "Linked to ORD-123" }),
        }),
      );
    });
  });

  describe("custom base URL", () => {
    it("should use a custom base URL for GitHub Enterprise", async () => {
      const ghes = new GitHubClient("ghp_token", "https://github.example.com/api/v3");
      mockFetch.mockResolvedValue(jsonResponse(samplePR));

      await ghes.getPR("corp", "app", 1);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://github.example.com/api/v3/repos/corp/app/pulls/1",
        expect.any(Object),
      );
    });

    it("should strip trailing slash from base URL", async () => {
      const ghes = new GitHubClient("ghp_token", "https://gh.example.com/api/v3/");
      mockFetch.mockResolvedValue(jsonResponse(sampleCommit));

      await ghes.getCommit("o", "r", "sha");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://gh.example.com/api/v3/repos/o/r/commits/sha",
        expect.any(Object),
      );
    });
  });

  describe("linkPR", () => {
    it("should create a GitHubLink record for a pull request", async () => {
      const db = createMockDb();

      await client.linkPR(db, "issue-1", "ordolix", "ordolix", samplePR);

      expect(db.gitHubLink.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          issueId: "issue-1",
          resourceType: "pull_request",
          owner: "ordolix",
          repo: "ordolix",
          number: 42,
          sha: "abc123",
          branch: "fix/ORD-123",
          state: "open",
          url: samplePR.html_url,
        }),
      });
    });

    it("should set state to 'merged' for merged PRs", async () => {
      const db = createMockDb();
      const mergedPR = { ...samplePR, state: "closed" as const, merged: true };

      await client.linkPR(db, "issue-1", "ordolix", "ordolix", mergedPR);

      expect(db.gitHubLink.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ state: "merged" }),
      });
    });
  });

  describe("linkBranch", () => {
    it("should create a GitHubLink record for a branch", async () => {
      const db = createMockDb();

      await client.linkBranch(db, "issue-1", "ordolix", "ordolix", "feature/ORD-123");

      expect(db.gitHubLink.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          issueId: "issue-1",
          resourceType: "branch",
          branch: "feature/ORD-123",
          url: "https://github.com/ordolix/ordolix/tree/feature/ORD-123",
        }),
      });
    });
  });

  describe("linkCommit", () => {
    it("should create a GitHubLink record for a commit", async () => {
      const db = createMockDb();

      await client.linkCommit(db, "issue-1", "ordolix", "ordolix", sampleCommit);

      expect(db.gitHubLink.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          issueId: "issue-1",
          resourceType: "commit",
          sha: "abc123def456",
          url: sampleCommit.html_url,
        }),
      });
    });
  });
});
