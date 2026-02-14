import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createDashboard,
  getDashboard,
  listDashboards,
  updateDashboard,
  deleteDashboard,
  addWidget,
  updateWidget,
  deleteWidget,
} from "./dashboard-service";
import { NotFoundError, PermissionError } from "@/server/lib/errors";

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    dashboard: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    dashboardWidget: {
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

const mockDashboard = {
  id: "dash-1",
  organizationId: ORG_ID,
  ownerId: USER_ID,
  name: "My Dashboard",
  isShared: false,
  layout: [],
  widgets: [],
};

const mockWidget = {
  id: "widget-1",
  dashboardId: "dash-1",
  widgetType: "issueCount",
  title: "Open Issues",
  config: {},
  position: { x: 0, y: 0, w: 6, h: 4 },
};

// ── createDashboard ─────────────────────────────────────────────────────────

describe("createDashboard", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.dashboard.create.mockResolvedValue(mockDashboard);
  });

  it("creates dashboard with ownerId set to userId", async () => {
    await createDashboard(db, ORG_ID, USER_ID, {
      name: "My Dashboard",
      isShared: false,
    });

    expect(db.dashboard.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        ownerId: USER_ID,
        name: "My Dashboard",
        isShared: false,
      }),
    });
  });

  it("defaults layout to empty array when not provided", async () => {
    await createDashboard(db, ORG_ID, USER_ID, {
      name: "Dashboard",
      isShared: false,
    });

    expect(db.dashboard.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ layout: [] }),
    });
  });

  it("passes layout when provided", async () => {
    const layout = [{ x: 0, y: 0 }];
    await createDashboard(db, ORG_ID, USER_ID, {
      name: "Dashboard",
      isShared: false,
      layout,
    });

    expect(db.dashboard.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ layout }),
    });
  });
});

// ── getDashboard ────────────────────────────────────────────────────────────

describe("getDashboard", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns dashboard with widgets when found", async () => {
    db.dashboard.findFirst.mockResolvedValue(mockDashboard);

    const result = await getDashboard(db, ORG_ID, "dash-1");
    expect(result).toEqual(mockDashboard);
    expect(db.dashboard.findFirst).toHaveBeenCalledWith({
      where: { id: "dash-1", organizationId: ORG_ID },
      include: { widgets: true },
    });
  });

  it("throws NotFoundError when not found", async () => {
    db.dashboard.findFirst.mockResolvedValue(null);

    await expect(getDashboard(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("scopes query to organization", async () => {
    db.dashboard.findFirst.mockResolvedValue(null);
    await getDashboard(db, "other-org", "dash-1").catch(() => {});

    expect(db.dashboard.findFirst).toHaveBeenCalledWith({
      where: { id: "dash-1", organizationId: "other-org" },
      include: { widgets: true },
    });
  });
});

// ── listDashboards ──────────────────────────────────────────────────────────

describe("listDashboards", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns dashboards owned by user or shared", async () => {
    db.dashboard.findMany.mockResolvedValue([mockDashboard]);

    const result = await listDashboards(db, ORG_ID, USER_ID);
    expect(result).toHaveLength(1);
    expect(db.dashboard.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        OR: [{ ownerId: USER_ID }, { isShared: true }],
      },
      include: { widgets: true },
    });
  });

  it("returns empty array when no dashboards match", async () => {
    db.dashboard.findMany.mockResolvedValue([]);

    const result = await listDashboards(db, ORG_ID, USER_ID);
    expect(result).toHaveLength(0);
  });
});

// ── updateDashboard ─────────────────────────────────────────────────────────

