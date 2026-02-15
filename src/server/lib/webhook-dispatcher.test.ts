/**
 * Tests for the webhook dispatch handler.
 *
 * Validates routing of webhook payloads to integration-specific handlers,
 * graceful handling of unknown sources, and error propagation.
 *
 * @module server/lib/webhook-dispatcher.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  dispatchWebhook,
  registerWebhookHandler,
  clearWebhookHandlers,
} from "./webhook-dispatcher";
import type { WebhookHandlerFn, WebhookDispatchResult } from "./webhook-dispatcher";

// Mock the logger to suppress output and allow assertions
vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("dispatchWebhook", () => {
  beforeEach(() => {
    clearWebhookHandlers();
  });

  it("should dispatch to a registered handler and return processed=true", async () => {
    const handler: WebhookHandlerFn = vi.fn().mockResolvedValue(undefined);
    registerWebhookHandler("github", handler);

    const result = await dispatchWebhook("github", "push", { ref: "refs/heads/main" });

    expect(result).toEqual<WebhookDispatchResult>({
      processed: true,
      handler: "github",
    });
    expect(handler).toHaveBeenCalledWith("push", { ref: "refs/heads/main" });
  });

  it("should dispatch to the sharepoint handler when source is sharepoint", async () => {
    const handler: WebhookHandlerFn = vi.fn().mockResolvedValue(undefined);
    registerWebhookHandler("sharepoint", handler);

    const result = await dispatchWebhook("sharepoint", "file_changed", {
      siteId: "site-1",
      resourceId: "doc-abc",
    });

    expect(result).toEqual<WebhookDispatchResult>({
      processed: true,
      handler: "sharepoint",
    });
    expect(handler).toHaveBeenCalledWith("file_changed", {
      siteId: "site-1",
      resourceId: "doc-abc",
    });
  });

  it("should return processed=false for an unknown source without throwing", async () => {
    const result = await dispatchWebhook("unknown-service", "some_event", { data: 1 });

    expect(result).toEqual<WebhookDispatchResult>({
      processed: false,
      handler: "none",
    });
  });

  it("should return processed=false when no handlers are registered", async () => {
    const result = await dispatchWebhook("github", "push", {});

    expect(result).toEqual<WebhookDispatchResult>({
      processed: false,
      handler: "none",
    });
  });

  it("should propagate errors thrown by the handler", async () => {
    const handler: WebhookHandlerFn = vi.fn().mockRejectedValue(
      new Error("Handler exploded"),
    );
    registerWebhookHandler("github", handler);

    await expect(
      dispatchWebhook("github", "push", { ref: "refs/heads/main" }),
    ).rejects.toThrow("Handler exploded");
  });

  it("should allow overwriting a previously registered handler", async () => {
    const handlerA: WebhookHandlerFn = vi.fn().mockResolvedValue(undefined);
    const handlerB: WebhookHandlerFn = vi.fn().mockResolvedValue(undefined);

    registerWebhookHandler("github", handlerA);
    registerWebhookHandler("github", handlerB);

    await dispatchWebhook("github", "push", {});

    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).toHaveBeenCalledWith("push", {});
  });

  it("should handle source names case-insensitively", async () => {
    const handler: WebhookHandlerFn = vi.fn().mockResolvedValue(undefined);
    registerWebhookHandler("github", handler);

    const result = await dispatchWebhook("GitHub", "push", {});

    expect(result.processed).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it("should pass through arbitrary payload shapes", async () => {
    const handler: WebhookHandlerFn = vi.fn().mockResolvedValue(undefined);
    registerWebhookHandler("salesforce", handler);

    const complexPayload = {
      objectType: "Case",
      recordId: "500xx000000001",
      changes: { Status: { old: "New", new: "In Progress" } },
      nested: { deep: { value: [1, 2, 3] } },
    };

    await dispatchWebhook("salesforce", "record_updated", complexPayload);

    expect(handler).toHaveBeenCalledWith("record_updated", complexPayload);
  });
});

describe("registerWebhookHandler", () => {
  beforeEach(() => {
    clearWebhookHandlers();
  });

  it("should accept a handler function and register it for a source", () => {
    const handler: WebhookHandlerFn = vi.fn();

    // Should not throw
    expect(() => registerWebhookHandler("powerbi", handler)).not.toThrow();
  });

  it("should normalize the source to lowercase", async () => {
    const handler: WebhookHandlerFn = vi.fn().mockResolvedValue(undefined);
    registerWebhookHandler("PowerBI", handler);

    const result = await dispatchWebhook("powerbi", "refresh_complete", {});

    expect(result.processed).toBe(true);
    expect(handler).toHaveBeenCalled();
  });
});
