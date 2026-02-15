import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getProfile,
  updateProfile,
  updateNotificationPrefs,
  createApiToken,
  revokeToken,
  listTokens,
  listUsers,
  inviteUser,
  updateUserRole,
  deactivateUser,
} from "./user-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    organizationMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    notificationPreference: {
      upsert: vi.fn(),
    },
    apiToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockUser = {
  id: USER_ID,
  name: "Test User",
  email: "test@example.com",
  locale: "en",
  timezone: "UTC",
  image: null,
  organizationMembers: [
    {
      id: "member-1",
      organizationId: ORG_ID,
      userId: USER_ID,
      role: "admin",
      organization: { id: ORG_ID, name: "Test Org" },
    },
  ],
};

// ── getProfile ───────────────────────────────────────────────────────────────

describe("getProfile", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns user with organization memberships", async () => {
    db.user.findUnique.mockResolvedValue(mockUser);

    const result = await getProfile(db, USER_ID);

    expect(result).toEqual(mockUser);
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      include: {
        organizationMembers: {
          include: { organization: true },
        },
      },
    });
  });

  it("throws NotFoundError if user not found", async () => {
    db.user.findUnique.mockResolvedValue(null);

    await expect(getProfile(db, "nonexistent")).rejects.toThrow(NotFoundError);
  });
});

// ── updateProfile ────────────────────────────────────────────────────────────

describe("updateProfile", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.user.findUnique.mockResolvedValue(mockUser);
    db.user.update.mockResolvedValue({ ...mockUser, name: "Updated Name" });
  });

  it("updates user profile fields", async () => {
    const result = await updateProfile(db, USER_ID, { name: "Updated Name" });

    expect(result.name).toBe("Updated Name");
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { name: "Updated Name" },
    });
  });

  it("maps avatarUrl to image field", async () => {
    await updateProfile(db, USER_ID, {
      avatarUrl: "https://example.com/avatar.png",
    });

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { image: "https://example.com/avatar.png" },
    });
  });

  it("throws NotFoundError if user not found", async () => {
    db.user.findUnique.mockResolvedValue(null);

    await expect(
      updateProfile(db, "nonexistent", { name: "X" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── updateNotificationPrefs ──────────────────────────────────────────────────

describe("updateNotificationPrefs", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.notificationPreference.upsert.mockResolvedValue({
      id: "pref-1",
      channels: '["email","in_app"]',
      digestFrequency: "daily",
    });
  });

  it("upserts notification preferences", async () => {
    await updateNotificationPrefs(db, ORG_ID, USER_ID, {
      emailEnabled: true,
      inAppEnabled: true,
      digestFrequency: "daily",
    });

    expect(db.notificationPreference.upsert).toHaveBeenCalled();
  });
});

// ── createApiToken ───────────────────────────────────────────────────────────

describe("createApiToken", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.apiToken.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "token-1",
      ...data,
      createdAt: new Date(),
    }));
  });

  it("creates a token with oxt_ prefix and returns plaintext", async () => {
    const result = await createApiToken(db, ORG_ID, USER_ID, {
      name: "CI Token",
    });

    expect(result.plainToken).toMatch(/^oxt_/);
    expect(result.name).toBe("CI Token");
    expect(db.apiToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        userId: USER_ID,
        name: "CI Token",
        tokenHash: expect.any(String),
        expiresAt: null,
      }),
    });
  });

  it("sets expiresAt when expiresInDays is provided", async () => {
    const before = Date.now();
    await createApiToken(db, ORG_ID, USER_ID, {
      name: "Temp Token",
      expiresInDays: 30,
    });

    const createCall = db.apiToken.create.mock.calls[0][0];
    const expiresAt = createCall.data.expiresAt as Date;
    const expectedMs = 30 * 24 * 60 * 60 * 1000;

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + expectedMs - 1000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + expectedMs + 1000);
  });

  it("stores hashed token, not plaintext", async () => {
    const result = await createApiToken(db, ORG_ID, USER_ID, {
      name: "Test",
    });

    const createCall = db.apiToken.create.mock.calls[0][0];
    expect(createCall.data.tokenHash).not.toBe(result.plainToken);
    expect(createCall.data.tokenHash).toHaveLength(64); // SHA-256 hex
  });
});

// ── revokeToken ──────────────────────────────────────────────────────────────

describe("revokeToken", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("deletes the token when it exists", async () => {
    db.apiToken.findFirst.mockResolvedValue({
      id: "token-1",
      userId: USER_ID,
      organizationId: ORG_ID,
    });
    db.apiToken.delete.mockResolvedValue({});

    await revokeToken(db, ORG_ID, USER_ID, "token-1");

    expect(db.apiToken.delete).toHaveBeenCalledWith({
      where: { id: "token-1" },
    });
  });

  it("throws NotFoundError if token not found or doesn't belong to user", async () => {
    db.apiToken.findFirst.mockResolvedValue(null);

    await expect(
      revokeToken(db, ORG_ID, USER_ID, "nonexistent"),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── listTokens ───────────────────────────────────────────────────────────────

describe("listTokens", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns token summaries with last4 chars", async () => {
    db.apiToken.findMany.mockResolvedValue([
      {
        id: "token-1",
        name: "CI Token",
        tokenHash: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        createdAt: new Date("2026-01-01"),
        expiresAt: null,
        lastUsedAt: null,
      },
    ]);

    const result = await listTokens(db, ORG_ID, USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0]!.last4).toBe("7890");
    expect(result[0]!.name).toBe("CI Token");
    expect(result[0]!).not.toHaveProperty("tokenHash");
  });
});

