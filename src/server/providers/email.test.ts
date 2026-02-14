/**
 * Tests for the Resend EmailProvider implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { IntegrationError } from "@/server/lib/errors";

import { createEmailProvider } from "./email";
import type { ResendEmailConfig } from "./email";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const testConfig: ResendEmailConfig = {
  apiKey: "re_test_api_key_123",
  defaultFrom: "Test <test@ordolix.com>",
};

describe("EmailProvider (Resend)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createEmailProvider", () => {
    it("returns an object implementing the EmailProvider interface", () => {
      const provider = createEmailProvider(testConfig);
      expect(provider).toHaveProperty("send");
      expect(typeof provider.send).toBe("function");
    });
  });

  describe("send", () => {
    it("sends an email via the Resend API and returns the message id", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "msg-abc-123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const provider = createEmailProvider(testConfig);
      const result = await provider.send({
        to: "user@example.com",
        subject: "Test Subject",
        html: "<h1>Hello</h1>",
      });

      expect(result).toEqual({ id: "msg-abc-123" });
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it("sends the correct request body with single recipient", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "msg-1" }), { status: 200 }),
      );

      const provider = createEmailProvider(testConfig);
      await provider.send({
        to: "user@example.com",
        subject: "Hello",
        html: "<p>Hi</p>",
      });

      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.resend.com/emails");
      const body = JSON.parse(options.body as string);
      expect(body.to).toEqual(["user@example.com"]);
      expect(body.subject).toBe("Hello");
      expect(body.html).toBe("<p>Hi</p>");
      expect(body.from).toBe("Test <test@ordolix.com>");
    });

    it("sends the correct request body with multiple recipients", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "msg-2" }), { status: 200 }),
      );

      const provider = createEmailProvider(testConfig);
      await provider.send({
        to: ["a@example.com", "b@example.com"],
        subject: "Group",
        html: "<p>Group email</p>",
      });

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.to).toEqual(["a@example.com", "b@example.com"]);
    });

    it("uses custom from address when provided", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "msg-3" }), { status: 200 }),
      );

      const provider = createEmailProvider(testConfig);
      await provider.send({
        to: "user@example.com",
        subject: "Custom From",
        html: "<p>Hi</p>",
        from: "Admin <admin@ordolix.com>",
      });

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.from).toBe("Admin <admin@ordolix.com>");
    });

    it("includes reply-to when provided", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "msg-4" }), { status: 200 }),
      );

      const provider = createEmailProvider(testConfig);
      await provider.send({
        to: "user@example.com",
        subject: "With Reply-To",
        html: "<p>Hi</p>",
        replyTo: "support@ordolix.com",
      });

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.reply_to).toBe("support@ordolix.com");
    });

    it("does not include reply_to when not provided", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "msg-5" }), { status: 200 }),
      );

      const provider = createEmailProvider(testConfig);
      await provider.send({
        to: "user@example.com",
        subject: "No Reply-To",
        html: "<p>Hi</p>",
      });

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.reply_to).toBeUndefined();
    });

    it("includes Bearer authorization header", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "msg-6" }), { status: 200 }),
      );

      const provider = createEmailProvider(testConfig);
      await provider.send({
        to: "user@example.com",
        subject: "Auth Test",
        html: "<p>Hi</p>",
      });

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer re_test_api_key_123");
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("throws IntegrationError on API error response", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              statusCode: 422,
              message: "Invalid email address",
              name: "validation_error",
            }),
            { status: 422 },
          ),
        ),
      );

      const provider = createEmailProvider(testConfig);

      await expect(
        provider.send({
          to: "invalid-email",
          subject: "Test",
          html: "<p>Hi</p>",
        }),
      ).rejects.toThrow(IntegrationError);

      await expect(
        provider.send({
          to: "invalid-email",
          subject: "Test",
          html: "<p>Hi</p>",
        }),
      ).rejects.toThrow("Invalid email address");
    });

    it("throws IntegrationError on non-JSON error response", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response("Internal Server Error", { status: 500 }),
      );

      const provider = createEmailProvider(testConfig);

      await expect(
        provider.send({
          to: "user@example.com",
          subject: "Test",
          html: "<p>Hi</p>",
        }),
      ).rejects.toThrow("HTTP 500");
    });

    it("throws IntegrationError on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

      const provider = createEmailProvider(testConfig);

      await expect(
        provider.send({
          to: "user@example.com",
          subject: "Test",
          html: "<p>Hi</p>",
        }),
      ).rejects.toThrow(IntegrationError);

      mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

      await expect(
        provider.send({
          to: "user@example.com",
          subject: "Test",
          html: "<p>Hi</p>",
        }),
      ).rejects.toThrow("Network error sending email");
    });

    it("uses default from address when no defaultFrom in config", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "msg-7" }), { status: 200 }),
      );

      const provider = createEmailProvider({ apiKey: "re_key" });
      await provider.send({
        to: "user@example.com",
        subject: "Default From",
        html: "<p>Hi</p>",
      });

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.from).toBe("Ordolix <noreply@ordolix.com>");
    });
  });
});
