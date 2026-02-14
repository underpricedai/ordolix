import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createRetro,
  getRetro,
  listRetros,
  updateRetro,
  deleteRetro,
  addCard,
  updateCard,
  voteCard,
  deleteCard,
} from "./retro-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

function createMockDb() {
  return {
    project: { findFirst: vi.fn() },
    retrospective: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    retroCard: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockRetro = {
  id: "retro-1",
  organizationId: ORG_ID,
  projectId: "proj-1",
  name: "Sprint 10 Retro",
  sprintId: null,
  status: "active",
  categories: ["Went Well", "To Improve", "Action Items"],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCard = {
  id: "card-1",
  retrospectiveId: "retro-1",
  authorId: USER_ID,
  category: "Went Well",
  text: "Great teamwork!",
  votes: 0,
  linkedIssueId: null,
  createdAt: new Date(),
  author: { id: USER_ID, name: "Test User" },
};

// ── createRetro ──────────────────────────────────────────────────────────────

describe("createRetro", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.project.findFirst.mockResolvedValue({ id: "proj-1" });
    db.retrospective.create.mockResolvedValue(mockRetro);
  });

  it("creates a retrospective with default categories", async () => {
    const result = await createRetro(db, ORG_ID, {
      projectId: "proj-1",
      name: "Sprint 10 Retro",
      categories: ["Went Well", "To Improve", "Action Items"],
    });

    expect(result.id).toBe("retro-1");
    expect(db.retrospective.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        projectId: "proj-1",
        name: "Sprint 10 Retro",
        categories: ["Went Well", "To Improve", "Action Items"],
      }),
    });
  });

  it("throws NotFoundError if project not found", async () => {
    db.project.findFirst.mockResolvedValue(null);

    await expect(
      createRetro(db, ORG_ID, {
        projectId: "nope",
        name: "Retro",
        categories: ["Went Well", "To Improve", "Action Items"],
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── getRetro ─────────────────────────────────────────────────────────────────

describe("getRetro", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.retrospective.findFirst.mockResolvedValue({
      ...mockRetro,
      cards: [mockCard],
    });
  });

  it("returns a retrospective with cards", async () => {
    const result = await getRetro(db, ORG_ID, "retro-1");

    expect(result.id).toBe("retro-1");
    expect(db.retrospective.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "retro-1", organizationId: ORG_ID },
        include: expect.objectContaining({
          cards: expect.any(Object),
        }),
      }),
    );
  });

  it("throws NotFoundError if not found", async () => {
    db.retrospective.findFirst.mockResolvedValue(null);

    await expect(getRetro(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });
});

// ── listRetros ───────────────────────────────────────────────────────────────

describe("listRetros", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.retrospective.findMany.mockResolvedValue([mockRetro]);
  });

  it("lists retrospectives for a project", async () => {
    const result = await listRetros(db, ORG_ID, { projectId: "proj-1" });

    expect(result).toHaveLength(1);
    expect(db.retrospective.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID, projectId: "proj-1" },
        include: { _count: { select: { cards: true } } },
      }),
    );
  });

  it("filters by status when provided", async () => {
    await listRetros(db, ORG_ID, { projectId: "proj-1", status: "active" });

    expect(db.retrospective.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: ORG_ID,
          projectId: "proj-1",
          status: "active",
        },
      }),
    );
  });
});

// ── updateRetro ──────────────────────────────────────────────────────────────

