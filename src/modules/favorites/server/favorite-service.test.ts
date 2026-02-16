import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  toggleFavorite,
  listFavorites,
  isFavorited,
} from "./favorite-service";

// -- Mock Helpers -------------------------------------------------------------

function createMockDb() {
  return {
    favorite: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockFavorite = {
  id: "fav-1",
  organizationId: ORG_ID,
  userId: USER_ID,
  entityType: "issue",
  entityId: "issue-1",
  createdAt: new Date("2026-02-15T00:00:00Z"),
};

// -- toggleFavorite -----------------------------------------------------------

describe("toggleFavorite", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("creates a favorite when one does not exist", async () => {
    db.favorite.findUnique.mockResolvedValue(null);
    db.favorite.create.mockResolvedValue(mockFavorite);

    const result = await toggleFavorite(db, ORG_ID, USER_ID, "issue", "issue-1");

    expect(result).toEqual({ favorited: true });
    expect(db.favorite.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_ID,
        userId: USER_ID,
        entityType: "issue",
        entityId: "issue-1",
      },
    });
  });

  it("deletes a favorite when one already exists", async () => {
    db.favorite.findUnique.mockResolvedValue(mockFavorite);
    db.favorite.delete.mockResolvedValue({});

    const result = await toggleFavorite(db, ORG_ID, USER_ID, "issue", "issue-1");

    expect(result).toEqual({ favorited: false });
    expect(db.favorite.delete).toHaveBeenCalledWith({
      where: { id: "fav-1" },
    });
  });

  it("looks up by unique compound key", async () => {
    db.favorite.findUnique.mockResolvedValue(null);
    db.favorite.create.mockResolvedValue(mockFavorite);

    await toggleFavorite(db, ORG_ID, USER_ID, "project", "proj-1");

    expect(db.favorite.findUnique).toHaveBeenCalledWith({
      where: {
        userId_entityType_entityId: {
          userId: USER_ID,
          entityType: "project",
          entityId: "proj-1",
        },
      },
    });
  });
});

// -- listFavorites ------------------------------------------------------------

describe("listFavorites", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns all favorites for a user", async () => {
    db.favorite.findMany.mockResolvedValue([mockFavorite]);

    const result = await listFavorites(db, ORG_ID, USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockFavorite);
  });

  it("returns empty array when no favorites exist", async () => {
    db.favorite.findMany.mockResolvedValue([]);

    const result = await listFavorites(db, ORG_ID, USER_ID);

    expect(result).toEqual([]);
  });

  it("filters by entityType when provided", async () => {
    db.favorite.findMany.mockResolvedValue([]);

    await listFavorites(db, ORG_ID, USER_ID, "board");

    expect(db.favorite.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        userId: USER_ID,
        entityType: "board",
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("does not filter by entityType when omitted", async () => {
    db.favorite.findMany.mockResolvedValue([]);

    await listFavorites(db, ORG_ID, USER_ID);

    expect(db.favorite.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        userId: USER_ID,
      },
      orderBy: { createdAt: "desc" },
    });
  });
});

// -- isFavorited --------------------------------------------------------------

describe("isFavorited", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns true when entity is favorited", async () => {
    db.favorite.count.mockResolvedValue(1);

    const result = await isFavorited(db, USER_ID, "dashboard", "dash-1");

    expect(result).toBe(true);
  });

  it("returns false when entity is not favorited", async () => {
    db.favorite.count.mockResolvedValue(0);

    const result = await isFavorited(db, USER_ID, "dashboard", "dash-1");

    expect(result).toBe(false);
  });

  it("queries with correct filters", async () => {
    db.favorite.count.mockResolvedValue(0);

    await isFavorited(db, USER_ID, "issue", "issue-42");

    expect(db.favorite.count).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        entityType: "issue",
        entityId: "issue-42",
      },
    });
  });
});
