/**
 * Tests for the shared integration config service.
 *
 * @module integrations/config.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  encryptTokens,
  decryptTokens,
  getIntegrationConfig,
  saveIntegrationConfig,
  deleteIntegrationConfig,
} from "./config";

// Set up env before imports use it
vi.stubEnv("INTEGRATION_TOKEN_SECRET", "test-secret-key-for-unit-tests-only");

function createMockDb() {
  return {
    integrationConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  } as unknown as import("@prisma/client").PrismaClient;
}

describe("encryptTokens / decryptTokens", () => {
  it("should round-trip encrypt and decrypt a token string", () => {
    const plaintext = JSON.stringify({ accessToken: "ghp_abc123", refreshToken: "ghr_xyz" });
    const encrypted = encryptTokens(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/); // base64

    const decrypted = decryptTokens(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should produce different ciphertext for the same plaintext (random IV)", () => {
    const plaintext = "same-input";
    const a = encryptTokens(plaintext);
    const b = encryptTokens(plaintext);
    expect(a).not.toBe(b);
  });

  it("should fail to decrypt tampered ciphertext", () => {
    const encrypted = encryptTokens("some-token");
    const tampered = encrypted.slice(0, -4) + "XXXX";
    expect(() => decryptTokens(tampered)).toThrow();
  });
});

describe("getIntegrationConfig", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should return null when no config exists", async () => {
    (db.integrationConfig.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getIntegrationConfig(db, "org-1", "github");
    expect(result).toBeNull();
  });

  it("should return config with decrypted tokens", async () => {
    const tokens = { accessToken: "ghp_test123" };
    const encryptedTokens = encryptTokens(JSON.stringify(tokens));

    (db.integrationConfig.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ic-1",
      config: { owner: "ordolix" },
      encryptedTokens,
      webhookSecret: "whsec_abc",
      isActive: true,
    });

    const result = await getIntegrationConfig(db, "org-1", "github");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("ic-1");
    expect(result!.config).toEqual({ owner: "ordolix" });
    expect(result!.tokens).toEqual(tokens);
    expect(result!.webhookSecret).toBe("whsec_abc");
    expect(result!.isActive).toBe(true);
  });

  it("should return null tokens when encryptedTokens is null", async () => {
    (db.integrationConfig.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ic-2",
      config: {},
      encryptedTokens: null,
      webhookSecret: null,
      isActive: true,
    });

    const result = await getIntegrationConfig(db, "org-1", "sharepoint");
    expect(result!.tokens).toBeNull();
  });
});

describe("saveIntegrationConfig", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should upsert config with encrypted tokens", async () => {
    (db.integrationConfig.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ic-new" });

    const result = await saveIntegrationConfig(
      db,
      "org-1",
      "github",
      { owner: "ordolix" },
      { accessToken: "ghp_test" },
      "whsec_123",
    );

    expect(result.id).toBe("ic-new");
    const call = (db.integrationConfig.upsert as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.where.organizationId_provider).toEqual({
      organizationId: "org-1",
      provider: "github",
    });
    expect(call.create.config).toEqual({ owner: "ordolix" });
    expect(call.create.encryptedTokens).toBeTruthy();
    expect(call.create.webhookSecret).toBe("whsec_123");
  });

  it("should upsert config without tokens", async () => {
    (db.integrationConfig.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ic-nt" });

    await saveIntegrationConfig(db, "org-1", "powerbi", { tenantId: "t-1" });

    const call = (db.integrationConfig.upsert as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.create.encryptedTokens).toBeNull();
  });
});

describe("deleteIntegrationConfig", () => {
  it("should call deleteMany with org and provider filter", async () => {
    const db = createMockDb();
    (db.integrationConfig.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

    await deleteIntegrationConfig(db, "org-1", "salesforce");

    expect(db.integrationConfig.deleteMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1", provider: "salesforce" },
    });
  });
});
