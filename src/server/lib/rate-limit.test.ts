import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mock Redis module ───────────────────────────────────────────────────────
// vi.mock hoists to the top — use vi.hoisted() to create mock fns that
// are available at hoist time.

const { mockBrowserLimit, mockApiLimit, nullMode } = vi.hoisted(() => ({
  mockBrowserLimit: vi.fn(),
  mockApiLimit: vi.fn(),
  nullMode: { value: false },
}));

vi.mock("./redis", () => ({
  get browserRateLimiter() {
    return nullMode.value ? null : { limit: mockBrowserLimit };
  },
  get apiRateLimiter() {
    return nullMode.value ? null : { limit: mockApiLimit };
  },
}));

vi.mock("./logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { checkRateLimit, resetInMemoryStore } from "./rate-limit";

// ── checkRateLimit with Redis ───────────────────────────────────────────────

describe("checkRateLimit (Redis-backed)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nullMode.value = false;
  });

  describe("browser rate limit", () => {
    it("allows requests within the limit", async () => {
      mockBrowserLimit.mockResolvedValue({
        success: true,
        limit: 300,
        remaining: 299,
        reset: Date.now() + 60_000,
      });

      const result = await checkRateLimit("192.168.1.1", "browser");

      expect(result.success).toBe(true);
      expect(result.limit).toBe(300);
      expect(result.remaining).toBe(299);
      expect(mockBrowserLimit).toHaveBeenCalledWith("192.168.1.1");
    });

    it("rejects requests over the limit", async () => {
      mockBrowserLimit.mockResolvedValue({
        success: false,
        limit: 300,
        remaining: 0,
        reset: Date.now() + 30_000,
      });

      const result = await checkRateLimit("192.168.1.1", "browser");

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("returns reset timestamp", async () => {
      const resetTime = Date.now() + 45_000;
      mockBrowserLimit.mockResolvedValue({
        success: true,
        limit: 300,
        remaining: 150,
        reset: resetTime,
      });

      const result = await checkRateLimit("192.168.1.1", "browser");

      expect(result.reset).toBe(resetTime);
    });
  });

  describe("API token rate limit", () => {
    it("allows requests within the limit", async () => {
      mockApiLimit.mockResolvedValue({
        success: true,
        limit: 600,
        remaining: 599,
        reset: Date.now() + 60_000,
      });

      const result = await checkRateLimit("api-token-hash-abc", "api");

      expect(result.success).toBe(true);
      expect(result.limit).toBe(600);
      expect(result.remaining).toBe(599);
      expect(mockApiLimit).toHaveBeenCalledWith("api-token-hash-abc");
    });

    it("rejects requests over the limit", async () => {
      mockApiLimit.mockResolvedValue({
        success: false,
        limit: 600,
        remaining: 0,
        reset: Date.now() + 20_000,
      });

      const result = await checkRateLimit("api-token-hash-abc", "api");

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  it("uses browser limiter for browser type", async () => {
    mockBrowserLimit.mockResolvedValue({
      success: true,
      limit: 300,
      remaining: 200,
      reset: Date.now() + 60_000,
    });

    await checkRateLimit("test-id", "browser");

    expect(mockBrowserLimit).toHaveBeenCalledTimes(1);
    expect(mockApiLimit).not.toHaveBeenCalled();
  });

  it("uses API limiter for api type", async () => {
    mockApiLimit.mockResolvedValue({
      success: true,
      limit: 600,
      remaining: 500,
      reset: Date.now() + 60_000,
    });

    await checkRateLimit("test-id", "api");

    expect(mockApiLimit).toHaveBeenCalledTimes(1);
    expect(mockBrowserLimit).not.toHaveBeenCalled();
  });
});

// ── In-memory fallback (when Redis is null) ─────────────────────────────────

describe("in-memory rate limiter (when Redis is null)", () => {
  beforeEach(() => {
    nullMode.value = true;
    resetInMemoryStore();
  });

  it("allows browser requests within the 300/min limit", async () => {
    const result = await checkRateLimit("user-1", "browser");

    expect(result.success).toBe(true);
    expect(result.limit).toBe(300);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it("allows API requests within the 600/min limit", async () => {
    const result = await checkRateLimit("token-1", "api");

    expect(result.success).toBe(true);
    expect(result.limit).toBe(600);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it("tracks remaining count accurately", async () => {
    await checkRateLimit("user-track", "browser");
    await checkRateLimit("user-track", "browser");
    const result = await checkRateLimit("user-track", "browser");

    // After 3 requests: remaining = 300 - 3 = 297
    expect(result.remaining).toBe(297);
  });

  it("returns reset timestamp in the future", async () => {
    const before = Date.now();
    const result = await checkRateLimit("user-time", "browser");

    expect(result.reset).toBeGreaterThanOrEqual(before);
  });

  it("isolates different identifiers", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("user-a", "browser");
    }

    // user-b should still have full quota
    const result = await checkRateLimit("user-b", "browser");
    expect(result.remaining).toBe(299);
  });

  it("isolates browser and api types for the same identifier", async () => {
    for (let i = 0; i < 10; i++) {
      await checkRateLimit("shared-id", "browser");
    }

    // API quota should be independent
    const result = await checkRateLimit("shared-id", "api");
    expect(result.remaining).toBe(599);
  });

  it("resetInMemoryStore clears stored data", async () => {
    // Use some quota
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("user-reset", "browser");
    }

    // Reset
    resetInMemoryStore();

    // Should have full quota again
    const result = await checkRateLimit("user-reset", "browser");
    expect(result.remaining).toBe(299);
  });
});
