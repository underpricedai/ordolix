import { describe, expect, it } from "vitest";
import {
  createReportInput,
  updateReportInput,
  listReportsInput,
  runReportInput,
  reportTypeEnum,
  visualizationTypeEnum,
} from "./schemas";

describe("reportTypeEnum", () => {
  it("accepts valid report types", () => {
    expect(reportTypeEnum.parse("issue_summary")).toBe("issue_summary");
    expect(reportTypeEnum.parse("time_tracking")).toBe("time_tracking");
    expect(reportTypeEnum.parse("sla_compliance")).toBe("sla_compliance");
    expect(reportTypeEnum.parse("velocity")).toBe("velocity");
    expect(reportTypeEnum.parse("custom")).toBe("custom");
  });

  it("rejects invalid report types", () => {
    expect(() => reportTypeEnum.parse("invalid")).toThrow();
  });
});

describe("visualizationTypeEnum", () => {
  it("accepts valid visualization types", () => {
    expect(visualizationTypeEnum.parse("table")).toBe("table");
    expect(visualizationTypeEnum.parse("bar_chart")).toBe("bar_chart");
    expect(visualizationTypeEnum.parse("line_chart")).toBe("line_chart");
    expect(visualizationTypeEnum.parse("pie_chart")).toBe("pie_chart");
    expect(visualizationTypeEnum.parse("area_chart")).toBe("area_chart");
  });

  it("rejects invalid visualization types", () => {
    expect(() => visualizationTypeEnum.parse("scatter")).toThrow();
  });
});

describe("createReportInput", () => {
  const validInput = {
    name: "Sprint Velocity",
    reportType: "velocity" as const,
    query: { project: "ORD", sprint: "current" },
  };

  it("accepts valid minimal input", () => {
    const result = createReportInput.parse(validInput);
    expect(result.name).toBe("Sprint Velocity");
    expect(result.reportType).toBe("velocity");
    expect(result.isShared).toBe(false);
  });

  it("accepts full input with all optional fields", () => {
    const result = createReportInput.parse({
      ...validInput,
      description: "Weekly velocity report",
      visualization: { type: "bar_chart", config: { stacked: true } },
      isShared: true,
      schedule: { cron: "0 9 * * 1", recipients: ["team@example.com"] },
    });
    expect(result.description).toBe("Weekly velocity report");
    expect(result.visualization?.type).toBe("bar_chart");
    expect(result.isShared).toBe(true);
    expect(result.schedule?.cron).toBe("0 9 * * 1");
  });

  it("rejects empty name", () => {
    expect(() =>
      createReportInput.parse({ ...validInput, name: "" }),
    ).toThrow();
  });

  it("rejects name longer than 255 characters", () => {
    expect(() =>
      createReportInput.parse({ ...validInput, name: "a".repeat(256) }),
    ).toThrow();
  });

  it("defaults visualization config to empty object", () => {
    const result = createReportInput.parse({
      ...validInput,
      visualization: { type: "table" },
    });
    expect(result.visualization?.config).toEqual({});
  });
});

describe("updateReportInput", () => {
  it("requires id and accepts optional fields", () => {
    const result = updateReportInput.parse({
      id: "report-1",
      name: "Updated Name",
    });
    expect(result.id).toBe("report-1");
    expect(result.name).toBe("Updated Name");
  });

  it("rejects missing id", () => {
    expect(() => updateReportInput.parse({ name: "No ID" })).toThrow();
  });
});

describe("listReportsInput", () => {
  it("accepts empty input", () => {
    const result = listReportsInput.parse({});
    expect(result.reportType).toBeUndefined();
    expect(result.isShared).toBeUndefined();
  });

  it("accepts filters", () => {
    const result = listReportsInput.parse({
      reportType: "custom",
      isShared: true,
    });
    expect(result.reportType).toBe("custom");
    expect(result.isShared).toBe(true);
  });
});

describe("runReportInput", () => {
  it("requires id", () => {
    const result = runReportInput.parse({ id: "report-1" });
    expect(result.id).toBe("report-1");
  });

  it("rejects empty id", () => {
    expect(() => runReportInput.parse({ id: "" })).toThrow();
  });
});
