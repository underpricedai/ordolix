/**
 * Tests for the Power BI REST API client and embed helpers.
 *
 * @module integrations/powerbi/client.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PowerBIClient } from "./client";
import { generateEmbedConfig, buildReportMetadata } from "./embed";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(status === 204 ? "" : JSON.stringify(data)),
  };
}

const sampleReport = {
  id: "report-1",
  name: "Sprint Metrics",
  reportType: "PowerBIReport",
  webUrl: "https://app.powerbi.com/groups/group-1/reports/report-1",
  embedUrl: "https://app.powerbi.com/reportEmbed?reportId=report-1&groupId=group-1",
  datasetId: "dataset-1",
};

const sampleEmbedToken = {
  token: "embed-token-abc123",
  tokenId: "token-id-1",
  expiration: "2026-02-15T00:00:00Z",
};

describe("PowerBIClient", () => {
  let client: PowerBIClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new PowerBIClient("pbi-access-token");
  });

  describe("listReports", () => {
    it("should list reports in a workspace", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ value: [sampleReport] }),
      );

      const reports = await client.listReports("group-1");

      expect(reports).toHaveLength(1);
      expect(reports[0]!.name).toBe("Sprint Metrics");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.powerbi.com/v1.0/myorg/groups/group-1/reports",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer pbi-access-token",
          }),
        }),
      );
    });
  });

  describe("getReport", () => {
    it("should fetch a specific report", async () => {
      mockFetch.mockResolvedValue(jsonResponse(sampleReport));

      const report = await client.getReport("report-1", "group-1");

      expect(report.id).toBe("report-1");
      expect(report.embedUrl).toContain("reportEmbed");
    });

    it("should throw IntegrationError on 404", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ error: "Not found" }, 404));

      await expect(client.getReport("missing", "group-1")).rejects.toThrow(
        "Power BI: API request failed: 404",
      );
    });
  });

  describe("getEmbedToken", () => {
    it("should generate an embed token for a report", async () => {
      mockFetch.mockResolvedValue(jsonResponse(sampleEmbedToken));

      const token = await client.getEmbedToken("report-1", "group-1");

      expect(token.token).toBe("embed-token-abc123");
      expect(token.expiration).toBe("2026-02-15T00:00:00Z");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.powerbi.com/v1.0/myorg/groups/group-1/reports/report-1/GenerateToken",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ accessLevel: "View" }),
        }),
      );
    });
  });

  describe("refreshDataset", () => {
    it("should trigger a dataset refresh", async () => {
      mockFetch.mockResolvedValue(jsonResponse(null, 202));

      await client.refreshDataset("group-1", "dataset-1");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.powerbi.com/v1.0/myorg/groups/group-1/datasets/dataset-1/refreshes",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  describe("listDatasets", () => {
    it("should list datasets in a workspace", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({
          value: [
            { id: "ds-1", name: "Sprint Data", webUrl: "", isRefreshable: true },
          ],
        }),
      );

      const datasets = await client.listDatasets("group-1");

      expect(datasets).toHaveLength(1);
      expect(datasets[0]!.name).toBe("Sprint Data");
    });
  });

  describe("listGroups", () => {
    it("should list accessible workspaces", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({
          value: [
            { id: "g-1", name: "Engineering", isReadOnly: false, isOnDedicatedCapacity: true },
          ],
        }),
      );

      const groups = await client.listGroups();

      expect(groups).toHaveLength(1);
      expect(groups[0]!.name).toBe("Engineering");
    });
  });
});

describe("generateEmbedConfig", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should generate a complete embed config", async () => {
    // First call: getReport, Second call: getEmbedToken
    mockFetch
      .mockResolvedValueOnce(jsonResponse(sampleReport))
      .mockResolvedValueOnce(jsonResponse(sampleEmbedToken));

    const config = await generateEmbedConfig("token", "report-1", "group-1");

    expect(config.reportId).toBe("report-1");
    expect(config.embedUrl).toBe(sampleReport.embedUrl);
    expect(config.accessToken).toBe("embed-token-abc123");
    expect(config.tokenType).toBe("Embed");
    expect(config.expiration).toBe("2026-02-15T00:00:00Z");
  });

  it("should include optional page name and filter", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(sampleReport))
      .mockResolvedValueOnce(jsonResponse(sampleEmbedToken));

    const config = await generateEmbedConfig("token", "report-1", "group-1", {
      pageName: "ReportSection1",
      filter: "Project eq 'Ordolix'",
    });

    expect(config.pageName).toBe("ReportSection1");
    expect(config.filter).toBe("Project eq 'Ordolix'");
  });

  it("should throw if report has no embed URL", async () => {
    const noEmbedReport = { ...sampleReport, embedUrl: "" };
    mockFetch
      .mockResolvedValueOnce(jsonResponse(noEmbedReport))
      .mockResolvedValueOnce(jsonResponse(sampleEmbedToken));

    await expect(
      generateEmbedConfig("token", "report-1", "group-1"),
    ).rejects.toThrow("Report does not have an embed URL");
  });
});

describe("buildReportMetadata", () => {
  it("should build normalized metadata from a report", () => {
    const metadata = buildReportMetadata(sampleReport, "group-1", "2026-02-14T12:00:00Z");

    expect(metadata).toEqual({
      id: "report-1",
      name: "Sprint Metrics",
      reportType: "PowerBIReport",
      webUrl: sampleReport.webUrl,
      datasetId: "dataset-1",
      groupId: "group-1",
      lastRefreshed: "2026-02-14T12:00:00Z",
    });
  });

  it("should omit lastRefreshed when not provided", () => {
    const metadata = buildReportMetadata(sampleReport, "group-1");
    expect(metadata.lastRefreshed).toBeUndefined();
  });
});
