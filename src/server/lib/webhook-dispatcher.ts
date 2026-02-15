/**
 * Webhook dispatch handler.
 *
 * Routes incoming webhook payloads to the appropriate integration handler
 * based on the source identifier. Unknown sources are logged as warnings
 * but do not throw errors, ensuring the webhook endpoint always returns
 * a valid response.
 *
 * @module server/lib/webhook-dispatcher
 */

import { logger } from "@/server/lib/logger";

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Function signature for an integration webhook handler.
 *
 * Each integration module registers a handler that processes events
 * for its specific source (e.g., "github", "sharepoint").
 *
 * @param event - The event type from the source (e.g., "push", "pull_request")
 * @param payload - The raw event payload from the source
 */
export type WebhookHandlerFn = (
  event: string,
  payload: Record<string, unknown>,
) => Promise<void>;

/**
 * Result returned by the webhook dispatcher after processing a payload.
 */
export interface WebhookDispatchResult {
  /** Whether the payload was dispatched to a registered handler */
  processed: boolean;
  /** The handler name that processed the event, or "none" if unhandled */
  handler: string;
}

// ── Handler Registry ─────────────────────────────────────────────────────────

/**
 * Internal registry mapping source identifiers to their webhook handlers.
 * Sources are stored in lowercase for case-insensitive matching.
 */
const handlers = new Map<string, WebhookHandlerFn>();

/**
 * Register a webhook handler for an integration source.
 *
 * If a handler is already registered for the given source, it will be
 * overwritten. Source names are normalized to lowercase.
 *
 * @param source - The integration source identifier (e.g., "github", "sharepoint")
 * @param handler - The handler function to invoke for webhooks from this source
 *
 * @example
 * ```ts
 * registerWebhookHandler("github", async (event, payload) => {
 *   if (event === "push") {
 *     await handlePushEvent(db, orgId, token, payload as GitHubPushEvent);
 *   }
 * });
 * ```
 */
export function registerWebhookHandler(
  source: string,
  handler: WebhookHandlerFn,
): void {
  const normalizedSource = source.toLowerCase();
  handlers.set(normalizedSource, handler);
}

/**
 * Remove all registered webhook handlers.
 *
 * Intended for use in tests to reset the handler registry between test cases.
 * Should not be called in production code.
 */
export function clearWebhookHandlers(): void {
  handlers.clear();
}

/**
 * Dispatch a webhook payload to the appropriate integration handler.
 *
 * Routes the payload based on the source identifier. If no handler is
 * registered for the source, a warning is logged and a non-throwing
 * result is returned with `processed: false`.
 *
 * @param source - The integration source identifier (e.g., "github", "sharepoint")
 * @param event - The event type from the source (e.g., "push", "pull_request")
 * @param payload - The raw event payload
 * @returns Dispatch result indicating whether the payload was processed
 *
 * @example
 * ```ts
 * const result = await dispatchWebhook("github", "push", { ref: "refs/heads/main" });
 * // { processed: true, handler: "github" }
 * ```
 */
export async function dispatchWebhook(
  source: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<WebhookDispatchResult> {
  const normalizedSource = source.toLowerCase();
  const log = logger.child({ source: normalizedSource, event });

  const handler = handlers.get(normalizedSource);

  if (!handler) {
    log.warn(
      { code: "WEBHOOK_HANDLER_NOT_FOUND", source: normalizedSource },
      "No webhook handler registered for source",
    );
    return { processed: false, handler: "none" };
  }

  log.info("Dispatching webhook to handler");
  await handler(event, payload);
  log.info("Webhook handler completed successfully");

  return { processed: true, handler: normalizedSource };
}
