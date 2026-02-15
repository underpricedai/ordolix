import { describe, expect, it } from "vitest";
import {
  updateProfileInput,
  updateNotificationPrefsInput,
  createApiTokenInput,
  revokeApiTokenInput,
  listApiTokensInput,
  listUsersInput,
  inviteUserInput,
  updateUserRoleInput,
  deactivateUserInput,
} from "./schemas";

describe("updateProfileInput", () => {
  it("accepts valid partial input", () => {
    const result = updateProfileInput.safeParse({ name: "Frank" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    const result = updateProfileInput.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts full input", () => {
    const result = updateProfileInput.safeParse({
      name: "Frank",
      email: "frank@example.com",
      avatarUrl: "https://example.com/avatar.png",
      timezone: "America/New_York",
      locale: "en",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = updateProfileInput.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid avatarUrl", () => {
    const result = updateProfileInput.safeParse({ avatarUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("allows null avatarUrl", () => {
    const result = updateProfileInput.safeParse({ avatarUrl: null });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = updateProfileInput.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("updateNotificationPrefsInput", () => {
  it("accepts valid input", () => {
    const result = updateNotificationPrefsInput.safeParse({
      emailEnabled: true,
      slackEnabled: false,
      inAppEnabled: true,
      digestFrequency: "daily",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateNotificationPrefsInput.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid digestFrequency", () => {
    const result = updateNotificationPrefsInput.safeParse({
      digestFrequency: "monthly",
    });
    expect(result.success).toBe(false);
  });
});

describe("createApiTokenInput", () => {
  it("accepts valid input with name only", () => {
    const result = createApiTokenInput.safeParse({ name: "CI/CD Pipeline" });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with expiry", () => {
    const result = createApiTokenInput.safeParse({
      name: "CI/CD Pipeline",
      expiresInDays: 30,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createApiTokenInput.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects negative expiresInDays", () => {
    const result = createApiTokenInput.safeParse({
      name: "Token",
      expiresInDays: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer expiresInDays", () => {
    const result = createApiTokenInput.safeParse({
      name: "Token",
      expiresInDays: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("revokeApiTokenInput", () => {
  it("accepts valid tokenId", () => {
    const result = revokeApiTokenInput.safeParse({ tokenId: "token-1" });
    expect(result.success).toBe(true);
  });

  it("rejects empty tokenId", () => {
    const result = revokeApiTokenInput.safeParse({ tokenId: "" });
    expect(result.success).toBe(false);
  });
});

describe("listApiTokensInput", () => {
  it("accepts empty object", () => {
    const result = listApiTokensInput.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("listUsersInput", () => {
  it("accepts empty object with defaults", () => {
    const result = listUsersInput.parse({});
    expect(result.limit).toBe(50);
  });

  it("accepts all params", () => {
    const result = listUsersInput.safeParse({
      cursor: "cursor-1",
      limit: 25,
      search: "frank",
      role: "admin",
    });
    expect(result.success).toBe(true);
  });

  it("rejects limit above 100", () => {
    const result = listUsersInput.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects limit below 1", () => {
    const result = listUsersInput.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });
});

describe("inviteUserInput", () => {
  it("accepts valid email", () => {
    const result = inviteUserInput.safeParse({ email: "new@example.com" });
    expect(result.success).toBe(true);
  });

  it("accepts email with name and role", () => {
    const result = inviteUserInput.safeParse({
      email: "new@example.com",
      name: "New User",
      roleId: "role-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = inviteUserInput.safeParse({ email: "bad-email" });
    expect(result.success).toBe(false);
  });
});

describe("updateUserRoleInput", () => {
  it("accepts valid input", () => {
    const result = updateUserRoleInput.safeParse({
      userId: "user-1",
      roleId: "admin",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing userId", () => {
    const result = updateUserRoleInput.safeParse({ roleId: "admin" });
    expect(result.success).toBe(false);
  });

  it("rejects missing roleId", () => {
    const result = updateUserRoleInput.safeParse({ userId: "user-1" });
    expect(result.success).toBe(false);
  });
});

describe("deactivateUserInput", () => {
  it("accepts valid userId", () => {
    const result = deactivateUserInput.safeParse({ userId: "user-1" });
    expect(result.success).toBe(true);
  });

  it("rejects empty userId", () => {
    const result = deactivateUserInput.safeParse({ userId: "" });
    expect(result.success).toBe(false);
  });
});
