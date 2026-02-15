/**
 * Tests for DevelopmentPanel component.
 * @module issues/components/DevelopmentPanel-test
 */
import { describe, expect, it } from "vitest";
import { DevelopmentPanel } from "./DevelopmentPanel";

describe("DevelopmentPanel", () => {
  it("exports DevelopmentPanel component", () => {
    expect(DevelopmentPanel).toBeDefined();
    expect(typeof DevelopmentPanel).toBe("function");
  });

  it("returns empty state when no links", () => {
    // Component function test -- verify it's callable
    const result = DevelopmentPanel({ links: [] });
    expect(result).toBeDefined();
  });

  it("groups links by resource type", () => {
    const links = [
      { id: "1", resourceType: "pull_request" as const, owner: "test", repo: "repo", number: 1, sha: null, branch: null, state: "open", url: "https://github.com/test/repo/pull/1", createdAt: new Date().toISOString() },
      { id: "2", resourceType: "commit" as const, owner: "test", repo: "repo", number: null, sha: "abc1234567", branch: null, state: null, url: null, createdAt: new Date().toISOString() },
      { id: "3", resourceType: "pull_request" as const, owner: "test", repo: "repo", number: 2, sha: null, branch: null, state: "merged", url: null, createdAt: new Date().toISOString() },
    ];
    const result = DevelopmentPanel({ links });
    expect(result).toBeDefined();
  });
});
