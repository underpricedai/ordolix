/**
 * Upstash Redis CacheProvider implementation.
 *
 * Uses the existing Redis client from src/server/lib/redis.ts.
 * Falls back to an in-memory Map when Redis is not configured (dev mode).
 *
 * @module cache
 */

import { IntegrationError } from "@/server/lib/errors";
import { redis } from "@/server/lib/redis";

import type { CacheProvider } from "./types";

/** Namespace prefix for all cache keys to avoid collisions with rate limiters. */
const CACHE_PREFIX = "cache:";

/**
 * In-memory cache entry with optional expiration.
 */
interface MemoryCacheEntry {
  value: string;
  expiresAt: number | null;
}

/**
 * Creates an in-memory CacheProvider for development when Redis is unavailable.
 *
 * @returns CacheProvider backed by a Map
 */
export function createMemoryCacheProvider(): CacheProvider {
  const store = new Map<string, MemoryCacheEntry>();

  return {
    async get<T>(key: string): Promise<T | null> {
      const prefixed = `${CACHE_PREFIX}${key}`;
      const entry = store.get(prefixed);

      if (!entry) return null;

      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        store.delete(prefixed);
        return null;
      }

      try {
        return JSON.parse(entry.value) as T;
      } catch {
        return null;
      }
    },

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
      const prefixed = `${CACHE_PREFIX}${key}`;
      store.set(prefixed, {
        value: JSON.stringify(value),
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
      });
    },

    async del(key: string): Promise<void> {
      const prefixed = `${CACHE_PREFIX}${key}`;
      store.delete(prefixed);
    },

    async invalidatePattern(pattern: string): Promise<void> {
      const prefixed = `${CACHE_PREFIX}${pattern}`;
      // Convert glob-style pattern to a prefix match for in-memory store
      const prefix = prefixed.replace(/\*.*$/, "");

      for (const storeKey of store.keys()) {
        if (storeKey.startsWith(prefix)) {
          store.delete(storeKey);
        }
      }
    },
  };
}

/**
 * Creates a CacheProvider backed by Upstash Redis.
 *
 * @returns CacheProvider implementation
 * @throws {IntegrationError} If Redis operations fail at runtime
 *
 * @example
 * ```ts
 * const cache = createCacheProvider();
 * await cache.set("user:123", { name: "Alice" }, 300);
 * const user = await cache.get<{ name: string }>("user:123");
 * ```
 */
export function createCacheProvider(): CacheProvider {
  if (!redis) {
    console.warn(
      "Redis not configured — using in-memory cache (not suitable for production)",
    );
    return createMemoryCacheProvider();
  }

  const client = redis;

  return {
    async get<T>(key: string): Promise<T | null> {
      const prefixed = `${CACHE_PREFIX}${key}`;
      try {
        const value = await client.get<T>(prefixed);
        return value ?? null;
      } catch (error) {
        throw new IntegrationError(
          "Upstash Redis",
          `Cache get failed for key "${key}": ${error instanceof Error ? error.message : String(error)}`,
          { key },
        );
      }
    },

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
      const prefixed = `${CACHE_PREFIX}${key}`;
      try {
        if (ttlSeconds) {
          await client.set(prefixed, value, { ex: ttlSeconds });
        } else {
          await client.set(prefixed, value);
        }
      } catch (error) {
        throw new IntegrationError(
          "Upstash Redis",
          `Cache set failed for key "${key}": ${error instanceof Error ? error.message : String(error)}`,
          { key },
        );
      }
    },

    async del(key: string): Promise<void> {
      const prefixed = `${CACHE_PREFIX}${key}`;
      try {
        await client.del(prefixed);
      } catch (error) {
        throw new IntegrationError(
          "Upstash Redis",
          `Cache delete failed for key "${key}": ${error instanceof Error ? error.message : String(error)}`,
          { key },
        );
      }
    },

    async invalidatePattern(pattern: string): Promise<void> {
      const prefixed = `${CACHE_PREFIX}${pattern}`;
      try {
        let cursor = "0";
        do {
          const result: [string, string[]] = await client.scan(cursor, {
            match: prefixed,
            count: 100,
          });
          cursor = result[0];
          const keys = result[1];

          if (keys.length > 0) {
            const pipeline = client.pipeline();
            for (const key of keys) {
              pipeline.del(key);
            }
            await pipeline.exec();
          }
        } while (cursor !== "0");
      } catch (error) {
        throw new IntegrationError(
          "Upstash Redis",
          `Cache invalidation failed for pattern "${pattern}": ${error instanceof Error ? error.message : String(error)}`,
          { pattern },
        );
      }
    },
  };
}

/**
 * Singleton cache provider instance.
 * Uses Redis if configured, otherwise falls back to in-memory cache.
 */
export const cacheProvider: CacheProvider = createCacheProvider();
