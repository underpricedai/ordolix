/**
 * Unit tests for AI service (Perplexity integration).
 *
 * @module integrations/ai/ai-service-test
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  isAIAvailable,
  summarizeIssue,
  suggestLabels,
  generateDescription,
  suggestRelatedIssues,
} from "./ai-service";

/** Helper to create a successful Perplexity API response mock. */
function mockPerplexityResponse(content: string) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        choices: [{ message: { content } }],
        model: "sonar",
        usage: { prompt_tokens: 50, completion_tokens: 20 },
      }),
  });
}

/** Helper to create a failed Perplexity API response mock. */
function mockPerplexityError(status: number) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
  });
}

describe("isAIAvailable", () => {
  const originalEnv = process.env.PERPLEXITY_API_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.PERPLEXITY_API_KEY = originalEnv;
    } else {
      delete process.env.PERPLEXITY_API_KEY;
    }
  });

  it("returns false when PERPLEXITY_API_KEY is not set", () => {
    delete process.env.PERPLEXITY_API_KEY;
    expect(isAIAvailable()).toBe(false);
  });

  it("returns false when PERPLEXITY_API_KEY is empty string", () => {
    process.env.PERPLEXITY_API_KEY = "";
    expect(isAIAvailable()).toBe(false);
  });

  it("returns true when PERPLEXITY_API_KEY is set", () => {
    process.env.PERPLEXITY_API_KEY = "pplx-test-key-123";
    expect(isAIAvailable()).toBe(true);
  });
});

describe("summarizeIssue", () => {
  const originalEnv = process.env.PERPLEXITY_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PERPLEXITY_API_KEY = "pplx-test-key";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.PERPLEXITY_API_KEY = originalEnv;
    } else {
      delete process.env.PERPLEXITY_API_KEY;
    }
  });

  it("throws when API key is not configured", async () => {
    delete process.env.PERPLEXITY_API_KEY;

    await expect(
      summarizeIssue({
        summary: "Test issue",
        description: null,
        comments: [],
      }),
    ).rejects.toThrow("PERPLEXITY_API_KEY not configured");
  });

  it("calls fetch with correct parameters", async () => {
    mockPerplexityResponse("This issue is about a login bug.");

    await summarizeIssue({
      summary: "Login page broken",
      description: "The login page returns 500 after deploy",
      comments: [{ body: "I can reproduce", author: "Alice" }],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.perplexity.ai/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer pplx-test-key",
          "Content-Type": "application/json",
        }),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body);
    expect(body.model).toBe("sonar");
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].role).toBe("user");
    expect(body.messages[1].content).toContain("Login page broken");
    expect(body.messages[1].content).toContain("returns 500 after deploy");
    expect(body.messages[1].content).toContain("Alice: I can reproduce");
  });

  it("returns the AI-generated summary", async () => {
    mockPerplexityResponse(
      "The login page is crashing with a 500 error after the latest deployment. Alice confirmed the issue is reproducible.",
    );

    const result = await summarizeIssue({
      summary: "Login page broken",
      description: "The login page returns 500",
      comments: [{ body: "I can reproduce", author: "Alice" }],
    });

    expect(result).toBe(
      "The login page is crashing with a 500 error after the latest deployment. Alice confirmed the issue is reproducible.",
    );
  });

  it("handles issues with no description or comments", async () => {
    mockPerplexityResponse("A brief summary.");

    const result = await summarizeIssue({
      summary: "Quick fix needed",
      description: null,
      comments: [],
    });

    expect(result).toBe("A brief summary.");

    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body);
    expect(body.messages[1].content).toBe("Issue: Quick fix needed");
  });

  it("throws on API error", async () => {
    mockPerplexityError(429);

    await expect(
      summarizeIssue({
        summary: "Test",
        description: null,
        comments: [],
      }),
    ).rejects.toThrow("Perplexity API error: 429");
  });
});

describe("suggestLabels", () => {
  const originalEnv = process.env.PERPLEXITY_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PERPLEXITY_API_KEY = "pplx-test-key";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.PERPLEXITY_API_KEY = originalEnv;
    } else {
      delete process.env.PERPLEXITY_API_KEY;
    }
  });

  it("returns array of suggested labels", async () => {
    mockPerplexityResponse('["bug", "performance"]');

    const result = await suggestLabels({
      summary: "Memory leak in worker pool",
      description: "Workers don't release connections",
      existingLabels: ["backend"],
      availableLabels: ["bug", "performance", "backend", "frontend", "security"],
    });

    expect(result).toEqual(["bug", "performance"]);
  });

  it("returns empty array on invalid JSON response", async () => {
    mockPerplexityResponse("I suggest using bug and performance labels");

    const result = await suggestLabels({
      summary: "Test",
      description: null,
      existingLabels: [],
      availableLabels: ["bug"],
    });

    expect(result).toEqual([]);
  });

  it("filters out non-string values from response", async () => {
    mockPerplexityResponse('["bug", 42, null, "performance"]');

    const result = await suggestLabels({
      summary: "Test",
      description: null,
      existingLabels: [],
      availableLabels: ["bug", "performance"],
    });

    expect(result).toEqual(["bug", "performance"]);
  });

  it("includes current and available labels in the prompt", async () => {
    mockPerplexityResponse("[]");

    await suggestLabels({
      summary: "Test",
      description: null,
      existingLabels: ["existing-label"],
      availableLabels: ["bug", "feature"],
    });

    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body);
    expect(body.messages[1].content).toContain("existing-label");
    expect(body.messages[1].content).toContain("bug, feature");
  });
});

