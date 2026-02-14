import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createScript,
  getScript,
  listScripts,
  updateScript,
  deleteScript,
  executeScript,
  listExecutions,
} from "./script-service";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "@/server/lib/errors";

function createMockDb() {
  return {
    script: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    scriptExecution: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockScript = {
  id: "script-1",
  organizationId: ORG_ID,
  name: "My Script",
  description: null,
  triggerType: "manual",
  code: "return 1",
  isEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── createScript ─────────────────────────────────────────────────────────────

describe("createScript", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.script.findFirst.mockResolvedValue(null);
    db.script.create.mockResolvedValue(mockScript);
  });

  it("creates a script", async () => {
    const result = await createScript(db, ORG_ID, {
      name: "My Script",
      triggerType: "manual",
      code: "return 1",
      isEnabled: true,
    });

    expect(result.id).toBe("script-1");
    expect(db.script.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        name: "My Script",
        triggerType: "manual",
      }),
    });
  });

  it("throws ConflictError if name already exists", async () => {
    db.script.findFirst.mockResolvedValue(mockScript);

    await expect(
      createScript(db, ORG_ID, {
        name: "My Script",
        triggerType: "manual",
        code: "code",
        isEnabled: true,
      }),
    ).rejects.toThrow(ConflictError);
  });
});

// ── getScript ────────────────────────────────────────────────────────────────

describe("getScript", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns script with execution count", async () => {
    db.script.findFirst.mockResolvedValue({
      ...mockScript,
      _count: { executions: 5 },
    });

    const result = await getScript(db, ORG_ID, "script-1");
    expect(result._count.executions).toBe(5);
  });

  it("throws NotFoundError if not found", async () => {
    db.script.findFirst.mockResolvedValue(null);

    await expect(getScript(db, ORG_ID, "nope")).rejects.toThrow(NotFoundError);
  });
});

// ── listScripts ──────────────────────────────────────────────────────────────

describe("listScripts", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.script.findMany.mockResolvedValue([mockScript]);
  });

  it("returns scripts for org", async () => {
    const result = await listScripts(db, ORG_ID, {});
    expect(result).toHaveLength(1);
  });

  it("filters by triggerType", async () => {
    await listScripts(db, ORG_ID, { triggerType: "manual" });

    expect(db.script.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ triggerType: "manual" }),
      }),
    );
  });

  it("filters by isEnabled", async () => {
    await listScripts(db, ORG_ID, { isEnabled: true });

    expect(db.script.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isEnabled: true }),
      }),
    );
  });
});

// ── updateScript ─────────────────────────────────────────────────────────────

describe("updateScript", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.script.findFirst.mockResolvedValue(mockScript);
    db.script.update.mockResolvedValue({ ...mockScript, name: "Updated" });
  });

  it("updates a script", async () => {
    db.script.findFirst
      .mockResolvedValueOnce(mockScript) // find script
      .mockResolvedValueOnce(null); // name uniqueness check

    const result = await updateScript(db, ORG_ID, "script-1", {
      name: "Updated",
    });

    expect(result.name).toBe("Updated");
    expect(db.script.update).toHaveBeenCalledWith({
      where: { id: "script-1" },
      data: { name: "Updated" },
    });
  });

  it("throws NotFoundError if not found", async () => {
    db.script.findFirst.mockResolvedValue(null);

    await expect(
      updateScript(db, ORG_ID, "nope", { name: "New" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError if new name conflicts", async () => {
    db.script.findFirst
      .mockResolvedValueOnce(mockScript) // find script
      .mockResolvedValueOnce({ id: "other", name: "Taken" }); // name check

    await expect(
      updateScript(db, ORG_ID, "script-1", { name: "Taken" }),
    ).rejects.toThrow(ConflictError);
  });
});

// ── deleteScript ─────────────────────────────────────────────────────────────

describe("deleteScript", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("deletes a script", async () => {
    db.script.findFirst.mockResolvedValue(mockScript);
    db.script.delete.mockResolvedValue(mockScript);

    await deleteScript(db, ORG_ID, "script-1");
    expect(db.script.delete).toHaveBeenCalledWith({
      where: { id: "script-1" },
    });
  });

  it("throws NotFoundError if not found", async () => {
    db.script.findFirst.mockResolvedValue(null);

    await expect(deleteScript(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── executeScript ────────────────────────────────────────────────────────────

describe("executeScript", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.script.findFirst.mockResolvedValue(mockScript);
    db.scriptExecution.create.mockResolvedValue({
      id: "exec-1",
      scriptId: "script-1",
      executedBy: USER_ID,
      status: "success",
      output: '{"result":"ok","context":{}}',
      error: null,
      duration: 0,
    });
  });

  it("creates an execution record", async () => {
    const result = await executeScript(db, ORG_ID, USER_ID, {
      scriptId: "script-1",
      context: {},
    });

    expect(result.status).toBe("success");
    expect(db.scriptExecution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        scriptId: "script-1",
        executedBy: USER_ID,
        status: "success",
      }),
    });
  });

  it("throws NotFoundError if script not found", async () => {
    db.script.findFirst.mockResolvedValue(null);

    await expect(
      executeScript(db, ORG_ID, USER_ID, {
        scriptId: "nope",
        context: {},
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError if script is disabled", async () => {
    db.script.findFirst.mockResolvedValue({
      ...mockScript,
      isEnabled: false,
    });

    await expect(
      executeScript(db, ORG_ID, USER_ID, {
        scriptId: "script-1",
        context: {},
      }),
    ).rejects.toThrow(ValidationError);
  });
});

// ── listExecutions ───────────────────────────────────────────────────────────

describe("listExecutions", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.script.findFirst.mockResolvedValue(mockScript);
    db.scriptExecution.findMany.mockResolvedValue([]);
  });

  it("returns executions for script", async () => {
    await listExecutions(db, ORG_ID, { scriptId: "script-1", limit: 50 });

    expect(db.scriptExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scriptId: "script-1" },
        take: 50,
      }),
    );
  });

  it("filters by status", async () => {
    await listExecutions(db, ORG_ID, {
      scriptId: "script-1",
      status: "error",
      limit: 50,
    });

    expect(db.scriptExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scriptId: "script-1", status: "error" },
      }),
    );
  });

  it("throws NotFoundError if script not in org", async () => {
    db.script.findFirst.mockResolvedValue(null);

    await expect(
      listExecutions(db, ORG_ID, { scriptId: "nope", limit: 50 }),
    ).rejects.toThrow(NotFoundError);
  });
});
