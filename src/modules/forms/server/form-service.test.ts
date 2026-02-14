import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
  deleteTemplate,
  submitForm,
  getSubmission,
  listSubmissions,
  updateSubmissionStatus,
} from "./form-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

function createMockDb() {
  return {
    formTemplate: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    formSubmission: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockField = { id: "f1", label: "Name", type: "text" as const, required: false };

const mockTemplate = {
  id: "tpl-1",
  organizationId: ORG_ID,
  name: "Bug Report",
  description: null,
  config: [mockField],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSubmission = {
  id: "sub-1",
  organizationId: ORG_ID,
  templateId: "tpl-1",
  submittedBy: USER_ID,
  data: { name: "John" },
  status: "pending",
  issueId: null,
  createdAt: new Date(),
  template: { id: "tpl-1", name: "Bug Report" },
};

// ── createTemplate ──────────────────────────────────────────────────────────

describe("createTemplate", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.formTemplate.create.mockResolvedValue(mockTemplate);
  });

  it("creates a form template", async () => {
    const result = await createTemplate(db, ORG_ID, {
      name: "Bug Report",
      schema: [mockField],
      isActive: true,
    });

    expect(result.id).toBe("tpl-1");
    expect(db.formTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        name: "Bug Report",
        config: [mockField],
      }),
      select: expect.any(Object),
    });
  });
});

// ── getTemplate ─────────────────────────────────────────────────────────────

describe("getTemplate", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.formTemplate.findFirst.mockResolvedValue({
      ...mockTemplate,
      _count: { submissions: 3 },
    });
  });

  it("returns a template with submissions count", async () => {
    const result = await getTemplate(db, ORG_ID, "tpl-1");

    expect(result.id).toBe("tpl-1");
    expect(result._count.submissions).toBe(3);
    expect(db.formTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tpl-1", organizationId: ORG_ID },
      }),
    );
  });

  it("throws NotFoundError if template not found", async () => {
    db.formTemplate.findFirst.mockResolvedValue(null);

    await expect(getTemplate(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── listTemplates ───────────────────────────────────────────────────────────

describe("listTemplates", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.formTemplate.findMany.mockResolvedValue([mockTemplate]);
  });

  it("returns templates for organization", async () => {
    const result = await listTemplates(db, ORG_ID, {});

    expect(result).toHaveLength(1);
    expect(db.formTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID },
      }),
    );
  });

  it("filters by isActive", async () => {
    await listTemplates(db, ORG_ID, { isActive: true });

    expect(db.formTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID, isActive: true },
      }),
    );
  });
});

// ── updateTemplate ──────────────────────────────────────────────────────────

describe("updateTemplate", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.formTemplate.findFirst.mockResolvedValue(mockTemplate);
    db.formTemplate.update.mockResolvedValue({
      ...mockTemplate,
      name: "Updated Name",
    });
  });

  it("updates template fields", async () => {
    const result = await updateTemplate(db, ORG_ID, "tpl-1", {
      name: "Updated Name",
    });

    expect(result.name).toBe("Updated Name");
    expect(db.formTemplate.update).toHaveBeenCalledWith({
      where: { id: "tpl-1" },
      data: expect.objectContaining({ name: "Updated Name" }),
      select: expect.any(Object),
    });
  });

  it("throws NotFoundError if template not found", async () => {
    db.formTemplate.findFirst.mockResolvedValue(null);

    await expect(
      updateTemplate(db, ORG_ID, "nope", { name: "X" }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── deleteTemplate ──────────────────────────────────────────────────────────

describe("deleteTemplate", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.formTemplate.findFirst.mockResolvedValue(mockTemplate);
    db.formTemplate.delete.mockResolvedValue(mockTemplate);
  });

  it("deletes a template", async () => {
    await deleteTemplate(db, ORG_ID, "tpl-1");

    expect(db.formTemplate.delete).toHaveBeenCalledWith({
      where: { id: "tpl-1" },
    });
  });

  it("throws NotFoundError if template not found", async () => {
    db.formTemplate.findFirst.mockResolvedValue(null);

    await expect(deleteTemplate(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── submitForm ──────────────────────────────────────────────────────────────

describe("submitForm", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.formTemplate.findFirst.mockResolvedValue(mockTemplate);
    db.formSubmission.create.mockResolvedValue(mockSubmission);
  });

  it("creates a submission for an active template", async () => {
    const result = await submitForm(db, ORG_ID, USER_ID, {
      formTemplateId: "tpl-1",
      data: { name: "John" },
    });

    expect(result.id).toBe("sub-1");
    expect(db.formSubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        templateId: "tpl-1",
        submittedBy: USER_ID,
        data: { name: "John" },
      }),
      include: expect.any(Object),
    });
  });

  it("throws NotFoundError if template not found", async () => {
    db.formTemplate.findFirst.mockResolvedValue(null);

    await expect(
      submitForm(db, ORG_ID, USER_ID, {
        formTemplateId: "nope",
        data: {},
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError if template is inactive", async () => {
    db.formTemplate.findFirst.mockResolvedValue({
      ...mockTemplate,
      isActive: false,
    });

    await expect(
      submitForm(db, ORG_ID, USER_ID, {
        formTemplateId: "tpl-1",
        data: {},
      }),
    ).rejects.toThrow(ValidationError);
  });
});

// ── getSubmission ───────────────────────────────────────────────────────────

describe("getSubmission", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.formSubmission.findFirst.mockResolvedValue(mockSubmission);
  });

  it("returns a submission with template info", async () => {
    const result = await getSubmission(db, ORG_ID, "sub-1");

    expect(result.id).toBe("sub-1");
    expect(result.template.name).toBe("Bug Report");
  });

  it("throws NotFoundError if submission not found", async () => {
    db.formSubmission.findFirst.mockResolvedValue(null);

    await expect(getSubmission(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── listSubmissions ─────────────────────────────────────────────────────────

describe("listSubmissions", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.formSubmission.findMany.mockResolvedValue([mockSubmission]);
  });

  it("returns submissions for a template", async () => {
    const result = await listSubmissions(db, ORG_ID, {
      formTemplateId: "tpl-1",
      limit: 50,
    });

    expect(result).toHaveLength(1);
    expect(db.formSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID, templateId: "tpl-1" },
        take: 50,
      }),
    );
  });

  it("filters by status", async () => {
    await listSubmissions(db, ORG_ID, {
      formTemplateId: "tpl-1",
      status: "approved",
      limit: 50,
    });

    expect(db.formSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: ORG_ID,
          templateId: "tpl-1",
          status: "approved",
        },
      }),
    );
  });
});

// ── updateSubmissionStatus ──────────────────────────────────────────────────

describe("updateSubmissionStatus", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.formSubmission.findFirst.mockResolvedValue(mockSubmission);
    db.formSubmission.update.mockResolvedValue({
      ...mockSubmission,
      status: "approved",
    });
  });

  it("updates submission status", async () => {
    const result = await updateSubmissionStatus(
      db,
      ORG_ID,
      "sub-1",
      "approved",
    );

    expect(result.status).toBe("approved");
    expect(db.formSubmission.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { status: "approved" },
      include: expect.any(Object),
    });
  });

  it("throws NotFoundError if submission not found", async () => {
    db.formSubmission.findFirst.mockResolvedValue(null);

    await expect(
      updateSubmissionStatus(db, ORG_ID, "nope", "rejected"),
    ).rejects.toThrow(NotFoundError);
  });
});
