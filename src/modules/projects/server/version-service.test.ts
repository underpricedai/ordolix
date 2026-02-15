import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  listVersions,
  createVersion,
  updateVersion,
  deleteVersion,
  releaseVersion,
} from "./version-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    version: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const PROJECT_ID = "proj-1";

// ── listVersions ─────────────────────────────────────────────────────────────

describe("listVersions", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns versions scoped to project ordered by createdAt desc", async () => {
    const mockVersions = [
      { id: "v2", name: "2.0.0", projectId: PROJECT_ID },
      { id: "v1", name: "1.0.0", projectId: PROJECT_ID },
    ];
    db.version.findMany.mockResolvedValue(mockVersions);

    const result = await listVersions(db, ORG_ID, PROJECT_ID);

    expect(result).toEqual(mockVersions);
    expect(db.version.findMany).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID, organizationId: ORG_ID },
      orderBy: { createdAt: "desc" },
    });
  });
});

// ── createVersion ────────────────────────────────────────────────────────────

describe("createVersion", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("creates a version with provided values", async () => {
    const startDate = new Date("2026-01-01");
    const releaseDate = new Date("2026-03-01");
    const created = {
      id: "v1", organizationId: ORG_ID, projectId: PROJECT_ID,
      name: "1.0.0", description: "Initial release", startDate, releaseDate,
    };
    db.version.create.mockResolvedValue(created);

    const result = await createVersion(db, ORG_ID, {
      projectId: PROJECT_ID,
      name: "1.0.0",
      description: "Initial release",
      startDate,
      releaseDate,
    });

    expect(result).toEqual(created);
    expect(db.version.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        name: "1.0.0",
        description: "Initial release",
        startDate,
        releaseDate,
      },
    });
  });

  it("creates a version without optional fields", async () => {
    db.version.create.mockResolvedValue({ id: "v1" });

    await createVersion(db, ORG_ID, {
      projectId: PROJECT_ID,
      name: "2.0.0",
    });

    expect(db.version.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        name: "2.0.0",
        description: undefined,
        startDate: undefined,
        releaseDate: undefined,
      },
    });
  });
});

// ── updateVersion ────────────────────────────────────────────────────────────

describe("updateVersion", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("updates an existing version", async () => {
    db.version.findFirst.mockResolvedValue({ id: "v1", organizationId: ORG_ID, name: "1.0.0" });
    db.version.update.mockResolvedValue({ id: "v1", name: "1.0.1", description: "Patch" });

    const result = await updateVersion(db, ORG_ID, "v1", { name: "1.0.1", description: "Patch" });

    expect(result.name).toBe("1.0.1");
    expect(db.version.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { name: "1.0.1", description: "Patch" },
    });
  });

  it("throws NotFoundError when version does not exist", async () => {
    db.version.findFirst.mockResolvedValue(null);

    await expect(
      updateVersion(db, ORG_ID, "nonexistent", { name: "New" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteVersion ────────────────────────────────────────────────────────────

describe("deleteVersion", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("deletes an existing version", async () => {
    db.version.findFirst.mockResolvedValue({ id: "v1", organizationId: ORG_ID });

    await deleteVersion(db, ORG_ID, "v1");

    expect(db.version.delete).toHaveBeenCalledWith({ where: { id: "v1" } });
  });

  it("throws NotFoundError when version does not exist", async () => {
    db.version.findFirst.mockResolvedValue(null);

    await expect(
      deleteVersion(db, ORG_ID, "nonexistent"),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── releaseVersion ───────────────────────────────────────────────────────────

describe("releaseVersion", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("releases a version and sets releaseDate", async () => {
    db.version.findFirst.mockResolvedValue({ id: "v1", organizationId: ORG_ID, status: "unreleased" });
    db.version.update.mockResolvedValue({ id: "v1", status: "released", releaseDate: new Date() });

    const result = await releaseVersion(db, ORG_ID, "v1");

    expect(result.status).toBe("released");
    expect(db.version.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { status: "released", releaseDate: expect.any(Date) },
    });
  });

  it("throws NotFoundError when version does not exist", async () => {
    db.version.findFirst.mockResolvedValue(null);

    await expect(
      releaseVersion(db, ORG_ID, "nonexistent"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError when version is already released", async () => {
    db.version.findFirst.mockResolvedValue({ id: "v1", organizationId: ORG_ID, status: "released" });

    await expect(
      releaseVersion(db, ORG_ID, "v1"),
    ).rejects.toThrow(ValidationError);
  });
});
