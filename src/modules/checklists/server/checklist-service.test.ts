import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createChecklist,
  getChecklists,
  updateChecklist,
  deleteChecklist,
  addItem,
  updateItem,
  deleteItem,
} from "./checklist-service";
import { NotFoundError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    issue: { findFirst: vi.fn() },
    checklist: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    checklistItem: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";

const mockIssue = {
  id: "issue-1",
  organizationId: ORG_ID,
  summary: "Test Issue",
};

const mockChecklist = {
  id: "cl-1",
  organizationId: ORG_ID,
  issueId: "issue-1",
  title: "Checklist",
  position: 0,
};

const mockChecklistWithItems = {
  ...mockChecklist,
  items: [
    { id: "item-1", checklistId: "cl-1", text: "Step 1", isChecked: false, position: 0 },
    { id: "item-2", checklistId: "cl-1", text: "Step 2", isChecked: true, position: 1 },
  ],
};

const mockItem = {
  id: "item-1",
  checklistId: "cl-1",
  text: "Do something",
  isChecked: false,
  assigneeId: null,
  dueDate: null,
  position: 0,
};

// ── createChecklist ──────────────────────────────────────────────────────────

describe("createChecklist", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue(mockIssue);
    db.checklist.create.mockResolvedValue(mockChecklist);
  });

  it("creates checklist for a valid issue", async () => {
    await createChecklist(db, ORG_ID, { issueId: "issue-1" });

    expect(db.checklist.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        issueId: "issue-1",
        title: "Checklist",
        position: 0,
      }),
    });
  });

  it("uses provided title and position", async () => {
    await createChecklist(db, ORG_ID, {
      issueId: "issue-1",
      title: "Release Steps",
      position: 2,
    });

    expect(db.checklist.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Release Steps",
        position: 2,
      }),
    });
  });

  it("throws NotFoundError if issue not in org", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await expect(
      createChecklist(db, ORG_ID, { issueId: "nope" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("scopes issue lookup to organization", async () => {
    await createChecklist(db, ORG_ID, { issueId: "issue-1" });

    expect(db.issue.findFirst).toHaveBeenCalledWith({
      where: { id: "issue-1", organizationId: ORG_ID },
    });
  });
});

// ── getChecklists ────────────────────────────────────────────────────────────

describe("getChecklists", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns checklists with items for an issue", async () => {
    db.checklist.findMany.mockResolvedValue([mockChecklistWithItems]);

    const result = await getChecklists(db, ORG_ID, "issue-1");

    expect(result).toHaveLength(1);
    expect(result[0]!.items).toHaveLength(2);
  });

  it("returns empty array when no checklists exist", async () => {
    db.checklist.findMany.mockResolvedValue([]);

    const result = await getChecklists(db, ORG_ID, "issue-1");
    expect(result).toEqual([]);
  });

  it("scopes query to organization and issue", async () => {
    db.checklist.findMany.mockResolvedValue([]);

    await getChecklists(db, ORG_ID, "issue-1");

    expect(db.checklist.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, issueId: "issue-1" },
      include: {
        items: { orderBy: { position: "asc" } },
      },
      orderBy: { position: "asc" },
    });
  });
});

// ── updateChecklist ──────────────────────────────────────────────────────────

describe("updateChecklist", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.checklist.findFirst.mockResolvedValue(mockChecklist);
    db.checklist.update.mockResolvedValue({ ...mockChecklist, title: "Renamed" });
  });

  it("updates checklist fields", async () => {
    const result = await updateChecklist(db, ORG_ID, "cl-1", {
      title: "Renamed",
    });

    expect(result.title).toBe("Renamed");
    expect(db.checklist.update).toHaveBeenCalledWith({
      where: { id: "cl-1" },
      data: { title: "Renamed" },
    });
  });

  it("throws NotFoundError when not found", async () => {
    db.checklist.findFirst.mockResolvedValue(null);

    await expect(
      updateChecklist(db, ORG_ID, "nope", { title: "X" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteChecklist ──────────────────────────────────────────────────────────

describe("deleteChecklist", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.checklist.findFirst.mockResolvedValue(mockChecklist);
    db.checklist.delete.mockResolvedValue({});
  });

  it("deletes checklist", async () => {
    await deleteChecklist(db, ORG_ID, "cl-1");

    expect(db.checklist.delete).toHaveBeenCalledWith({
      where: { id: "cl-1" },
    });
  });

  it("throws NotFoundError when not found", async () => {
    db.checklist.findFirst.mockResolvedValue(null);

    await expect(deleteChecklist(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── addItem ──────────────────────────────────────────────────────────────────

describe("addItem", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.checklist.findFirst.mockResolvedValue(mockChecklist);
    db.checklistItem.create.mockResolvedValue(mockItem);
  });

  it("creates item for a valid checklist", async () => {
    await addItem(db, ORG_ID, {
      checklistId: "cl-1",
      text: "Do something",
    });

    expect(db.checklistItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        checklistId: "cl-1",
        text: "Do something",
        assigneeId: null,
        dueDate: null,
        position: 0,
      }),
    });
  });

  it("creates item with optional fields", async () => {
    const dueDate = new Date("2026-03-01T00:00:00Z");
    await addItem(db, ORG_ID, {
      checklistId: "cl-1",
      text: "Review PR",
      assigneeId: "user-1",
      dueDate,
      position: 3,
    });

    expect(db.checklistItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assigneeId: "user-1",
        dueDate,
        position: 3,
      }),
    });
  });

  it("throws NotFoundError if checklist not in org", async () => {
    db.checklist.findFirst.mockResolvedValue(null);

    await expect(
      addItem(db, ORG_ID, { checklistId: "nope", text: "Item" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── updateItem ───────────────────────────────────────────────────────────────

describe("updateItem", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.checklistItem.findFirst.mockResolvedValue(mockItem);
    db.checklistItem.update.mockResolvedValue({ ...mockItem, isChecked: true });
  });

  it("updates item fields", async () => {
    const result = await updateItem(db, ORG_ID, "item-1", {
      isChecked: true,
    });

    expect(result.isChecked).toBe(true);
    expect(db.checklistItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { isChecked: true },
    });
  });

  it("scopes lookup via checklist organizationId", async () => {
    await updateItem(db, ORG_ID, "item-1", { text: "Updated" });

    expect(db.checklistItem.findFirst).toHaveBeenCalledWith({
      where: {
        id: "item-1",
        checklist: { organizationId: ORG_ID },
      },
    });
  });

  it("throws NotFoundError when not found", async () => {
    db.checklistItem.findFirst.mockResolvedValue(null);

    await expect(
      updateItem(db, ORG_ID, "nope", { text: "X" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteItem ───────────────────────────────────────────────────────────────

describe("deleteItem", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.checklistItem.findFirst.mockResolvedValue(mockItem);
    db.checklistItem.delete.mockResolvedValue({});
  });

  it("deletes item", async () => {
    await deleteItem(db, ORG_ID, "item-1");

    expect(db.checklistItem.delete).toHaveBeenCalledWith({
      where: { id: "item-1" },
    });
  });

  it("throws NotFoundError when not found", async () => {
    db.checklistItem.findFirst.mockResolvedValue(null);

    await expect(deleteItem(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});
