import { describe, expect, it } from "vitest";
import {
  createNotificationInput,
  listNotificationsInput,
  markReadInput,
  markAllReadInput,
  updatePreferenceInput,
  listPreferencesInput,
  notificationTypeEnum,
  channelEnum,
} from "./schemas";

describe("notificationTypeEnum", () => {
  it("accepts valid notification types", () => {
    expect(notificationTypeEnum.safeParse("issue_assigned").success).toBe(true);
    expect(notificationTypeEnum.safeParse("comment_added").success).toBe(true);
    expect(notificationTypeEnum.safeParse("status_changed").success).toBe(true);
    expect(notificationTypeEnum.safeParse("mention").success).toBe(true);
    expect(notificationTypeEnum.safeParse("sla_warning").success).toBe(true);
    expect(notificationTypeEnum.safeParse("approval_requested").success).toBe(true);
  });

  it("rejects invalid notification type", () => {
    expect(notificationTypeEnum.safeParse("invalid_type").success).toBe(false);
  });
});

describe("channelEnum", () => {
  it("accepts valid channels", () => {
    expect(channelEnum.safeParse("in_app").success).toBe(true);
    expect(channelEnum.safeParse("email").success).toBe(true);
    expect(channelEnum.safeParse("both").success).toBe(true);
    expect(channelEnum.safeParse("none").success).toBe(true);
  });

  it("rejects invalid channel", () => {
    expect(channelEnum.safeParse("sms").success).toBe(false);
  });
});

describe("createNotificationInput", () => {
  it("accepts valid input", () => {
    const result = createNotificationInput.safeParse({
      userId: "user-1",
      type: "issue_assigned",
      title: "You were assigned an issue",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing userId", () => {
    const result = createNotificationInput.safeParse({
      type: "issue_assigned",
      title: "You were assigned an issue",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = createNotificationInput.safeParse({
      userId: "user-1",
      type: "issue_assigned",
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title over 255 chars", () => {
    const result = createNotificationInput.safeParse({
      userId: "user-1",
      type: "issue_assigned",
      title: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional body, issueId, and metadata", () => {
    const result = createNotificationInput.safeParse({
      userId: "user-1",
      type: "comment_added",
      title: "New comment",
      body: "Someone commented on your issue",
      issueId: "issue-1",
      metadata: { commentId: "comment-1" },
    });
    expect(result.success).toBe(true);
  });
});

describe("listNotificationsInput", () => {
  it("defaults limit to 50", () => {
    const result = listNotificationsInput.parse({});
    expect(result.limit).toBe(50);
  });

  it("accepts isRead filter", () => {
    const result = listNotificationsInput.safeParse({ isRead: false });
    expect(result.success).toBe(true);
  });
});

describe("markReadInput", () => {
  it("accepts valid id", () => {
    const result = markReadInput.safeParse({ id: "notif-1" });
    expect(result.success).toBe(true);
  });

  it("rejects empty id", () => {
    const result = markReadInput.safeParse({ id: "" });
    expect(result.success).toBe(false);
  });
});

describe("markAllReadInput", () => {
  it("accepts empty object", () => {
    const result = markAllReadInput.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("updatePreferenceInput", () => {
  it("accepts valid input", () => {
    const result = updatePreferenceInput.safeParse({
      eventType: "issue_assigned",
      channel: "both",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid eventType", () => {
    const result = updatePreferenceInput.safeParse({
      eventType: "invalid",
      channel: "both",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid channel", () => {
    const result = updatePreferenceInput.safeParse({
      eventType: "issue_assigned",
      channel: "push",
    });
    expect(result.success).toBe(false);
  });
});

describe("listPreferencesInput", () => {
  it("accepts empty object", () => {
    const result = listPreferencesInput.safeParse({});
    expect(result.success).toBe(true);
  });
});
