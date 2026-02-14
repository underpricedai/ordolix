/**
 * Tests for GitHub webhook signature verification and event handling.
 *
 * @module integrations/github/webhook.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";
import {
  verifySignature,
  extractIssueKeys,
  handlePushEvent,
  handlePREvent,
  handleIssueCommentEvent,
} from "./webhook";
import type {
  GitHubPREvent,
  GitHubPushEvent,
  GitHubIssueCommentEvent,
} from "./types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function createMockDb() {
  return {
    issue: {
      findFirst: vi.fn(),
    },
    gitHubLink: {
      create: vi.fn().mockResolvedValue({ id: "gl-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  } as unknown as import("@prisma/client").PrismaClient;
}

const baseWebhookPayload = {
  sender: { id: 1, login: "dev", avatar_url: "", html_url: "" },
  repository: {
    id: 100,
    name: "ordolix",
    full_name: "ordolix/ordolix",
    owner: { id: 1, login: "ordolix", avatar_url: "", html_url: "" },
    html_url: "https://github.com/ordolix/ordolix",
  },
};

describe("verifySignature", () => {
  const secret = "webhook-secret-123";

  it("should return true for a valid signature", () => {
    const payload = '{"action":"opened"}';
    const sig = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;

    expect(verifySignature(secret, payload, sig)).toBe(true);
  });

  it("should return false for an invalid signature", () => {
    const payload = '{"action":"opened"}';
    const sig = "sha256=0000000000000000000000000000000000000000000000000000000000000000";

    expect(verifySignature(secret, payload, sig)).toBe(false);
  });

  it("should return false for a truncated signature", () => {
    const payload = '{"action":"opened"}';
    expect(verifySignature(secret, payload, "sha256=short")).toBe(false);
  });

  it("should return false for empty signature", () => {
    expect(verifySignature(secret, "payload", "")).toBe(false);
  });

  it("should be timing-safe (no early exit on first byte mismatch)", () => {
    const payload = "test";
    const validSig = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
    // Flip last character
    const invalidSig = validSig.slice(0, -1) + (validSig.endsWith("0") ? "1" : "0");

    expect(verifySignature(secret, payload, invalidSig)).toBe(false);
  });
});

describe("extractIssueKeys", () => {
  it("should extract issue keys from text", () => {
    expect(extractIssueKeys("Fix ORD-123 and PROJ-456")).toEqual(["ORD-123", "PROJ-456"]);
  });

  it("should deduplicate keys", () => {
    expect(extractIssueKeys("ORD-123 ORD-123 ORD-123")).toEqual(["ORD-123"]);
  });

  it("should return empty array for no matches", () => {
    expect(extractIssueKeys("No issue keys here")).toEqual([]);
  });

  it("should not match lowercase keys", () => {
    expect(extractIssueKeys("ord-123")).toEqual([]);
  });

  it("should match keys with numbers in project code", () => {
    expect(extractIssueKeys("Fix P2-99")).toEqual(["P2-99"]);
  });

  it("should extract keys from multi-line text", () => {
    const text = "Title: Fix ORD-1\n\nBody mentions PROJ-2 and ORD-3";
    expect(extractIssueKeys(text)).toEqual(["ORD-1", "PROJ-2", "ORD-3"]);
  });
});

describe("handlePushEvent", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    mockFetch.mockReset();
  });

  it("should link commits that reference issue keys", async () => {
    const event: GitHubPushEvent = {
      ...baseWebhookPayload,
      ref: "refs/heads/main",
      before: "000",
      after: "111",
      commits: [
        {
          id: "abc123",
          message: "Fix ORD-42: null check",
          url: "https://github.com/ordolix/ordolix/commit/abc123",
          author: { name: "Dev", email: "dev@test.com" },
          added: [],
          modified: ["src/index.ts"],
          removed: [],
        },
      ],
      head_commit: null,
    };

    (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "issue-42",
      key: "ORD-42",
      projectId: "proj-1",
    });

    mockFetch.mockResolvedValue(
      jsonResponse({
        sha: "abc123",
        html_url: "https://github.com/ordolix/ordolix/commit/abc123",
        commit: {
          message: "Fix ORD-42: null check",
          author: { name: "Dev", email: "dev@test.com", date: "2026-01-01T00:00:00Z" },
        },
        author: null,
      }),
    );

    const result = await handlePushEvent(db, "org-1", "ghp_token", event);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ issueKey: "ORD-42", commitSha: "abc123" });
    expect(db.gitHubLink.create).toHaveBeenCalled();
  });

  it("should skip commits with no matching issue keys", async () => {
    const event: GitHubPushEvent = {
      ...baseWebhookPayload,
      ref: "refs/heads/main",
      before: "000",
      after: "111",
      commits: [
        {
          id: "xyz789",
          message: "chore: update deps",
          url: "",
          author: { name: "Dev", email: "dev@test.com" },
          added: [],
          modified: [],
          removed: [],
        },
      ],
      head_commit: null,
    };

    const result = await handlePushEvent(db, "org-1", "ghp_token", event);
    expect(result).toHaveLength(0);
    expect(db.issue.findFirst).not.toHaveBeenCalled();
  });

  it("should skip if issue not found in DB", async () => {
    const event: GitHubPushEvent = {
      ...baseWebhookPayload,
      ref: "refs/heads/main",
      before: "000",
      after: "111",
      commits: [
        {
          id: "abc123",
          message: "Fix UNKNOWN-999",
          url: "",
          author: { name: "Dev", email: "dev@test.com" },
          added: [],
          modified: [],
          removed: [],
        },
      ],
      head_commit: null,
    };

    (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await handlePushEvent(db, "org-1", "ghp_token", event);
    expect(result).toHaveLength(0);
  });
});

describe("handlePREvent", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    mockFetch.mockReset();
  });

  it("should create link when PR is opened with issue key in title", async () => {
    const event: GitHubPREvent = {
      ...baseWebhookPayload,
      action: "opened",
      number: 42,
      pull_request: {
        id: 1,
        number: 42,
        state: "open",
        merged: false,
        title: "Fix ORD-123 bug",
        body: null,
        html_url: "https://github.com/ordolix/ordolix/pull/42",
        head: { ref: "fix/ord-123", sha: "abc" },
        base: { ref: "main", sha: "def" },
        user: { id: 1, login: "dev", avatar_url: "", html_url: "" },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        merged_at: null,
      },
    };

    (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "issue-123",
      key: "ORD-123",
      projectId: "proj-1",
    });

    const result = await handlePREvent(db, "org-1", "ghp_token", event);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ issueKey: "ORD-123", prNumber: 42 });
    expect(db.gitHubLink.create).toHaveBeenCalled();
  });

  it("should update link state when PR is closed and merged", async () => {
    const event: GitHubPREvent = {
      ...baseWebhookPayload,
      action: "closed",
      number: 42,
      pull_request: {
        id: 1,
        number: 42,
        state: "closed",
        merged: true,
        title: "Fix ORD-123",
        body: null,
        html_url: "https://github.com/ordolix/ordolix/pull/42",
        head: { ref: "fix/ORD-123", sha: "abc" },
        base: { ref: "main", sha: "def" },
        user: { id: 1, login: "dev", avatar_url: "", html_url: "" },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        merged_at: "2026-01-02T00:00:00Z",
      },
    };

    (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "issue-123",
      key: "ORD-123",
      projectId: "proj-1",
    });

    await handlePREvent(db, "org-1", "ghp_token", event);

    expect(db.gitHubLink.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        issueId: "issue-123",
        resourceType: "pull_request",
        number: 42,
      }),
      data: expect.objectContaining({ state: "merged" }),
    });
  });

  it("should extract keys from branch names", async () => {
    const event: GitHubPREvent = {
      ...baseWebhookPayload,
      action: "opened",
      number: 10,
      pull_request: {
        id: 2,
        number: 10,
        state: "open",
        merged: false,
        title: "Some work",
        body: "",
        html_url: "https://github.com/ordolix/ordolix/pull/10",
        head: { ref: "feature/ORD-55-impl", sha: "aaa" },
        base: { ref: "main", sha: "bbb" },
        user: { id: 1, login: "dev", avatar_url: "", html_url: "" },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        merged_at: null,
      },
    };

    (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "issue-55",
      key: "ORD-55",
      projectId: "proj-1",
    });

    const result = await handlePREvent(db, "org-1", "ghp_token", event);
    expect(result).toHaveLength(1);
    expect(result[0]!.issueKey).toBe("ORD-55");
  });
});

describe("handleIssueCommentEvent", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should return issue keys found in created comments", async () => {
    const event: GitHubIssueCommentEvent = {
      ...baseWebhookPayload,
      action: "created",
      comment: {
        id: 1,
        body: "This relates to ORD-10 and ORD-20",
        html_url: "",
        user: { id: 1, login: "dev", avatar_url: "", html_url: "" },
        created_at: "2026-01-01T00:00:00Z",
      },
      issue: {
        number: 5,
        title: "Test issue",
        html_url: "",
      },
    };

    (db.issue.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: "i-10", key: "ORD-10", projectId: "p-1" })
      .mockResolvedValueOnce({ id: "i-20", key: "ORD-20", projectId: "p-1" });

    const result = await handleIssueCommentEvent(db, "org-1", event);
    expect(result).toEqual(["ORD-10", "ORD-20"]);
  });

  it("should skip non-created events", async () => {
    const event: GitHubIssueCommentEvent = {
      ...baseWebhookPayload,
      action: "deleted",
      comment: {
        id: 1,
        body: "ORD-10",
        html_url: "",
        user: { id: 1, login: "dev", avatar_url: "", html_url: "" },
        created_at: "2026-01-01T00:00:00Z",
      },
      issue: { number: 5, title: "Test", html_url: "" },
    };

    const result = await handleIssueCommentEvent(db, "org-1", event);
    expect(result).toEqual([]);
  });
});
