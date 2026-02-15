import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/lib/logger", () => ({
  logger: { child: vi.fn().mockReturnValue({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }) },
}));
vi.mock("@/server/trpc/dev-auth", () => ({
  createDevSession: vi.fn().mockResolvedValue(null),
  getOrganizationId: vi.fn().mockResolvedValue(null),
}));

import { workflowSchemeAdapter } from "./workflow-scheme-adapter";
import type { PrismaClient } from "@prisma/client";

function mockDb() {
  return {
    workflow: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    project: {
      count: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as PrismaClient;
}

const orgId = "org-1";

describe("workflowSchemeAdapter", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("has correct schemeType", () => {
    expect(workflowSchemeAdapter.schemeType).toBe("Workflow");
  });

  describe("getProjectCount", () => {
    it("counts projects linked via many-to-many", async () => {
      const db = mockDb();
      vi.mocked(db.project.count).mockResolvedValue(2 as never);

      const result = await workflowSchemeAdapter.getProjectCount(db, "wf-1", orgId);

      expect(result).toBe(2);
      expect(db.project.count).toHaveBeenCalledWith({
        where: {
          organizationId: orgId,
          workflows: { some: { id: "wf-1" } },
        },
      });
    });
  });

  describe("cloneScheme", () => {
    it("deep copies statuses and transitions", async () => {
      const original = {
        id: "wf-1",
        name: "Default",
        description: "Standard workflow",
        isDefault: true,
        isActive: true,
        parentId: null,
        organizationId: orgId,
        workflowStatuses: [
          { id: "ws1", statusId: "st-1", position: 0, workflowId: "wf-1" },
        ],
        transitions: [
          {
            id: "t1", name: "Start", fromStatusId: "st-1", toStatusId: "st-2",
            validators: [], conditions: [], postFunctions: [], workflowId: "wf-1",
            createdAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const db = mockDb();
      vi.mocked(db.workflow.create).mockResolvedValue({ id: "wf-2" } as never);

      await workflowSchemeAdapter.cloneScheme(db, original, "Custom Workflow", orgId);

      expect(db.workflow.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Custom Workflow",
          parentId: "wf-1",
          workflowStatuses: {
            create: [{ statusId: "st-1", position: 0 }],
          },
          transitions: {
            create: [{
              name: "Start", fromStatusId: "st-1", toStatusId: "st-2",
              validators: [], conditions: [], postFunctions: [],
            }],
          },
        }),
        include: { workflowStatuses: true, transitions: true },
      });
    });
  });

  describe("assignToProject", () => {
    it("disconnects old workflows and connects new one", async () => {
      const db = mockDb();
      vi.mocked(db.project.findUniqueOrThrow).mockResolvedValue({
        id: "p1",
        workflows: [{ id: "wf-old" }],
      } as never);
      vi.mocked(db.project.update).mockResolvedValue({} as never);

      await workflowSchemeAdapter.assignToProject(db, "wf-new", "p1");

      expect(db.project.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: {
          workflows: {
            disconnect: [{ id: "wf-old" }],
            connect: { id: "wf-new" },
          },
          defaultWorkflowId: "wf-new",
        },
      });
    });
  });
});
