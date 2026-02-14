/** Abstract storage provider for file uploads (R2, Azure Blob, local fs) */
export interface StorageProvider {
  upload(key: string, data: Buffer | ReadableStream, contentType: string): Promise<{ url: string }>;
  download(key: string): Promise<ReadableStream>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}

/** Abstract email provider (Resend, Azure Communication Services, SMTP) */
export interface EmailProvider {
  send(options: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
    replyTo?: string;
  }): Promise<{ id: string }>;
}

/** Abstract real-time provider (Ably, SSE, Azure SignalR) */
export interface RealTimeProvider {
  publish(channel: string, event: string, data: unknown): Promise<void>;
  createToken(userId: string, channels: string[]): Promise<string>;
}

/** Abstract cache provider (Upstash Redis, Azure Redis, in-memory) */
export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}