// ── listUsers ────────────────────────────────────────────────────────────────

describe("listUsers", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.organizationMember.findMany.mockResolvedValue([]);
    db.organizationMember.count.mockResolvedValue(0);
  });

  it("returns items and total", async () => {
    const mockMembers = [{ id: "m-1", user: { name: "Alice" } }];
    db.organizationMember.findMany.mockResolvedValue(mockMembers);
    db.organizationMember.count.mockResolvedValue(1);

    const result = await listUsers(db, ORG_ID, { limit: 50 });

    expect(result.items).toEqual(mockMembers);
    expect(result.total).toBe(1);
  });

  it("filters by search on name/email", async () => {
    await listUsers(db, ORG_ID, { limit: 50, search: "alice" });

    expect(db.organizationMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user: {
            OR: [
              { name: { contains: "alice", mode: "insensitive" } },
              { email: { contains: "alice", mode: "insensitive" } },
            ],
          },
        }),
      }),
    );
  });

  it("applies cursor pagination", async () => {
    await listUsers(db, ORG_ID, { limit: 10, cursor: "cursor-1" });

    expect(db.organizationMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        cursor: { id: "cursor-1" },
      }),
    );
  });
});

// ── inviteUser ───────────────────────────────────────────────────────────────

describe("inviteUser", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({
      id: "new-user-1",
      email: "new@example.com",
      name: null,
    });
    db.organizationMember.findUnique.mockResolvedValue(null);
    db.organizationMember.create.mockResolvedValue({
      id: "member-new",
      organizationId: ORG_ID,
      userId: "new-user-1",
      role: "member",
      user: { id: "new-user-1", email: "new@example.com" },
    });
    db.auditLog.create.mockResolvedValue({});
  });

  it("creates a new user and membership", async () => {
    const result = await inviteUser(db, ORG_ID, USER_ID, {
      email: "new@example.com",
    });

    expect(result.userId).toBe("new-user-1");
    expect(db.user.create).toHaveBeenCalled();
    expect(db.organizationMember.create).toHaveBeenCalled();
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "INVITED",
        entityType: "User",
      }),
    });
  });

  it("throws ValidationError if user already a member", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "existing-user",
      email: "existing@example.com",
    });
    db.organizationMember.findUnique.mockResolvedValue({
      id: "member-existing",
    });

    await expect(
      inviteUser(db, ORG_ID, USER_ID, { email: "existing@example.com" }),
    ).rejects.toThrow(ValidationError);
  });
});

// ── updateUserRole ───────────────────────────────────────────────────────────

describe("updateUserRole", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("updates the member role", async () => {
    db.organizationMember.findUnique.mockResolvedValue({
      id: "member-1",
      role: "member",
    });
    db.organizationMember.update.mockResolvedValue({
      id: "member-1",
      role: "admin",
      user: { id: USER_ID },
    });

    const result = await updateUserRole(db, ORG_ID, {
      userId: USER_ID,
      roleId: "admin",
    });

    expect(result.role).toBe("admin");
    expect(db.organizationMember.update).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { role: "admin" },
      include: { user: true },
    });
  });

  it("throws NotFoundError if membership not found", async () => {
    db.organizationMember.findUnique.mockResolvedValue(null);

    await expect(
      updateUserRole(db, ORG_ID, { userId: "nonexistent", roleId: "admin" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deactivateUser ───────────────────────────────────────────────────────────

describe("deactivateUser", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.organizationMember.findUnique.mockResolvedValue({
      id: "member-1",
      organizationId: ORG_ID,
      userId: "target-user",
    });
    db.organizationMember.delete.mockResolvedValue({});
    db.auditLog.create.mockResolvedValue({});
  });

  it("removes the organization membership", async () => {
    await deactivateUser(db, ORG_ID, USER_ID, { userId: "target-user" });

    expect(db.organizationMember.delete).toHaveBeenCalledWith({
      where: { id: "member-1" },
    });
  });

  it("creates an audit log entry", async () => {
    await deactivateUser(db, ORG_ID, USER_ID, { userId: "target-user" });

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "DEACTIVATED",
        entityType: "User",
        entityId: "target-user",
      }),
    });
  });

  it("throws NotFoundError if membership not found", async () => {
    db.organizationMember.findUnique.mockResolvedValue(null);

    await expect(
      deactivateUser(db, ORG_ID, USER_ID, { userId: "nonexistent" }),
    ).rejects.toThrow(NotFoundError);
  });
});
