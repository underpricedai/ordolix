/**
 * Cloudflare R2 StorageProvider implementation.
 *
 * Uses fetch-based S3-compatible API since @aws-sdk/client-s3 is not installed.
 * Multi-tenant key prefixing ensures org isolation in a single bucket.
 *
 * @module storage
 */

import { createHmac, createHash } from "crypto";

import { IntegrationError } from "@/server/lib/errors";

import type { StorageProvider } from "./types";

/** Configuration for the R2 storage provider. */
export interface R2StorageConfig {
  /** Cloudflare account ID */
  accountId: string;
  /** R2 bucket name */
  bucket: string;
  /** R2 access key ID (S3-compatible) */
  accessKeyId: string;
  /** R2 secret access key (S3-compatible) */
  secretAccessKey: string;
  /** Custom endpoint override (defaults to R2 endpoint) */
  endpoint?: string;
}

/**
 * Resolves R2 configuration from environment variables.
 *
 * @throws {IntegrationError} If required environment variables are missing
 * @returns Validated R2 configuration
 */
function resolveConfig(): R2StorageConfig {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT;

  const missing: string[] = [];
  if (!accountId) missing.push("R2_ACCOUNT_ID");
  if (!bucket) missing.push("R2_BUCKET");
  if (!accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");

  if (missing.length > 0) {
    throw new IntegrationError(
      "Cloudflare R2",
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Set these in .env to enable file storage.",
    );
  }

  return {
    accountId: accountId!,
    bucket: bucket!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    endpoint,
  };
}

/**
 * Builds the R2 S3-compatible endpoint URL.
 *
 * @param config - R2 storage configuration
 * @returns The base endpoint URL for the bucket
 */
function getEndpoint(config: R2StorageConfig): string {
  return (
    config.endpoint ??
    `https://${config.accountId}.r2.cloudflarestorage.com`
  );
}

/**
 * Signs a string using HMAC-SHA256.
 *
 * @param key - The signing key
 * @param data - The data to sign
 * @returns HMAC-SHA256 digest as a Buffer
 */
function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

/**
 * Computes SHA-256 hash of the given data.
 *
 * @param data - Input data (string or Buffer)
 * @returns Hex-encoded SHA-256 hash
 */
function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Generates an AWS Signature Version 4 Authorization header for S3-compatible APIs.
 *
 * @param method - HTTP method
 * @param url - Full request URL
 * @param headers - Request headers (must include host, x-amz-date, x-amz-content-sha256)
 * @param config - R2 storage configuration
 * @returns Authorization header value
 */
function signRequest(
  method: string,
  url: URL,
  headers: Record<string, string>,
  config: R2StorageConfig,
): string {
  const region = "auto";
  const service = "s3";
  const date = headers["x-amz-date"]!;
  const dateStamp = date.slice(0, 8);

  // Canonical request
  const signedHeaderKeys = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort();
  const canonicalHeaders = signedHeaderKeys
    .map((k) => `${k}:${headers[k]!.trim()}`)
    .join("\n");
  const signedHeaders = signedHeaderKeys.join(";");
  const canonicalQueryString = [...url.searchParams]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonicalRequest = [
    method,
    url.pathname,
    canonicalQueryString,
    canonicalHeaders + "\n",
    signedHeaders,
    headers["x-amz-content-sha256"],
  ].join("\n");

  // String to sign
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    date,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  // Signing key
  const kDate = hmacSha256(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");

  const signature = createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");

  return (
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`
  );
}

/**
 * Builds multi-tenant key by prefixing with organizationId.
 *
 * @param orgId - Organization ID for tenant isolation
 * @param key - The original object key
 * @returns Prefixed key in the format `orgId/key`
 */
export function buildTenantKey(orgId: string, key: string): string {
  return `${orgId}/${key}`;
}

/**
 * Makes a signed request to the R2 S3-compatible API.
 *
 * @param config - R2 storage configuration
 * @param method - HTTP method
 * @param key - Object key within the bucket
 * @param body - Optional request body
 * @param contentType - Optional content type header
 * @returns Fetch Response
 * @throws {IntegrationError} If the request fails
 */
async function r2Request(
  config: R2StorageConfig,
  method: string,
  key: string,
  body?: Buffer | ReadableStream | null,
  contentType?: string,
): Promise<Response> {
  const endpoint = getEndpoint(config);
  const url = new URL(`/${config.bucket}/${key}`, endpoint);

  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const bodyHash =
    body instanceof Buffer ? sha256(body) : "UNSIGNED-PAYLOAD";

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": bodyHash,
  };

  if (contentType) {
    headers["content-type"] = contentType;
  }

  const authorization = signRequest(method, url, headers, config);
  headers["authorization"] = authorization;

  // Convert to a fetch-compatible body type
  let fetchBody: BodyInit | undefined;
  if (body instanceof Buffer) {
    fetchBody = new Uint8Array(body);
  } else if (body instanceof ReadableStream) {
    fetchBody = body;
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: fetchBody,
  });

  return response;
}

/**
 * Creates a StorageProvider backed by Cloudflare R2.
 *
 * @param config - R2 storage configuration
 * @returns StorageProvider implementation
 *
 * @example
 * ```ts
 * const storage = createStorageProvider({
 *   accountId: "abc123",
 *   bucket: "ordolix-uploads",
 *   accessKeyId: "key",
 *   secretAccessKey: "secret",
 * });
 * await storage.upload("org1/avatar.png", buffer, "image/png");
 * ```
 */
export function createStorageProvider(config: R2StorageConfig): StorageProvider {
  return {
    async upload(
      key: string,
      data: Buffer | ReadableStream,
      contentType: string,
    ): Promise<{ url: string }> {
      const body = data instanceof Buffer ? data : data;
      const response = await r2Request(
        config,
        "PUT",
        key,
        body as Buffer | ReadableStream,
        contentType,
      );

      if (!response.ok) {
        const text = await response.text();
        throw new IntegrationError("Cloudflare R2", `Upload failed: ${text}`, {
          key,
          statusCode: response.status,
        });
      }

      const endpoint = getEndpoint(config);
      return { url: `${endpoint}/${config.bucket}/${key}` };
    },

    async download(key: string): Promise<ReadableStream> {
      const response = await r2Request(config, "GET", key);

      if (!response.ok) {
        const text = await response.text();
        throw new IntegrationError(
          "Cloudflare R2",
          `Download failed: ${text}`,
          { key, statusCode: response.status },
        );
      }

      if (!response.body) {
        throw new IntegrationError(
          "Cloudflare R2",
          "Download returned empty body",
          { key },
        );
      }

      return response.body;
    },

    async delete(key: string): Promise<void> {
      const response = await r2Request(config, "DELETE", key);

      if (!response.ok) {
        const text = await response.text();
        throw new IntegrationError("Cloudflare R2", `Delete failed: ${text}`, {
          key,
          statusCode: response.status,
        });
      }
    },

    async getSignedUrl(key: string, expiresIn: number): Promise<string> {
      const endpoint = getEndpoint(config);
      const url = new URL(`/${config.bucket}/${key}`, endpoint);
      const region = "auto";
      const service = "s3";

      const now = new Date();
      const amzDate = now
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
      const dateStamp = amzDate.slice(0, 8);
      const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

      url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
      url.searchParams.set(
        "X-Amz-Credential",
        `${config.accessKeyId}/${credentialScope}`,
      );
      url.searchParams.set("X-Amz-Date", amzDate);
      url.searchParams.set("X-Amz-Expires", String(expiresIn));
      url.searchParams.set("X-Amz-SignedHeaders", "host");

      // Canonical request for presigned URL
      const canonicalQueryString = [...url.searchParams]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");

      const canonicalRequest = [
        "GET",
        url.pathname,
        canonicalQueryString,
        `host:${url.host}\n`,
        "host",
        "UNSIGNED-PAYLOAD",
      ].join("\n");

      const stringToSign = [
        "AWS4-HMAC-SHA256",
        amzDate,
        credentialScope,
        sha256(canonicalRequest),
      ].join("\n");

      const kDate = hmacSha256(`AWS4${config.secretAccessKey}`, dateStamp);
      const kRegion = hmacSha256(kDate, region);
      const kService = hmacSha256(kRegion, service);
      const kSigning = hmacSha256(kService, "aws4_request");

      const signature = createHmac("sha256", kSigning)
        .update(stringToSign, "utf8")
        .digest("hex");

      url.searchParams.set("X-Amz-Signature", signature);

      return url.toString();
    },
  };
}

/**
 * Lazily-initialized singleton storage provider instance.
 * Reads configuration from environment variables on first access.
 *
 * @throws {IntegrationError} If required R2 environment variables are missing
 */
let _storageProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!_storageProvider) {
    _storageProvider = createStorageProvider(resolveConfig());
  }
  return _storageProvider;
}

/** @deprecated Use getStorageProvider() for lazy initialization */
export const storageProvider = new Proxy({} as StorageProvider, {
  get(_target, prop) {
    return getStorageProvider()[prop as keyof StorageProvider];
  },
});
