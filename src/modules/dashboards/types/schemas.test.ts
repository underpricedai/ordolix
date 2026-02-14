import { describe, expect, it } from "vitest";
import {
  createDashboardInput,
  updateDashboardInput,
  addWidgetInput,
  updateWidgetInput,
  deleteWidgetInput,
} from "./schemas";

describe("createDashboardInput", () => {
  it("accepts valid minimal input", () => {
    const result = createDashboardInput.safeParse({ name: "My Dashboard" });
    expect(result.success).toBe(true);
  });

  it("defaults isShared to false", () => {
    const result = createDashboardInput.parse({ name: "My Dashboard" });
    expect(result.isShared).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createDashboardInput.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 255 characters", () => {
    const result = createDashboardInput.safeParse({ name: "a".repeat(256) });
    expect(result.success).toBe(false);
  });

  it("accepts input with layout", () => {
    const result = createDashboardInput.safeParse({
      name: "Dashboard",
      layout: [{ x: 0, y: 0, w: 6, h: 4 }],
    });
    expect(result.success).toBe(true);
  });
});

describe("updateDashboardInput", () => {
  it("accepts id only", () => {
    const result = updateDashboardInput.safeParse({ id: "dash-1" });
    expect(result.success).toBe(true);
  });

  it("accepts partial updates", () => {
    const result = updateDashboardInput.safeParse({
      id: "dash-1",
      name: "Renamed",
      isShared: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("addWidgetInput", () => {
  it("accepts valid widget input", () => {
    const result = addWidgetInput.safeParse({
      dashboardId: "dash-1",
      widgetType: "issueCount",
      title: "Open Issues",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid widgetType", () => {
    const result = addWidgetInput.safeParse({
      dashboardId: "dash-1",
      widgetType: "invalidType",
      title: "Widget",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional config and position", () => {
    const result = addWidgetInput.safeParse({
      dashboardId: "dash-1",
      widgetType: "statusBreakdown",
      title: "Status",
      config: { projectId: "proj-1" },
      position: { x: 0, y: 0, w: 6, h: 4 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing dashboardId", () => {
    const result = addWidgetInput.safeParse({
      widgetType: "issueCount",
      title: "Widget",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateWidgetInput", () => {
  it("accepts id only", () => {
    const result = updateWidgetInput.safeParse({ id: "widget-1" });
    expect(result.success).toBe(true);
  });

  it("accepts partial updates", () => {
    const result = updateWidgetInput.safeParse({
      id: "widget-1",
      title: "Renamed Widget",
      config: { filter: "assignee = me" },
    });
    expect(result.success).toBe(true);
  });
});

describe("deleteWidgetInput", () => {
  it("accepts valid id", () => {
    const result = deleteWidgetInput.safeParse({ id: "widget-1" });
    expect(result.success).toBe(true);
  });

  it("rejects empty id", () => {
    const result = deleteWidgetInput.safeParse({ id: "" });
    expect(result.success).toBe(false);
  });
});
