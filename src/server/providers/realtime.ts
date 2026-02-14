/**
 * SSE-based RealTimeProvider implementation.
 *
 * Uses an in-memory EventEmitter for v1. Suitable for single-instance
 * deployments. For multi-instance, swap to Upstash Redis pub/sub or Ably.
 *
 * @module realtime
 */

import { randomBytes, createHash } from "crypto";
import { EventEmitter } from "events";

import type { RealTimeProvider } from "./types";

/**
 * Internal event bus for pub/sub within a single process.
 * Increase max listeners since channels may be numerous.
 */
const eventBus = new EventEmitter();
eventBus.setMaxListeners(1000);

/** Token store mapping token -> { userId, channels, expiresAt } */
const tokenStore = new Map<
  string,
  { userId: string; channels: string[]; expiresAt: number }
>();

/** Default token TTL in milliseconds (1 hour). */
const DEFAULT_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Shape of events emitted on channels.
 */
interface ChannelEvent {
  event: string;
  data: unknown;
  timestamp: number;
}

/**
 * Creates a RealTimeProvider backed by an in-memory EventEmitter and SSE.
 *
 * @returns RealTimeProvider implementation
 *
 * @example
 * ```ts
 * const realtime = createRealTimeProvider();
 * const token = await realtime.createToken("user-1", ["project:abc"]);
 * await realtime.publish("project:abc", "issue.created", { id: "123" });
 * ```
 */
export function createRealTimeProvider(): RealTimeProvider {
  return {
    async publish(
      channel: string,
      event: string,
      data: unknown,
    ): Promise<void> {
      const payload: ChannelEvent = {
        event,
        data,
        timestamp: Date.now(),
      };
      eventBus.emit(channel, payload);
    },

    async createToken(
      userId: string,
      channels: string[],
    ): Promise<string> {
      const token = randomBytes(32).toString("hex");
      const hash = createHash("sha256").update(token).digest("hex");

      tokenStore.set(hash, {
        userId,
        channels,
        expiresAt: Date.now() + DEFAULT_TOKEN_TTL_MS,
      });

      return token;
    },
  };
}

/**
 * Validates an SSE connection token and returns the associated metadata.
 *
 * @param token - The raw token string provided by the client
 * @returns Token metadata if valid, null if invalid or expired
 */
export function validateToken(
  token: string,
): { userId: string; channels: string[] } | null {
  const hash = createHash("sha256").update(token).digest("hex");
  const entry = tokenStore.get(hash);

  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    tokenStore.delete(hash);
    return null;
  }

  return { userId: entry.userId, channels: entry.channels };
}

/**
 * Creates a ReadableStream for Server-Sent Events on the given channels.
 *
 * This is intended to be returned from a Next.js API route handler as
 * a streaming response with `Content-Type: text/event-stream`.
 *
 * @param channels - Channels to subscribe to
 * @returns ReadableStream that emits SSE-formatted data
 *
 * @example
 * ```ts
 * // In an API route (app/api/events/route.ts):
 * export async function GET(request: Request) {
 *   const tokenData = validateToken(token);
 *   if (!tokenData) return new Response("Unauthorized", { status: 401 });
 *
 *   const stream = createSSEStream(tokenData.channels);
 *   return new Response(stream, {
 *     headers: {
 *       "Content-Type": "text/event-stream",
 *       "Cache-Control": "no-cache",
 *       Connection: "keep-alive",
 *     },
 *   });
 * }
 * ```
 */
export function createSSEStream(channels: string[]): ReadableStream {
  let cleanup: (() => void) | null = null;

  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const listener = (payload: ChannelEvent) => {
        try {
          const sseMessage =
            `event: ${payload.event}\n` +
            `data: ${JSON.stringify(payload.data)}\n\n`;
          controller.enqueue(encoder.encode(sseMessage));
        } catch {
          // Controller may be closed if client disconnected
        }
      };

      for (const channel of channels) {
        eventBus.on(channel, listener);
      }

      // Send initial connection event
      const connectMessage = `event: connected\ndata: ${JSON.stringify({ channels })}\n\n`;
      controller.enqueue(encoder.encode(connectMessage));

      // Store cleanup function in closure scope for cancel
      cleanup = () => {
        for (const channel of channels) {
          eventBus.off(channel, listener);
        }
      };
    },

    cancel() {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    },
  });
}

/**
 * Exposes the internal event bus for testing purposes.
 *
 * @returns The internal EventEmitter instance
 */
export function getEventBus(): EventEmitter {
  return eventBus;
}

/**
 * Clears all stored tokens. Primarily for testing.
 */
export function clearTokenStore(): void {
  tokenStore.clear();
}

/**
 * Singleton real-time provider instance.
 */
export const realtimeProvider: RealTimeProvider = createRealTimeProvider();
