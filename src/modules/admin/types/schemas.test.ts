import { describe, expect, it } from "vitest";
import {
  getDashboardStatsInput,
  listAuditLogInput,
  listWebhooksInput,
  createWebhookInput,
  updateWebhookInput,
  deleteWebhookInput,
  systemHealthInput,
} from "./schemas";

describe("getDashboardStatsInput", () => {
  it("accepts empty object", () => {
    const result = getDashboardStatsInput.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("listAuditLogInput", () => {
  it("accepts empty object with defaults", () => {
    const result = listAuditLogInput.parse({});
    expect(result.limit).toBe(50);
  });

  it("accepts all filter params", () => {
    const result = listAuditLogInput.safeParse({
      cursor: "cursor-abc",
      limit: 25,
      action: "CREATED",
      userId: "user-1",
      entityType: "Issue",
      startDate: "2026-01-01",
      endDate: "2026-02-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects limit below 1", () => {
    const result = listAuditLogInput.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects limit above 100", () => {
    const result = listAuditLogInput.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it("coerces date strings to Date objects", () => {
    const result = listAuditLogInput.parse({
      startDate: "2026-01-15",
      endDate: "2026-02-15",
    });
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
  });
});

describe("listWebhooksInput", () => {
  it("accepts empty object with defaults", () => {
    const result = listWebhooksInput.parse({});
    expect(result.limit).toBe(50);
  });

  it("accepts cursor and limit", () => {
    const result = listWebhooksInput.safeParse({
      cursor: "wh-abc",
      limit: 10,
    });
    expect(result.success).toBe(true);
  });
});

describe("createWebhookInput", () => {
  it("accepts valid webhook input", () => {
    const result = createWebhookInput.safeParse({
      url: "https://example.com/webhook",
      events: ["issue.created"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL", () => {
    const result = createWebhookInput.safeParse({
      url: "not-a-url",
      events: ["issue.created"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty events array", () => {
    const result = createWebhookInput.safeParse({
      url: "https://example.com/webhook",
      events: [],
    });
    expect(result.success).toBe(false);
  });

  it("defaults isActive to true", () => {
    const result = createWebhookInput.parse({
      url: "https://example.com/webhook",
      events: ["issue.created"],
    });
    expect(result.isActive).toBe(true);
  });

  it("accepts optional secret and isActive", () => {
    const result = createWebhookInput.safeParse({
      url: "https://example.com/webhook",
      events: ["issue.created", "issue.updated"],
      secret: "my-secret",
      isActive: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.secret).toBe("my-secret");
      expect(result.data.isActive).toBe(false);
    }
  });
});

describe("updateWebhookInput", () => {
  it("accepts id with partial updates", () => {
    const result = updateWebhookInput.safeParse({
      id: "wh-1",
      url: "https://example.com/new-url",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = updateWebhookInput.safeParse({
      url: "https://example.com/webhook",
    });
    expect(result.success).toBe(false);
  });

  it("accepts id-only update", () => {
    const result = updateWebhookInput.safeParse({ id: "wh-1" });
    expect(result.success).toBe(true);
  });
});

describe("deleteWebhookInput", () => {
  it("accepts valid id", () => {
    const result = deleteWebhookInput.safeParse({ id: "wh-1" });
    expect(result.success).toBe(true);
  });

  it("rejects empty id", () => {
    const result = deleteWebhookInput.safeParse({ id: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing id", () => {
    const result = deleteWebhookInput.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("systemHealthInput", () => {
  it("accepts empty object", () => {
    const result = systemHealthInput.safeParse({});
    expect(result.success).toBe(true);
  });
});
