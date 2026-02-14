/**
 * Provider barrel exports.
 *
 * Re-exports all provider implementations, factory functions, and types
 * for convenient imports throughout the application.
 *
 * @module providers
 */

// Types
export type {
  StorageProvider,
  EmailProvider,
  RealTimeProvider,
  CacheProvider,
} from "./types";

// Storage (Cloudflare R2)
export {
  createStorageProvider,
  getStorageProvider,
  storageProvider,
  buildTenantKey,
} from "./storage";
export type { R2StorageConfig } from "./storage";

// Email (Resend)
export {
  createEmailProvider,
  getEmailProvider,
  emailProvider,
} from "./email";
export type { ResendEmailConfig } from "./email";

// Real-time (SSE)
export {
  createRealTimeProvider,
  realtimeProvider,
  createSSEStream,
  validateToken,
} from "./realtime";

// Cache (Upstash Redis)
export { createCacheProvider, cacheProvider } from "./cache";
