import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError } from "@/server/lib/errors";

// ── Mock the DB module ──────────────────────────────────────────────────────

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    apiToken: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

import { authenticateApiRequest } from "./auth";

// ── Helpers ─────────────────────────────────────────────────────────────────

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://ordolix.dev/api/v1/test", {
    headers: new Headers(headers),
  });
}

const mockApiToken = {
  id: "token-1",
  organizationId: "org-1",
  userId: "user-1",
  name: "CI Token",
  tokenHash: "", // Will be set in tests
  expiresAt: null,
  lastUsedAt: null,
  createdAt: new Date(),
  user: { id: "user-1" },
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("authenticateApiRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({});
  });

  it("throws UNAUTHORIZED when Authorization header is missing", async () => {
    const request = createRequest();

    await expect(authenticateApiRequest(request)).rejects.toThrow(AppError);
    await expect(authenticateApiRequest(request)).rejects.toThrow(
      /Missing Authorization header/,
    );
  });

  it("throws UNAUTHORIZED when Authorization format is invalid", async () => {
    const request = createRequest({ authorization: "Basic abc123" });

    await expect(authenticateApiRequest(request)).rejects.toThrow(AppError);
    await expect(authenticateApiRequest(request)).rejects.toThrow(
      /Invalid Authorization header format/,
    );
  });

  it("throws UNAUTHORIZED when Bearer token is empty", async () => {
    const request = createRequest({ authorization: "Bearer " });

    await expect(authenticateApiRequest(request)).rejects.toThrow(AppError);
  });

  it("throws UNAUTHORIZED when token is not found in DB", async () => {
    mockFindUnique.mockResolvedValue(null);
    const request = createRequest({ authorization: "Bearer invalid-token" });

    await expect(authenticateApiRequest(request)).rejects.toThrow(AppError);
    await expect(authenticateApiRequest(request)).rejects.toThrow(
      /Invalid or inactive/,
    );
  });

  it("throws UNAUTHORIZED when token is expired", async () => {
    mockFindUnique.mockResolvedValue({
      ...mockApiToken,
      expiresAt: new Date("2020-01-01"),
    });

    const request = createRequest({ authorization: "Bearer valid-token" });

    await expect(authenticateApiRequest(request)).rejects.toThrow(AppError);
    await expect(authenticateApiRequest(request)).rejects.toThrow(/expired/);
  });

  it("returns userId and organizationId for valid token", async () => {
    mockFindUnique.mockResolvedValue(mockApiToken);
    const request = createRequest({ authorization: "Bearer valid-token" });

    const result = await authenticateApiRequest(request);

    expect(result.userId).toBe("user-1");
    expect(result.organizationId).toBe("org-1");
    expect(result.tokenId).toBe("token-1");
  });

  it("accepts token with future expiration", async () => {
    mockFindUnique.mockResolvedValue({
      ...mockApiToken,
      expiresAt: new Date(Date.now() + 86400_000),
    });

    const request = createRequest({ authorization: "Bearer valid-token" });

    const result = await authenticateApiRequest(request);
    expect(result.userId).toBe("user-1");
  });

  it("accepts token with null expiration (never expires)", async () => {
    mockFindUnique.mockResolvedValue({
      ...mockApiToken,
      expiresAt: null,
    });

    const request = createRequest({ authorization: "Bearer valid-token" });

    const result = await authenticateApiRequest(request);
    expect(result.userId).toBe("user-1");
  });

  it("updates lastUsedAt on successful auth (fire-and-forget)", async () => {
    mockFindUnique.mockResolvedValue(mockApiToken);
    const request = createRequest({ authorization: "Bearer valid-token" });

    await authenticateApiRequest(request);

    // The update is fire-and-forget, but should be called
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "token-1" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it("does not crash if lastUsedAt update fails", async () => {
    mockFindUnique.mockResolvedValue(mockApiToken);
    mockUpdate.mockRejectedValue(new Error("DB error"));

    const request = createRequest({ authorization: "Bearer valid-token" });

    // Should not throw despite the update failure
    const result = await authenticateApiRequest(request);
    expect(result.userId).toBe("user-1");
  });

  it("hashes the token with SHA-256 for DB lookup", async () => {
    mockFindUnique.mockResolvedValue(mockApiToken);
    const request = createRequest({ authorization: "Bearer my-secret-token" });

    await authenticateApiRequest(request);

    // The findUnique should be called with a tokenHash (hex string)
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) },
      include: {
        user: { select: { id: true } },
      },
    });
  });

  it("throws UNAUTHORIZED for Authorization header with extra parts", async () => {
    const request = createRequest({ authorization: "Bearer token extra" });

    await expect(authenticateApiRequest(request)).rejects.toThrow(AppError);
  });
});
