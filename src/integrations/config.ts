/**
 * Integration configuration service.
 *
 * Manages IntegrationConfig records for all external providers.
 * Handles encrypted token storage and retrieval.
 *
 * @module integrations/config
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import type { PrismaClient, Prisma } from "@prisma/client";
import { IntegrationError } from "@/server/lib/errors";

/** Supported integration provider identifiers */
export type IntegrationProvider =
  | "github"
  | "sharepoint"
  | "salesforce"
  | "powerbi"
  | "mcp";

/** Shape of the config column per provider */
export interface IntegrationConfigData {
  [key: string]: unknown;
}

/** Shape of decrypted tokens */
export interface IntegrationTokens {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  [key: string]: string | undefined;
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Derive an encryption key from the application secret.
 *
 * @returns 32-byte key derived via scrypt
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.INTEGRATION_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new IntegrationError(
      "config",
      "Missing INTEGRATION_TOKEN_SECRET or NEXTAUTH_SECRET environment variable",
    );
  }
  return scryptSync(secret, "ordolix-integration-tokens", 32);
}

/**
 * Encrypt a token string for safe storage in the database.
 *
 * @param plaintext - The token string to encrypt
 * @returns Base64-encoded ciphertext with IV and auth tag prepended
 */
export function encryptTokens(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypt a previously encrypted token string.
 *
 * @param ciphertext - Base64-encoded encrypted token
 * @returns Decrypted plaintext token string
 */
export function decryptTokens(ciphertext: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

/**
 * Retrieve integration config for a provider within an organization.
 *
 * @param db - Prisma client instance
 * @param organizationId - The organization to query
 * @param provider - The integration provider identifier
 * @returns The config record with decrypted tokens, or null if not found
 */
export async function getIntegrationConfig(
  db: PrismaClient,
  organizationId: string,
  provider: IntegrationProvider,
): Promise<{
  id: string;
  config: IntegrationConfigData;
  tokens: IntegrationTokens | null;
  webhookSecret: string | null;
  isActive: boolean;
} | null> {
  const record = await db.integrationConfig.findUnique({
    where: { organizationId_provider: { organizationId, provider } },
  });

  if (!record) return null;

  let tokens: IntegrationTokens | null = null;
  if (record.encryptedTokens) {
    try {
      tokens = JSON.parse(decryptTokens(record.encryptedTokens)) as IntegrationTokens;
    } catch {
      throw new IntegrationError(
        provider,
        "Failed to decrypt integration tokens. The encryption key may have changed.",
      );
    }
  }

  return {
    id: record.id,
    config: record.config as IntegrationConfigData,
    tokens,
    webhookSecret: record.webhookSecret,
    isActive: record.isActive,
  };
}

/**
 * Create or update integration config for a provider.
 *
 * @param db - Prisma client instance
 * @param organizationId - The organization to configure
 * @param provider - The integration provider identifier
 * @param config - Provider-specific configuration data
 * @param tokens - Optional tokens to encrypt and store
 * @param webhookSecret - Optional webhook secret
 * @returns The saved config record ID
 */
export async function saveIntegrationConfig(
  db: PrismaClient,
  organizationId: string,
  provider: IntegrationProvider,
  config: IntegrationConfigData,
  tokens?: IntegrationTokens,
  webhookSecret?: string,
): Promise<{ id: string }> {
  const encryptedTokens = tokens ? encryptTokens(JSON.stringify(tokens)) : undefined;

  const record = await db.integrationConfig.upsert({
    where: { organizationId_provider: { organizationId, provider } },
    create: {
      organizationId,
      provider,
      config: config as Prisma.InputJsonValue,
      encryptedTokens: encryptedTokens ?? null,
      webhookSecret: webhookSecret ?? null,
      isActive: true,
    },
    update: {
      config: config as Prisma.InputJsonValue,
      ...(encryptedTokens !== undefined ? { encryptedTokens } : {}),
      ...(webhookSecret !== undefined ? { webhookSecret } : {}),
      updatedAt: new Date(),
    },
  });

  return { id: record.id };
}

/**
 * Delete integration config for a provider.
 *
 * @param db - Prisma client instance
 * @param organizationId - The organization owning the config
 * @param provider - The integration provider to remove
 */
export async function deleteIntegrationConfig(
  db: PrismaClient,
  organizationId: string,
  provider: IntegrationProvider,
): Promise<void> {
  await db.integrationConfig.deleteMany({
    where: { organizationId, provider },
  });
}
