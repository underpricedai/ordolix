import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createNotification,
  listNotifications,
  markRead,
  markAllRead,
  getUnreadCount,
  updatePreference,
  listPreferences,
  deleteNotification,
} from "./notification-service";
import { NotFoundError } from "@/server/lib/errors";

function createMockDb() {
  return {
    notificationRecord: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    notificationPreference: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockNotification = {
  id: "notif-1",
  organizationId: ORG_ID,
  userId: USER_ID,
  event: "issue_assigned",
  title: "You were assigned an issue",
  body: "",
  issueId: "issue-1",
  isRead: false,
  readAt: null,
  metadata: null,
  channel: "in_app",
  sentAt: new Date(),
};

const mockPreference = {
  id: "pref-1",
  organizationId: ORG_ID,
  userId: USER_ID,
  event: "issue_assigned",
  channels: '["both"]',
};

// -- createNotification -------------------------------------------------------

describe("createNotification", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.notificationRecord.create.mockResolvedValue(mockNotification);
  });

  it("creates a notification", async () => {
    const result = await createNotification(db, ORG_ID, {
      userId: USER_ID,
      type: "issue_assigned",
      title: "You were assigned an issue",
      issueId: "issue-1",
    });

    expect(result.id).toBe("notif-1");
    expect(db.notificationRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        userId: USER_ID,
        event: "issue_assigned",
        title: "You were assigned an issue",
        issueId: "issue-1",
      }),
    });
  });

  it("creates a notification with optional fields", async () => {
    await createNotification(db, ORG_ID, {
      userId: USER_ID,
      type: "comment_added",
      title: "New comment",
      body: "Someone commented",
      metadata: { commentId: "c-1" },
    });

    expect(db.notificationRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        body: "Someone commented",
        metadata: { commentId: "c-1" },
      }),
    });
  });
});

// -- listNotifications --------------------------------------------------------

describe("listNotifications", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.notificationRecord.findMany.mockResolvedValue([mockNotification]);
  });

  it("returns notifications for user ordered by sentAt desc", async () => {
    const result = await listNotifications(db, ORG_ID, USER_ID, { limit: 50 });

    expect(result).toHaveLength(1);
    expect(db.notificationRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID, userId: USER_ID },
        orderBy: { sentAt: "desc" },
        take: 50,
      }),
    );
  });

  it("filters by isRead when provided", async () => {
    await listNotifications(db, ORG_ID, USER_ID, { isRead: false, limit: 50 });

    expect(db.notificationRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID, userId: USER_ID, isRead: false },
      }),
    );
  });

  it("applies cursor pagination", async () => {
    await listNotifications(db, ORG_ID, USER_ID, {
      limit: 10,
      cursor: "notif-0",
    });

    expect(db.notificationRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 1,
        cursor: { id: "notif-0" },
      }),
    );
  });
});

// -- markRead -----------------------------------------------------------------

describe("markRead", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.notificationRecord.findFirst.mockResolvedValue(mockNotification);
    db.notificationRecord.update.mockResolvedValue({
      ...mockNotification,
      isRead: true,
      readAt: new Date(),
    });
  });

  it("marks a notification as read", async () => {
    const result = await markRead(db, ORG_ID, USER_ID, "notif-1");

    expect(result.isRead).toBe(true);
    expect(db.notificationRecord.update).toHaveBeenCalledWith({
      where: { id: "notif-1" },
      data: expect.objectContaining({
        isRead: true,
        readAt: expect.any(Date),
      }),
    });
  });

  it("throws NotFoundError if notification not found", async () => {
    db.notificationRecord.findFirst.mockResolvedValue(null);

    await expect(
      markRead(db, ORG_ID, USER_ID, "nope"),
    ).rejects.toThrow(NotFoundError);
  });
});

// -- markAllRead --------------------------------------------------------------

describe("markAllRead", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.notificationRecord.updateMany.mockResolvedValue({ count: 3 });
  });

  it("marks all unread notifications as read", async () => {
    const result = await markAllRead(db, ORG_ID, USER_ID);

    expect(result.count).toBe(3);
    expect(db.notificationRecord.updateMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, userId: USER_ID, isRead: false },
      data: expect.objectContaining({
        isRead: true,
        readAt: expect.any(Date),
      }),
    });
  });
});

// -- getUnreadCount -----------------------------------------------------------

describe("getUnreadCount", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.notificationRecord.count.mockResolvedValue(5);
  });

  it("returns unread count for user", async () => {
    const result = await getUnreadCount(db, ORG_ID, USER_ID);

    expect(result).toBe(5);
    expect(db.notificationRecord.count).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, userId: USER_ID, isRead: false },
    });
  });
});

// -- updatePreference ---------------------------------------------------------

describe("updatePreference", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.notificationPreference.upsert.mockResolvedValue(mockPreference);
  });

  it("upserts a notification preference", async () => {
    const result = await updatePreference(db, ORG_ID, USER_ID, {
      eventType: "issue_assigned",
      channel: "both",
    });

    expect(result.event).toBe("issue_assigned");
    expect(db.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          organizationId: ORG_ID,
          userId: USER_ID,
          event: "issue_assigned",
        }),
      }),
    );
  });
});

// -- listPreferences ----------------------------------------------------------

describe("listPreferences", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.notificationPreference.findMany.mockResolvedValue([mockPreference]);
  });

  it("returns all preferences for user", async () => {
    const result = await listPreferences(db, ORG_ID, USER_ID);

    expect(result).toHaveLength(1);
    expect(db.notificationPreference.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, userId: USER_ID },
    });
  });
});

// -- deleteNotification -------------------------------------------------------

describe("deleteNotification", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.notificationRecord.findFirst.mockResolvedValue(mockNotification);
    db.notificationRecord.delete.mockResolvedValue(mockNotification);
  });

  it("deletes a notification", async () => {
    await deleteNotification(db, ORG_ID, USER_ID, "notif-1");

    expect(db.notificationRecord.delete).toHaveBeenCalledWith({
      where: { id: "notif-1" },
    });
  });

  it("throws NotFoundError if notification not found", async () => {
    db.notificationRecord.findFirst.mockResolvedValue(null);

    await expect(
      deleteNotification(db, ORG_ID, USER_ID, "nope"),
    ).rejects.toThrow(NotFoundError);
  });
});
