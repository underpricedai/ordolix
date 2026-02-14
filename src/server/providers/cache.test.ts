/**
 * Tests for the Upstash Redis CacheProvider implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { IntegrationError } from "@/server/lib/errors";

// Mock the redis module before importing the cache provider.
// Use vi.hoisted to define mocks that are accessible inside vi.mock factory.
const { mockRedis } = vi.hoisted(() => {
  const mockPipelineDel = vi.fn();
  const mockPipelineExec = vi.fn();

  return {
    mockRedis: {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      scan: vi.fn(),
      pipeline: () => ({
        del: mockPipelineDel,
        exec: mockPipelineExec,
      }),
      _pipelineDel: mockPipelineDel,
      _pipelineExec: mockPipelineExec,
    },
  };
});

vi.mock("@/server/lib/redis", () => ({
  redis: mockRedis,
}));

import { createCacheProvider, createMemoryCacheProvider } from "./cache";

describe("CacheProvider (Upstash Redis)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createCacheProvider", () => {
    it("returns an object implementing the CacheProvider interface", () => {
      const cache = createCacheProvider();
      expect(cache).toHaveProperty("get");
      expect(cache).toHaveProperty("set");
      expect(cache).toHaveProperty("del");
      expect(cache).toHaveProperty("invalidatePattern");
    });
  });

  describe("get", () => {
    it("returns cached value from Redis", async () => {
      mockRedis.get.mockResolvedValueOnce({ name: "Alice", role: "admin" });

      const cache = createCacheProvider();
      const result = await cache.get<{ name: string; role: string }>(
        "user:123",
      );

      expect(result).toEqual({ name: "Alice", role: "admin" });
      expect(mockRedis.get).toHaveBeenCalledWith("cache:user:123");
    });

    it("returns null when key does not exist", async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const cache = createCacheProvider();
      const result = await cache.get("missing-key");

      expect(result).toBeNull();
    });

    it("returns null when Redis returns undefined", async () => {
      mockRedis.get.mockResolvedValueOnce(undefined);

      const cache = createCacheProvider();
      const result = await cache.get("undefined-key");

      expect(result).toBeNull();
    });

    it("throws IntegrationError when Redis fails", async () => {
      mockRedis.get.mockRejectedValueOnce(new Error("Connection refused"));

      const cache = createCacheProvider();

      await expect(cache.get("key")).rejects.toThrow(IntegrationError);
    });

    it("includes key in error details", async () => {
      mockRedis.get.mockRejectedValueOnce(new Error("Connection refused"));

      const cache = createCacheProvider();

      try {
        await cache.get("my-key");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(IntegrationError);
        expect((error as IntegrationError).message).toContain(
          "Connection refused",
        );
      }
    });

    it("prefixes all keys with cache: namespace", async () => {
      mockRedis.get.mockResolvedValueOnce("value");

      const cache = createCacheProvider();
      await cache.get("my-key");

      expect(mockRedis.get).toHaveBeenCalledWith("cache:my-key");
    });
  });

  describe("set", () => {
    it("stores a value in Redis without TTL", async () => {
      mockRedis.set.mockResolvedValueOnce("OK");

      const cache = createCacheProvider();
      await cache.set("user:123", { name: "Alice" });

      expect(mockRedis.set).toHaveBeenCalledWith("cache:user:123", {
        name: "Alice",
      });
    });

    it("stores a value in Redis with TTL", async () => {
      mockRedis.set.mockResolvedValueOnce("OK");

      const cache = createCacheProvider();
      await cache.set("session:abc", { token: "xyz" }, 300);

      expect(mockRedis.set).toHaveBeenCalledWith(
        "cache:session:abc",
        { token: "xyz" },
        { ex: 300 },
      );
    });

    it("stores primitive values", async () => {
      mockRedis.set.mockResolvedValueOnce("OK");

      const cache = createCacheProvider();
      await cache.set("counter", 42);

      expect(mockRedis.set).toHaveBeenCalledWith("cache:counter", 42);
    });

    it("throws IntegrationError when Redis fails", async () => {
      mockRedis.set.mockRejectedValueOnce(new Error("Write error"));

      const cache = createCacheProvider();

      await expect(cache.set("key", "value")).rejects.toThrow(
        IntegrationError,
      );
    });
  });

  describe("del", () => {
    it("deletes a key from Redis", async () => {
      mockRedis.del.mockResolvedValueOnce(1);

      const cache = createCacheProvider();
      await cache.del("user:123");

      expect(mockRedis.del).toHaveBeenCalledWith("cache:user:123");
    });

    it("does not throw when deleting a non-existent key", async () => {
      mockRedis.del.mockResolvedValueOnce(0);

      const cache = createCacheProvider();
      await expect(cache.del("missing")).resolves.toBeUndefined();
    });

    it("throws IntegrationError when Redis fails", async () => {
      mockRedis.del.mockRejectedValueOnce(new Error("Delete error"));

      const cache = createCacheProvider();

      await expect(cache.del("key")).rejects.toThrow(IntegrationError);
    });
  });

  describe("invalidatePattern", () => {
    it("scans and deletes all matching keys", async () => {
      mockRedis.scan.mockResolvedValueOnce([
        "0",
        ["cache:project:1:issues", "cache:project:1:boards"],
      ]);
      mockRedis._pipelineExec.mockResolvedValueOnce([1, 1]);

      const cache = createCacheProvider();
      await cache.invalidatePattern("project:1:*");

      expect(mockRedis.scan).toHaveBeenCalledWith("0", {
        match: "cache:project:1:*",
        count: 100,
      });
      expect(mockRedis._pipelineDel).toHaveBeenCalledTimes(2);
      expect(mockRedis._pipelineExec).toHaveBeenCalledOnce();
    });

    it("handles pagination when there are many keys", async () => {
      // First scan returns cursor "42" (more pages)
      mockRedis.scan.mockResolvedValueOnce(["42", ["cache:key:1"]]);
      mockRedis._pipelineExec.mockResolvedValueOnce([1]);
      // Second scan returns cursor "0" (done)
      mockRedis.scan.mockResolvedValueOnce(["0", ["cache:key:2"]]);
      mockRedis._pipelineExec.mockResolvedValueOnce([1]);

      const cache = createCacheProvider();
      await cache.invalidatePattern("key:*");

      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
      expect(mockRedis.scan).toHaveBeenNthCalledWith(1, "0", {
        match: "cache:key:*",
        count: 100,
      });
      expect(mockRedis.scan).toHaveBeenNthCalledWith(2, "42", {
        match: "cache:key:*",
        count: 100,
      });
    });

    it("skips pipeline execution when no keys match", async () => {
      mockRedis.scan.mockResolvedValueOnce(["0", []]);

      const cache = createCacheProvider();
      await cache.invalidatePattern("nonexistent:*");

      expect(mockRedis._pipelineDel).not.toHaveBeenCalled();
      expect(mockRedis._pipelineExec).not.toHaveBeenCalled();
    });

    it("throws IntegrationError when Redis fails", async () => {
      mockRedis.scan.mockRejectedValueOnce(new Error("Scan error"));

      const cache = createCacheProvider();

      await expect(cache.invalidatePattern("*")).rejects.toThrow(
        IntegrationError,
      );
    });
  });
});

describe("CacheProvider (in-memory fallback)", () => {
  it("sets and gets values", async () => {
    const cache = createMemoryCacheProvider();

    await cache.set("key1", { data: "test" });
    const result = await cache.get<{ data: string }>("key1");
    expect(result).toEqual({ data: "test" });
  });

  it("returns null for missing keys", async () => {
    const cache = createMemoryCacheProvider();

    const missing = await cache.get("nonexistent");
    expect(missing).toBeNull();
  });

  it("deletes keys", async () => {
    const cache = createMemoryCacheProvider();

    await cache.set("to-delete", "value");
    await cache.del("to-delete");
    expect(await cache.get("to-delete")).toBeNull();
  });

  it("invalidates keys matching a glob pattern", async () => {
    const cache = createMemoryCacheProvider();

    await cache.set("project:1:a", "val-a");
    await cache.set("project:1:b", "val-b");
    await cache.set("project:2:a", "val-c");
    await cache.invalidatePattern("project:1:*");
    expect(await cache.get("project:1:a")).toBeNull();
    expect(await cache.get("project:1:b")).toBeNull();
    expect(await cache.get("project:2:a")).toBe("val-c");
  });

  it("expires keys after TTL", async () => {
    vi.useFakeTimers();
    const cache = createMemoryCacheProvider();

    await cache.set("ttl-key", "ttl-value", 10);
    expect(await cache.get("ttl-key")).toBe("ttl-value");

    vi.advanceTimersByTime(11_000);
    expect(await cache.get("ttl-key")).toBeNull();

    vi.useRealTimers();
  });

  it("stores values without TTL indefinitely", async () => {
    vi.useFakeTimers();
    const cache = createMemoryCacheProvider();

    await cache.set("permanent", "forever");
    vi.advanceTimersByTime(999_999_999);
    expect(await cache.get("permanent")).toBe("forever");

    vi.useRealTimers();
  });

  it("stores primitive values", async () => {
    const cache = createMemoryCacheProvider();

    await cache.set("num", 42);
    expect(await cache.get("num")).toBe(42);

    await cache.set("bool", true);
    expect(await cache.get("bool")).toBe(true);

    await cache.set("str", "hello");
    expect(await cache.get("str")).toBe("hello");
  });
});
