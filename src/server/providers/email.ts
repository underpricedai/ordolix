/**
 * Resend EmailProvider implementation.
 *
 * Uses fetch-based API calls since the `resend` package is not installed.
 * Sends transactional emails through the Resend REST API.
 *
 * @module email
 */

import { IntegrationError } from "@/server/lib/errors";

import type { EmailProvider } from "./types";

/** Resend API base URL. */
const RESEND_API_URL = "https://api.resend.com";

/** Configuration for the Resend email provider. */
export interface ResendEmailConfig {
  /** Resend API key */
  apiKey: string;
  /** Default from address (e.g., "Ordolix <noreply@ordolix.com>") */
  defaultFrom?: string;
}

/**
 * Resolves email provider configuration from environment variables.
 *
 * @throws {IntegrationError} If RESEND_API_KEY is not set
 * @returns Validated Resend configuration
 */
function resolveConfig(): ResendEmailConfig {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new IntegrationError(
      "Resend",
      "Missing required environment variable: RESEND_API_KEY. " +
        "Set this in .env to enable transactional email.",
    );
  }

  return {
    apiKey,
    defaultFrom:
      process.env.RESEND_DEFAULT_FROM ?? "Ordolix <noreply@ordolix.com>",
  };
}

/** Shape of a successful Resend API response. */
interface ResendSuccessResponse {
  id: string;
}

/** Shape of a Resend API error response. */
interface ResendErrorResponse {
  statusCode: number;
  message: string;
  name: string;
}

/**
 * Creates an EmailProvider backed by the Resend API.
 *
 * @param config - Resend email configuration
 * @returns EmailProvider implementation
 *
 * @example
 * ```ts
 * const email = createEmailProvider({ apiKey: "re_123..." });
 * await email.send({
 *   to: "user@example.com",
 *   subject: "Welcome!",
 *   html: "<h1>Hello</h1>",
 * });
 * ```
 */
export function createEmailProvider(config: ResendEmailConfig): EmailProvider {
  return {
    async send(options: {
      to: string | string[];
      subject: string;
      html: string;
      from?: string;
      replyTo?: string;
    }): Promise<{ id: string }> {
      const body = {
        from: options.from ?? config.defaultFrom ?? "Ordolix <noreply@ordolix.com>",
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        ...(options.replyTo ? { reply_to: options.replyTo } : {}),
      };

      let response: Response;
      try {
        response = await fetch(`${RESEND_API_URL}/emails`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
      } catch (error) {
        throw new IntegrationError(
          "Resend",
          `Network error sending email: ${error instanceof Error ? error.message : String(error)}`,
          { to: options.to, subject: options.subject },
        );
      }

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = (await response.json()) as ResendErrorResponse;
          errorMessage = errorData.message;
        } catch {
          errorMessage = `HTTP ${response.status}`;
        }
        throw new IntegrationError(
          "Resend",
          `Failed to send email: ${errorMessage}`,
          {
            to: options.to,
            subject: options.subject,
            statusCode: response.status,
          },
        );
      }

      const data = (await response.json()) as ResendSuccessResponse;
      return { id: data.id };
    },
  };
}

/**
 * Lazily-initialized singleton email provider instance.
 * Reads configuration from environment variables on first access.
 *
 * @throws {IntegrationError} If RESEND_API_KEY is not set
 */
let _emailProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!_emailProvider) {
    _emailProvider = createEmailProvider(resolveConfig());
  }
  return _emailProvider;
}

/** @deprecated Use getEmailProvider() for lazy initialization */
export const emailProvider = new Proxy({} as EmailProvider, {
  get(_target, prop) {
    return getEmailProvider()[prop as keyof EmailProvider];
  },
});
