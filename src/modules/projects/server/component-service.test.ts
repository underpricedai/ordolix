import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  listComponents,
  createComponent,
  updateComponent,
  deleteComponent,
} from "./component-service";
import { NotFoundError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    component: {
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

// ── listComponents ───────────────────────────────────────────────────────────

describe("listComponents", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns components scoped to project and ordered by name", async () => {
    const mockComponents = [
      { id: "c1", name: "API", projectId: PROJECT_ID },
      { id: "c2", name: "Frontend", projectId: PROJECT_ID },
    ];
    db.component.findMany.mockResolvedValue(mockComponents);

    const result = await listComponents(db, ORG_ID, PROJECT_ID);

    expect(result).toEqual(mockComponents);
    expect(db.component.findMany).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID, organizationId: ORG_ID },
      orderBy: { name: "asc" },
    });
  });
});

// ── createComponent ──────────────────────────────────────────────────────────

describe("createComponent", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("creates a component with provided values", async () => {
    const created = {
      id: "c1", organizationId: ORG_ID, projectId: PROJECT_ID,
      name: "Backend", description: "Server-side code", lead: "user-1",
    };
    db.component.create.mockResolvedValue(created);

    const result = await createComponent(db, ORG_ID, {
      projectId: PROJECT_ID,
      name: "Backend",
      description: "Server-side code",
      lead: "user-1",
    });

    expect(result).toEqual(created);
    expect(db.component.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        name: "Backend",
        description: "Server-side code",
        lead: "user-1",
      },
    });
  });

  it("creates a component without optional fields", async () => {
    db.component.create.mockResolvedValue({ id: "c1" });

    await createComponent(db, ORG_ID, {
      projectId: PROJECT_ID,
      name: "Core",
    });

    expect(db.component.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        name: "Core",
        description: undefined,
        lead: undefined,
      },
    });
  });
});

// ── updateComponent ──────────────────────────────────────────────────────────

describe("updateComponent", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("updates an existing component", async () => {
    db.component.findFirst.mockResolvedValue({ id: "c1", organizationId: ORG_ID, name: "API" });
    db.component.update.mockResolvedValue({ id: "c1", name: "REST API", description: "Updated desc" });

    const result = await updateComponent(db, ORG_ID, "c1", { name: "REST API", description: "Updated desc" });

    expect(result.name).toBe("REST API");
    expect(db.component.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { name: "REST API", description: "Updated desc" },
    });
  });

  it("throws NotFoundError when component does not exist", async () => {
    db.component.findFirst.mockResolvedValue(null);

    await expect(
      updateComponent(db, ORG_ID, "nonexistent", { name: "New" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteComponent ──────────────────────────────────────────────────────────

describe("deleteComponent", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("deletes an existing component", async () => {
    db.component.findFirst.mockResolvedValue({ id: "c1", organizationId: ORG_ID });

    await deleteComponent(db, ORG_ID, "c1");

    expect(db.component.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
  });

  it("throws NotFoundError when component does not exist", async () => {
    db.component.findFirst.mockResolvedValue(null);

    await expect(
      deleteComponent(db, ORG_ID, "nonexistent"),
    ).rejects.toThrow(NotFoundError);
  });
});