describe("generateDescription", () => {
  const originalEnv = process.env.PERPLEXITY_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PERPLEXITY_API_KEY = "pplx-test-key";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.PERPLEXITY_API_KEY = originalEnv;
    } else {
      delete process.env.PERPLEXITY_API_KEY;
    }
  });

  it("returns a description string", async () => {
    const template = "## Steps to Reproduce\n1. Go to login page\n2. Click submit";
    mockPerplexityResponse(template);

    const result = await generateDescription("Login page crashes", "Bug");

    expect(result).toBe(template);
  });

  it("sends issue type and summary in the prompt", async () => {
    mockPerplexityResponse("## Acceptance Criteria\n- Feature works");

    await generateDescription("Add dark mode support", "Story");

    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body);
    expect(body.messages[1].content).toContain("Story");
    expect(body.messages[1].content).toContain("Add dark mode support");
  });

  it("uses appropriate temperature for creative output", async () => {
    mockPerplexityResponse("Description");

    await generateDescription("Test", "Task");

    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body);
    expect(body.temperature).toBe(0.3);
  });
});

describe("suggestRelatedIssues", () => {
  const originalEnv = process.env.PERPLEXITY_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PERPLEXITY_API_KEY = "pplx-test-key";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.PERPLEXITY_API_KEY = originalEnv;
    } else {
      delete process.env.PERPLEXITY_API_KEY;
    }
  });

  it("returns empty array when no candidate issues provided", async () => {
    const result = await suggestRelatedIssues("Login bug", []);

    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns related issues with reasons", async () => {
    mockPerplexityResponse(
      '[{"key": "PROJ-101", "reason": "Both involve authentication failures"}]',
    );

    const result = await suggestRelatedIssues("Login page returns 500", [
      { key: "PROJ-101", summary: "Auth service timeout" },
      { key: "PROJ-102", summary: "Update footer links" },
    ]);

    expect(result).toEqual([
      { key: "PROJ-101", reason: "Both involve authentication failures" },
    ]);
  });

  it("returns empty array on invalid JSON response", async () => {
    mockPerplexityResponse("These issues might be related: PROJ-101");

    const result = await suggestRelatedIssues("Test", [
      { key: "PROJ-101", summary: "Related issue" },
    ]);

    expect(result).toEqual([]);
  });

  it("filters out malformed items from the response", async () => {
    mockPerplexityResponse(
      '[{"key": "PROJ-1", "reason": "Related"}, {"key": 123}, {"wrong": "shape"}]',
    );

    const result = await suggestRelatedIssues("Test", [
      { key: "PROJ-1", summary: "Issue 1" },
    ]);

    expect(result).toEqual([{ key: "PROJ-1", reason: "Related" }]);
  });

  it("includes all candidate issues in the prompt", async () => {
    mockPerplexityResponse("[]");

    await suggestRelatedIssues("Current issue", [
      { key: "A-1", summary: "First" },
      { key: "A-2", summary: "Second" },
    ]);

    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body);
    expect(body.messages[1].content).toContain("A-1: First");
    expect(body.messages[1].content).toContain("A-2: Second");
  });
});

describe("error handling", () => {
  const originalEnv = process.env.PERPLEXITY_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PERPLEXITY_API_KEY = "pplx-test-key";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.PERPLEXITY_API_KEY = originalEnv;
    } else {
      delete process.env.PERPLEXITY_API_KEY;
    }
  });

  it("throws meaningful error on 401 Unauthorized", async () => {
    mockPerplexityError(401);

    await expect(
      summarizeIssue({ summary: "Test", description: null, comments: [] }),
    ).rejects.toThrow("Perplexity API error: 401");
  });

  it("throws meaningful error on 500 Server Error", async () => {
    mockPerplexityError(500);

    await expect(
      generateDescription("Test", "Bug"),
    ).rejects.toThrow("Perplexity API error: 500");
  });

  it("throws meaningful error on 429 Rate Limit", async () => {
    mockPerplexityError(429);

    await expect(
      suggestLabels({
        summary: "Test",
        description: null,
        existingLabels: [],
        availableLabels: ["bug"],
      }),
    ).rejects.toThrow("Perplexity API error: 429");
  });
});
