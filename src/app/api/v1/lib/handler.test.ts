import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import { AppError, NotFoundError, ValidationError } from "@/server/lib/errors";

// ── Mock dependencies ───────────────────────────────────────────────────────

const mockAuthenticateApiRequest = vi.fn();
const mockCheckRateLimit = vi.fn();

vi.mock("./auth", () => ({
  authenticateApiRequest: (...args: unknown[]) =>
    mockAuthenticateApiRequest(...args),
}));

vi.mock("@/server/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: () => ({
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    }),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/server/lib/correlation", () => ({
  CORRELATION_HEADER: "X-Correlation-ID",
  generateCorrelationId: () => "test-request-id",
}));

import { apiHandler, type ApiHandlerContext } from "./handler";
import * as res from "./response";

// ── Helpers ─────────────────────────────────────────────────────────────────

function createNextRequest(
  url = "https://ordolix.dev/api/v1/test",
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(url, {
    headers: new Headers(headers),
  });
}

const mockAuthContext = {
  userId: "user-1",
  organizationId: "org-1",
  tokenId: "token-1",
};

const mockRateLimit = {
  success: true,
  limit: 600,
  remaining: 599,
  reset: Date.now() + 60_000,
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("apiHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateApiRequest.mockResolvedValue(mockAuthContext);
    mockCheckRateLimit.mockResolvedValue(mockRateLimit);
  });

  it("calls the handler function with context and params", async () => {
    const handler = vi.fn(async (_req: NextRequest, ctx: ApiHandlerContext) => {
      return res.success({ ok: true }, undefined, ctx.rateLimit);
    });

    const wrapped = apiHandler(handler);
    const request = createNextRequest();
    const routeContext = { params: Promise.resolve({ id: "123" }) };

    await wrapped(request, routeContext);

    expect(handler).toHaveBeenCalledWith(
      request,
      expect.objectContaining({
        userId: "user-1",
        organizationId: "org-1",
        tokenId: "token-1",
        requestId: expect.any(String),
        rateLimit: mockRateLimit,
      }),
      { id: "123" },
    );
  });

  it("authenticates the request before calling handler", async () => {
    const handler = vi.fn(async () => res.success({ ok: true }));
    const wrapped = apiHandler(handler);
    const request = createNextRequest();

    await wrapped(request, { params: Promise.resolve({}) });

    expect(mockAuthenticateApiRequest).toHaveBeenCalledWith(request);
  });

  it("checks rate limit using tokenId", async () => {
    const handler = vi.fn(async () => res.success({ ok: true }));
    const wrapped = apiHandler(handler);
    const request = createNextRequest();

    await wrapped(request, { params: Promise.resolve({}) });

    expect(mockCheckRateLimit).toHaveBeenCalledWith("token-1", "api");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      limit: 600,
      remaining: 0,
      reset: Date.now() + 30_000,
    });

    const handler = vi.fn(async () => res.success({ ok: true }));
    const wrapped = apiHandler(handler);
    const request = createNextRequest();

    const response = await wrapped(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(429);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 401 when authentication fails", async () => {
    mockAuthenticateApiRequest.mockRejectedValue(
      new AppError("UNAUTHORIZED", "Bad token", 401),
    );

    const handler = vi.fn(async () => res.success({ ok: true }));
    const wrapped = apiHandler(handler);
    const request = createNextRequest();

    const response = await wrapped(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(handler).not.toHaveBeenCalled();
  });

  it("maps AppError to appropriate HTTP response", async () => {
    const handler = vi.fn(async () => {
      throw new NotFoundError("Issue", "PROJ-42");
    });

    const wrapped = apiHandler(handler);
    const request = createNextRequest();

    const response = await wrapped(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toContain("PROJ-42");
  });

  it("maps ValidationError to 400 response", async () => {
    const handler = vi.fn(async () => {
      throw new ValidationError("Invalid field value", {
        code: "WORKFLOW_TRANSITION_BLOCKED",
      });
    });

    const wrapped = apiHandler(handler);
    const request = createNextRequest();

    const response = await wrapped(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("maps ZodError to 400 response with validation details", async () => {
    const handler = vi.fn(async (): Promise<Response> => {
      z.object({ name: z.string() }).parse({ name: 123 });
      return res.success({ ok: true });
    });

    const wrapped = apiHandler(handler);
    const request = createNextRequest();

    const response = await wrapped(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.message).toBe("Validation failed");
    expect(body.error.details?.issues).toBeInstanceOf(Array);
  });

  it("maps unknown errors to 500 response", async () => {
    const handler = vi.fn(async () => {
      throw new Error("Something unexpected");
    });

    const wrapped = apiHandler(handler);
    const request = createNextRequest();

    const response = await wrapped(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });

  it("adds X-Correlation-ID header to responses", async () => {
    const handler = vi.fn(async (_req: NextRequest, ctx: ApiHandlerContext) => {
      return res.success({ ok: true }, undefined, ctx.rateLimit);
    });

    const wrapped = apiHandler(handler);
    const request = createNextRequest();

    const response = await wrapped(request, { params: Promise.resolve({}) });

    expect(response.headers.get("X-Correlation-ID")).toBeTruthy();
  });

  it("uses X-Correlation-ID from request when present", async () => {
    const handler = vi.fn(async (_req: NextRequest, ctx: ApiHandlerContext) => {
      return res.success({ requestId: ctx.requestId });
    });

    const wrapped = apiHandler(handler);
    const request = createNextRequest("https://ordolix.dev/api/v1/test", {
      "X-Correlation-ID": "custom-correlation-id",
    });

    const response = await wrapped(request, { params: Promise.resolve({}) });

    expect(response.headers.get("X-Correlation-ID")).toBe(
      "custom-correlation-id",
    );
  });

  it("adds correlation ID to error responses too", async () => {
    const handler = vi.fn(async () => {
      throw new NotFoundError("Issue", "123");
    });

    const wrapped = apiHandler(handler);
    const request = createNextRequest();

    const response = await wrapped(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(404);
    expect(response.headers.get("X-Correlation-ID")).toBeTruthy();
  });
});
