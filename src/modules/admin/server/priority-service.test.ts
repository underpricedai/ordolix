import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  listPriorities,
  createPriority,
  updatePriority,
  deletePriority,
  reorderPriorities,
} from "./priority-service";
import { NotFoundError, ConflictError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    priority: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    issue: {
      count: vi.fn(),
    },
    $transaction: vi.fn(async (updates: unknown[]) => updates),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";

// ── listPriorities ───────────────────────────────────────────────────────────

describe("listPriorities", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns priorities ordered by rank", async () => {
    const mockPriorities = [
      { id: "p1", name: "Critical", rank: 1 },
      { id: "p2", name: "High", rank: 2 },
      { id: "p3", name: "Medium", rank: 3 },
    ];
    db.priority.findMany.mockResolvedValue(mockPriorities);

    const result = await listPriorities(db, ORG_ID);

    expect(result).toEqual(mockPriorities);
    expect(db.priority.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID },
      orderBy: { rank: "asc" },
    });
  });
});

// ── createPriority ───────────────────────────────────────────────────────────

describe("createPriority", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("creates a priority with provided values", async () => {
    const created = { id: "p1", organizationId: ORG_ID, name: "Urgent", rank: 1, color: "#ff0000", slaMultiplier: 2.0 };
    db.priority.create.mockResolvedValue(created);

    const result = await createPriority(db, ORG_ID, {
      name: "Urgent",
      rank: 1,
      color: "#ff0000",
      slaMultiplier: 2.0,
    });

    expect(result).toEqual(created);
    expect(db.priority.create).toHaveBeenCalledWith({
      data: { organizationId: ORG_ID, name: "Urgent", rank: 1, color: "#ff0000", slaMultiplier: 2.0 },
    });
  });

  it("defaults slaMultiplier to 1.0 when not provided", async () => {
    db.priority.create.mockResolvedValue({ id: "p1" });

    await createPriority(db, ORG_ID, { name: "Low", rank: 5, color: "#00ff00" });

    expect(db.priority.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slaMultiplier: 1.0 }),
    });
  });
});

// ── updatePriority ───────────────────────────────────────────────────────────

describe("updatePriority", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("updates an existing priority", async () => {
    db.priority.findFirst.mockResolvedValue({ id: "p1", organizationId: ORG_ID, name: "High" });
    db.priority.update.mockResolvedValue({ id: "p1", name: "Critical", color: "#ff0000" });

    const result = await updatePriority(db, ORG_ID, "p1", { name: "Critical", color: "#ff0000" });

    expect(result.name).toBe("Critical");
    expect(db.priority.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { name: "Critical", color: "#ff0000" },
    });
  });

  it("throws NotFoundError when priority does not exist", async () => {
    db.priority.findFirst.mockResolvedValue(null);

    await expect(
      updatePriority(db, ORG_ID, "nonexistent", { name: "New" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deletePriority ───────────────────────────────────────────────────────────

describe("deletePriority", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("deletes a priority with no issues", async () => {
    db.priority.findFirst.mockResolvedValue({ id: "p1", organizationId: ORG_ID });
    db.issue.count.mockResolvedValue(0);

    await deletePriority(db, ORG_ID, "p1");

    expect(db.priority.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("throws NotFoundError when priority does not exist", async () => {
    db.priority.findFirst.mockResolvedValue(null);

    await expect(
      deletePriority(db, ORG_ID, "nonexistent"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError when priority is in use by issues", async () => {
    db.priority.findFirst.mockResolvedValue({ id: "p1", organizationId: ORG_ID });
    db.issue.count.mockResolvedValue(5);

    await expect(
      deletePriority(db, ORG_ID, "p1"),
    ).rejects.toThrow(ConflictError);
  });
});

// ── reorderPriorities ────────────────────────────────────────────────────────

describe("reorderPriorities", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("updates ranks based on ordered IDs", async () => {
    const orderedIds = ["p3", "p1", "p2"];
    db.priority.update.mockResolvedValue({});

    await reorderPriorities(db, ORG_ID, orderedIds);

    expect(db.$transaction).toHaveBeenCalledWith([
      db.priority.update({ where: { id: "p3" }, data: { rank: 1 } }),
      db.priority.update({ where: { id: "p1" }, data: { rank: 2 } }),
      db.priority.update({ where: { id: "p2" }, data: { rank: 3 } }),
    ]);
  });
});
