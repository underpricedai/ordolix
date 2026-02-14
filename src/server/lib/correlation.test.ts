import { describe, expect, it } from "vitest";
import {
  generateCorrelationId,
  getCorrelationId,
  CORRELATION_HEADER,
} from "./correlation";
import { NextRequest } from "next/server";

// ── generateCorrelationId ───────────────────────────────────────────────────

describe("generateCorrelationId", () => {
  it("returns a valid UUID v4 string", () => {
    const id = generateCorrelationId();
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(id).toMatch(uuidV4Regex);
  });

  it("returns unique values on each call", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateCorrelationId()));
    expect(ids.size).toBe(100);
  });
});

// ── getCorrelationId ────────────────────────────────────────────────────────

describe("getCorrelationId", () => {
  function createRequest(headers?: Record<string, string>): NextRequest {
    return new NextRequest("https://example.com/api/test", {
      headers: headers ?? {},
    });
  }

  it("extracts correlation ID from request header", () => {
    const expected = "abc-123-def-456";
    const request = createRequest({ [CORRELATION_HEADER]: expected });

    const result = getCorrelationId(request);
    expect(result).toBe(expected);
  });

  it("generates a new ID when header is missing", () => {
    const request = createRequest();

    const result = getCorrelationId(request);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("generates a new ID when header is empty string", () => {
    const request = createRequest({ [CORRELATION_HEADER]: "" });

    const result = getCorrelationId(request);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it("generates a new ID when header is whitespace-only", () => {
    const request = createRequest({ [CORRELATION_HEADER]: "   " });

    const result = getCorrelationId(request);
    // Should be a newly generated UUID, not whitespace
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it("trims whitespace from existing header value", () => {
    const request = createRequest({
      [CORRELATION_HEADER]: "  abc-123  ",
    });

    const result = getCorrelationId(request);
    expect(result).toBe("abc-123");
  });
});

// ── CORRELATION_HEADER ──────────────────────────────────────────────────────

describe("CORRELATION_HEADER", () => {
  it("equals X-Correlation-ID", () => {
    expect(CORRELATION_HEADER).toBe("X-Correlation-ID");
  });
});