describe("updateDashboard", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.dashboard.findFirst.mockResolvedValue(mockDashboard);
    db.dashboard.update.mockResolvedValue({
      ...mockDashboard,
      name: "Renamed",
    });
  });

  it("updates dashboard fields", async () => {
    const result = await updateDashboard(db, ORG_ID, USER_ID, "dash-1", {
      name: "Renamed",
    });

    expect(result.name).toBe("Renamed");
    expect(db.dashboard.update).toHaveBeenCalledWith({
      where: { id: "dash-1" },
      data: { name: "Renamed" },
    });
  });

  it("throws NotFoundError when not found", async () => {
    db.dashboard.findFirst.mockResolvedValue(null);

    await expect(
      updateDashboard(db, ORG_ID, USER_ID, "nope", { name: "X" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws PermissionError when not owner and not shared", async () => {
    db.dashboard.findFirst.mockResolvedValue({
      ...mockDashboard,
      ownerId: "other-user",
      isShared: false,
    });

    await expect(
      updateDashboard(db, ORG_ID, USER_ID, "dash-1", { name: "X" }),
    ).rejects.toThrow(PermissionError);
  });

  it("allows update when dashboard is shared and not owner", async () => {
    db.dashboard.findFirst.mockResolvedValue({
      ...mockDashboard,
      ownerId: "other-user",
      isShared: true,
    });

    await updateDashboard(db, ORG_ID, USER_ID, "dash-1", { name: "X" });
    expect(db.dashboard.update).toHaveBeenCalled();
  });
});

// ── deleteDashboard ─────────────────────────────────────────────────────────

describe("deleteDashboard", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.dashboard.findFirst.mockResolvedValue(mockDashboard);
    db.dashboard.delete.mockResolvedValue({});
  });

  it("deletes dashboard", async () => {
    await deleteDashboard(db, ORG_ID, USER_ID, "dash-1");

    expect(db.dashboard.delete).toHaveBeenCalledWith({
      where: { id: "dash-1" },
    });
  });

  it("throws NotFoundError when not found", async () => {
    db.dashboard.findFirst.mockResolvedValue(null);

    await expect(
      deleteDashboard(db, ORG_ID, USER_ID, "nope"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws PermissionError when not owner", async () => {
    db.dashboard.findFirst.mockResolvedValue({
      ...mockDashboard,
      ownerId: "other-user",
    });

    await expect(
      deleteDashboard(db, ORG_ID, USER_ID, "dash-1"),
    ).rejects.toThrow(PermissionError);
  });
});

// ── addWidget ───────────────────────────────────────────────────────────────

describe("addWidget", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.dashboard.findFirst.mockResolvedValue(mockDashboard);
    db.dashboardWidget.create.mockResolvedValue(mockWidget);
  });

  it("creates widget on existing dashboard", async () => {
    await addWidget(db, ORG_ID, {
      dashboardId: "dash-1",
      widgetType: "issueCount",
      title: "Open Issues",
    });

    expect(db.dashboardWidget.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dashboardId: "dash-1",
        widgetType: "issueCount",
        title: "Open Issues",
      }),
    });
  });

  it("throws NotFoundError when dashboard not found", async () => {
    db.dashboard.findFirst.mockResolvedValue(null);

    await expect(
      addWidget(db, ORG_ID, {
        dashboardId: "nope",
        widgetType: "issueCount",
        title: "Widget",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("defaults config and position to empty objects", async () => {
    await addWidget(db, ORG_ID, {
      dashboardId: "dash-1",
      widgetType: "statusBreakdown",
      title: "Status",
    });

    expect(db.dashboardWidget.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        config: {},
        position: {},
      }),
    });
  });
});

// ── updateWidget ────────────────────────────────────────────────────────────

describe("updateWidget", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.dashboardWidget.findFirst.mockResolvedValue(mockWidget);
    db.dashboardWidget.update.mockResolvedValue({
      ...mockWidget,
      title: "Renamed",
    });
  });

  it("updates widget fields", async () => {
    const result = await updateWidget(db, ORG_ID, "widget-1", {
      title: "Renamed",
    });

    expect(result.title).toBe("Renamed");
    expect(db.dashboardWidget.update).toHaveBeenCalledWith({
      where: { id: "widget-1" },
      data: { title: "Renamed" },
    });
  });

  it("throws NotFoundError when not found", async () => {
    db.dashboardWidget.findFirst.mockResolvedValue(null);

    await expect(
      updateWidget(db, ORG_ID, "nope", { title: "X" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("scopes query to organization via dashboard relation", async () => {
    db.dashboardWidget.findFirst.mockResolvedValue(null);
    await updateWidget(db, "other-org", "widget-1", { title: "X" }).catch(
      () => {},
    );

    expect(db.dashboardWidget.findFirst).toHaveBeenCalledWith({
      where: {
        id: "widget-1",
        dashboard: { organizationId: "other-org" },
      },
    });
  });
});

// ── deleteWidget ────────────────────────────────────────────────────────────

describe("deleteWidget", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.dashboardWidget.findFirst.mockResolvedValue(mockWidget);
    db.dashboardWidget.delete.mockResolvedValue({});
  });

  it("deletes widget", async () => {
    await deleteWidget(db, ORG_ID, "widget-1");

    expect(db.dashboardWidget.delete).toHaveBeenCalledWith({
      where: { id: "widget-1" },
    });
  });

  it("throws NotFoundError when not found", async () => {
    db.dashboardWidget.findFirst.mockResolvedValue(null);

    await expect(deleteWidget(db, ORG_ID, "nope")).rejects.toThrow(
      NotFoundError,
    );
  });
});
