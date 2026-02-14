/**
 * Tests for the SSE-based RealTimeProvider implementation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  createRealTimeProvider,
  createSSEStream,
  validateToken,
  clearTokenStore,
  getEventBus,
} from "./realtime";

describe("RealTimeProvider (SSE)", () => {
  beforeEach(() => {
    clearTokenStore();
    getEventBus().removeAllListeners();
  });

  describe("createRealTimeProvider", () => {
    it("returns an object implementing the RealTimeProvider interface", () => {
      const provider = createRealTimeProvider();
      expect(provider).toHaveProperty("publish");
      expect(provider).toHaveProperty("createToken");
      expect(typeof provider.publish).toBe("function");
      expect(typeof provider.createToken).toBe("function");
    });
  });

  describe("publish", () => {
    it("emits events to the internal event bus", async () => {
      const provider = createRealTimeProvider();
      const bus = getEventBus();

      const received: unknown[] = [];
      bus.on("project:abc", (payload: unknown) => {
        received.push(payload);
      });

      await provider.publish("project:abc", "issue.created", { id: "123" });

      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({
        event: "issue.created",
        data: { id: "123" },
        timestamp: expect.any(Number),
      });
    });

    it("does not error when no listeners are on the channel", async () => {
      const provider = createRealTimeProvider();
      await expect(
        provider.publish("empty-channel", "test", {}),
      ).resolves.toBeUndefined();
    });

    it("emits to the correct channel only", async () => {
      const provider = createRealTimeProvider();
      const bus = getEventBus();

      const channelA: unknown[] = [];
      const channelB: unknown[] = [];

      bus.on("channel-a", (p: unknown) => channelA.push(p));
      bus.on("channel-b", (p: unknown) => channelB.push(p));

      await provider.publish("channel-a", "event", { target: "a" });

      expect(channelA).toHaveLength(1);
      expect(channelB).toHaveLength(0);
    });
  });

  describe("createToken", () => {
    it("returns a hex string token", async () => {
      const provider = createRealTimeProvider();
      const token = await provider.createToken("user-1", ["channel-a"]);

      expect(typeof token).toBe("string");
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("generates unique tokens for each call", async () => {
      const provider = createRealTimeProvider();
      const token1 = await provider.createToken("user-1", ["ch"]);
      const token2 = await provider.createToken("user-1", ["ch"]);

      expect(token1).not.toBe(token2);
    });
  });

  describe("validateToken", () => {
    it("returns user info for a valid token", async () => {
      const provider = createRealTimeProvider();
      const token = await provider.createToken("user-42", [
        "project:1",
        "project:2",
      ]);

      const result = validateToken(token);

      expect(result).toEqual({
        userId: "user-42",
        channels: ["project:1", "project:2"],
      });
    });

    it("returns null for an unknown token", () => {
      const result = validateToken("nonexistent-token-value");
      expect(result).toBeNull();
    });

    it("returns null for an expired token", async () => {
      const provider = createRealTimeProvider();

      // Mock Date.now to control time
      const now = Date.now();
      vi.spyOn(Date, "now")
        .mockReturnValueOnce(now) // createToken stores with expiresAt = now + 1hr
        .mockReturnValueOnce(now + 2 * 60 * 60 * 1000); // validateToken: 2 hours later

      const token = await provider.createToken("user-1", ["ch"]);
      const result = validateToken(token);

      expect(result).toBeNull();

      vi.restoreAllMocks();
    });

    it("cleans up expired tokens from the store", async () => {
      const provider = createRealTimeProvider();
      const now = Date.now();

      vi.spyOn(Date, "now")
        .mockReturnValueOnce(now) // createToken
        .mockReturnValueOnce(now + 2 * 60 * 60 * 1000) // first validate (expired)
        .mockReturnValueOnce(now + 2 * 60 * 60 * 1000); // second validate

      const token = await provider.createToken("user-1", ["ch"]);

      // First call: returns null because expired, and deletes from store
      expect(validateToken(token)).toBeNull();
      // Second call: returns null because deleted
      expect(validateToken(token)).toBeNull();

      vi.restoreAllMocks();
    });
  });

  describe("createSSEStream", () => {
    it("sends an initial connected event with channel list", async () => {
      const stream = createSSEStream(["channel-a", "channel-b"]);
      const reader = stream.getReader();

      const { value } = await reader.read();
      const text = new TextDecoder().decode(value);

      expect(text).toContain("event: connected");
      expect(text).toContain(
        JSON.stringify({ channels: ["channel-a", "channel-b"] }),
      );

      reader.releaseLock();
      await stream.cancel();
    });

    it("streams events published to subscribed channels", async () => {
      const provider = createRealTimeProvider();
      const stream = createSSEStream(["test-channel"]);
      const reader = stream.getReader();

      // Read the initial connected event
      await reader.read();

      // Publish an event
      await provider.publish("test-channel", "item.updated", { id: "42" });

      const { value } = await reader.read();
      const text = new TextDecoder().decode(value);

      expect(text).toContain("event: item.updated");
      expect(text).toContain(JSON.stringify({ id: "42" }));

      reader.releaseLock();
      await stream.cancel();
    });

    it("formats events as proper SSE messages", async () => {
      const provider = createRealTimeProvider();
      const stream = createSSEStream(["fmt-channel"]);
      const reader = stream.getReader();

      // Skip connected event
      await reader.read();

      await provider.publish("fmt-channel", "test.event", { key: "value" });

      const { value } = await reader.read();
      const text = new TextDecoder().decode(value);

      // SSE format: "event: <name>\ndata: <json>\n\n"
      expect(text).toMatch(/^event: test\.event\ndata: .+\n\n$/);

      reader.releaseLock();
      await stream.cancel();
    });

    it("listens to multiple channels simultaneously", async () => {
      const provider = createRealTimeProvider();
      const stream = createSSEStream(["ch-1", "ch-2"]);
      const reader = stream.getReader();

      // Skip connected event
      await reader.read();

      await provider.publish("ch-1", "from-1", { source: "ch-1" });
      const { value: v1 } = await reader.read();
      expect(new TextDecoder().decode(v1)).toContain("from-1");

      await provider.publish("ch-2", "from-2", { source: "ch-2" });
      const { value: v2 } = await reader.read();
      expect(new TextDecoder().decode(v2)).toContain("from-2");

      reader.releaseLock();
      await stream.cancel();
    });

    it("removes listeners when the stream is cancelled", async () => {
      const bus = getEventBus();
      const stream = createSSEStream(["cleanup-channel"]);
      const reader = stream.getReader();

      // Read connected event
      await reader.read();

      expect(bus.listenerCount("cleanup-channel")).toBe(1);

      reader.releaseLock();
      await stream.cancel();

      // After cancellation, listener should be removed
      expect(bus.listenerCount("cleanup-channel")).toBe(0);
    });
  });

  describe("clearTokenStore", () => {
    it("removes all stored tokens", async () => {
      const provider = createRealTimeProvider();
      const token = await provider.createToken("user-1", ["ch"]);

      expect(validateToken(token)).not.toBeNull();

      clearTokenStore();

      expect(validateToken(token)).toBeNull();
    });
  });
});