describe("updateRetro", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.retrospective.findFirst.mockResolvedValue(mockRetro);
    db.retrospective.update.mockResolvedValue({
      ...mockRetro,
      status: "completed",
    });
  });

  it("updates a retrospective", async () => {
    const result = await updateRetro(db, ORG_ID, "retro-1", {
      status: "completed",
    });

    expect(result.status).toBe("completed");
    expect(db.retrospective.update).toHaveBeenCalledWith({
      where: { id: "retro-1" },
      data: expect.objectContaining({ status: "completed" }),
    });
  });

  it("throws NotFoundError if not found", async () => {
    db.retrospective.findFirst.mockResolvedValue(null);

    await expect(
      updateRetro(db, ORG_ID, "nope", { status: "completed" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteRetro ──────────────────────────────────────────────────────────────

describe("deleteRetro", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.retrospective.findFirst.mockResolvedValue(mockRetro);
    db.retrospective.delete.mockResolvedValue(mockRetro);
  });

  it("deletes a retrospective", async () => {
    await deleteRetro(db, ORG_ID, "retro-1");

    expect(db.retrospective.delete).toHaveBeenCalledWith({
      where: { id: "retro-1" },
    });
  });

  it("throws NotFoundError if not found", async () => {
    db.retrospective.findFirst.mockResolvedValue(null);

    await expect(deleteRetro(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── addCard ──────────────────────────────────────────────────────────────────

describe("addCard", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.retrospective.findFirst.mockResolvedValue(mockRetro);
    db.retroCard.create.mockResolvedValue(mockCard);
  });

  it("adds a card to an active retrospective", async () => {
    const result = await addCard(db, ORG_ID, USER_ID, {
      retrospectiveId: "retro-1",
      category: "Went Well",
      text: "Great teamwork!",
    });

    expect(result.id).toBe("card-1");
    expect(db.retroCard.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        retrospectiveId: "retro-1",
        authorId: USER_ID,
        category: "Went Well",
        text: "Great teamwork!",
      }),
      include: expect.any(Object),
    });
  });

  it("throws NotFoundError if retrospective not found", async () => {
    db.retrospective.findFirst.mockResolvedValue(null);

    await expect(
      addCard(db, ORG_ID, USER_ID, {
        retrospectiveId: "nope",
        category: "Went Well",
        text: "Test",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError if retrospective is completed", async () => {
    db.retrospective.findFirst.mockResolvedValue({
      ...mockRetro,
      status: "completed",
    });

    await expect(
      addCard(db, ORG_ID, USER_ID, {
        retrospectiveId: "retro-1",
        category: "Went Well",
        text: "Test",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError if category is not valid", async () => {
    await expect(
      addCard(db, ORG_ID, USER_ID, {
        retrospectiveId: "retro-1",
        category: "Invalid Category",
        text: "Test",
      }),
    ).rejects.toThrow(ValidationError);
  });
});

// ── updateCard ───────────────────────────────────────────────────────────────

describe("updateCard", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.retroCard.findFirst.mockResolvedValue(mockCard);
    db.retroCard.update.mockResolvedValue({
      ...mockCard,
      text: "Updated text",
    });
  });

  it("updates a card", async () => {
    const result = await updateCard(db, ORG_ID, "card-1", {
      text: "Updated text",
    });

    expect(result.text).toBe("Updated text");
  });

  it("throws NotFoundError if card not found", async () => {
    db.retroCard.findFirst.mockResolvedValue(null);

    await expect(
      updateCard(db, ORG_ID, "nope", { text: "Test" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── voteCard ─────────────────────────────────────────────────────────────────

describe("voteCard", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.retroCard.findFirst.mockResolvedValue(mockCard);
    db.retroCard.update.mockResolvedValue({ ...mockCard, votes: 1 });
  });

  it("increments card votes", async () => {
    const result = await voteCard(db, ORG_ID, "card-1");

    expect(result.votes).toBe(1);
    expect(db.retroCard.update).toHaveBeenCalledWith({
      where: { id: "card-1" },
      data: { votes: { increment: 1 } },
      include: expect.any(Object),
    });
  });
});

// ── deleteCard ───────────────────────────────────────────────────────────────

describe("deleteCard", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.retroCard.findFirst.mockResolvedValue(mockCard);
    db.retroCard.delete.mockResolvedValue(mockCard);
  });

  it("deletes a card", async () => {
    await deleteCard(db, ORG_ID, "card-1");

    expect(db.retroCard.delete).toHaveBeenCalledWith({
      where: { id: "card-1" },
    });
  });

  it("throws NotFoundError if card not found", async () => {
    db.retroCard.findFirst.mockResolvedValue(null);

    await expect(deleteCard(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});
