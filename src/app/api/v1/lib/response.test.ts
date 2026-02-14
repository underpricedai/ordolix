import { describe, expect, it } from "vitest";
import {
  success,
  created,
  error,
  notFound,
  forbidden,
  badRequest,
  rateLimited,
} from "./response";

const mockRateLimit = {
  success: true,
  limit: 600,
  remaining: 599,
  reset: Date.now() + 60_000,
};

describe("success", () => {
  it("returns 200 status", async () => {
    const response = success({ id: "1" });
    expect(response.status).toBe(200);
  });

  it("returns data in JSON body", async () => {
    const response = success({ id: "1", name: "Test" });
    const body = await response.json();
    expect(body.data).toEqual({ id: "1", name: "Test" });
  });

  it("includes meta when provided", async () => {
    const response = success([], { total: 10, nextCursor: "abc" });
    const body = await response.json();
    expect(body.meta).toEqual({ total: 10, nextCursor: "abc" });
  });

  it("omits meta when not provided", async () => {
    const response = success({ id: "1" });
    const body = await response.json();
    expect(body.meta).toBeUndefined();
  });

  it("sets rate limit headers when provided", () => {
    const response = success({ id: "1" }, undefined, mockRateLimit);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("600");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("599");
    expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("does not set rate limit headers when omitted", () => {
    const response = success({ id: "1" });
    expect(response.headers.get("X-RateLimit-Limit")).toBeNull();
  });
});

describe("created", () => {
  it("returns 201 status", async () => {
    const response = created({ id: "1" });
    expect(response.status).toBe(201);
  });

  it("returns data in JSON body", async () => {
    const response = created({ id: "new-1" });
    const body = await response.json();
    expect(body.data).toEqual({ id: "new-1" });
  });

  it("sets rate limit headers when provided", () => {
    const response = created({ id: "1" }, mockRateLimit);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("600");
  });
});

describe("error", () => {
  it("returns specified status code", async () => {
    const response = error("CUSTOM_ERROR", "Something broke", 503);
    expect(response.status).toBe(503);
  });

  it("returns error body with code and message", async () => {
    const response = error("TEST_ERROR", "Test message", 400);
    const body = await response.json();
    expect(body.error.code).toBe("TEST_ERROR");
    expect(body.error.message).toBe("Test message");
  });

  it("includes details when provided", async () => {
    const response = error("VAL_ERR", "Bad input", 400, { field: "name" });
    const body = await response.json();
    expect(body.error.details).toEqual({ field: "name" });
  });

  it("omits details when not provided", async () => {
    const response = error("ERR", "Msg", 500);
    const body = await response.json();
    expect(body.error.details).toBeUndefined();
  });

  it("sets rate limit headers when provided", () => {
    const response = error("ERR", "Msg", 400, undefined, mockRateLimit);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("600");
  });
});

describe("notFound", () => {
  it("returns 404 status", () => {
    const response = notFound("Issue");
    expect(response.status).toBe(404);
  });

  it("includes resource name in message", async () => {
    const response = notFound("Issue");
    const body = await response.json();
    expect(body.error.message).toContain("Issue");
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("includes resource ID in message when provided", async () => {
    const response = notFound("Issue", "PROJ-42");
    const body = await response.json();
    expect(body.error.message).toContain("PROJ-42");
  });

  it("omits ID from message when not provided", async () => {
    const response = notFound("Project");
    const body = await response.json();
    expect(body.error.message).toBe("Project not found");
  });
});

describe("forbidden", () => {
  it("returns 403 status", () => {
    const response = forbidden();
    expect(response.status).toBe(403);
  });

  it("uses default message", async () => {
    const response = forbidden();
    const body = await response.json();
    expect(body.error.message).toContain("permission");
    expect(body.error.code).toBe("PERMISSION_DENIED");
  });

  it("uses custom message when provided", async () => {
    const response = forbidden("Admin only");
    const body = await response.json();
    expect(body.error.message).toBe("Admin only");
  });
});

describe("badRequest", () => {
  it("returns 400 status", () => {
    const response = badRequest("Invalid input");
    expect(response.status).toBe(400);
  });

  it("returns error body", async () => {
    const response = badRequest("Missing field");
    const body = await response.json();
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.message).toBe("Missing field");
  });

  it("includes details when provided", async () => {
    const response = badRequest("Validation failed", { field: "email" });
    const body = await response.json();
    expect(body.error.details).toEqual({ field: "email" });
  });
});

describe("rateLimited", () => {
  it("returns 429 status", () => {
    const rl = { ...mockRateLimit, success: false, remaining: 0 };
    const response = rateLimited(rl);
    expect(response.status).toBe(429);
  });

  it("returns RATE_LIMITED error code", async () => {
    const rl = { ...mockRateLimit, success: false, remaining: 0 };
    const response = rateLimited(rl);
    const body = await response.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("includes retryAfter in details", async () => {
    const rl = {
      success: false,
      limit: 600,
      remaining: 0,
      reset: Date.now() + 30_000,
    };
    const response = rateLimited(rl);
    const body = await response.json();
    expect(body.error.details?.retryAfter).toBeGreaterThan(0);
  });

  it("sets rate limit headers", () => {
    const rl = { ...mockRateLimit, success: false, remaining: 0 };
    const response = rateLimited(rl);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("600");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});
