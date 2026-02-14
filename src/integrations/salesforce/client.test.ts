/**
 * Tests for the Salesforce REST API client and sync logic.
 *
 * @module integrations/salesforce/client.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SalesforceClient } from "./client";
import { syncIssueToCase, syncCaseToIssue } from "./sync";
import type { SalesforceRecord, SalesforceCase } from "./types";

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

function createMockDb() {
  return {
    issue: {
      findFirst: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    salesforceLink: {
      create: vi.fn().mockResolvedValue({ id: "sfl-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  } as unknown as import("@prisma/client").PrismaClient;
}

describe("SalesforceClient", () => {
  let client: SalesforceClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new SalesforceClient("https://myorg.my.salesforce.com", "sf-token-123");
  });

  describe("query", () => {
    it("should execute a SOQL query", async () => {
      const queryResult = {
        totalSize: 2,
        done: true,
        records: [
          { Id: "001", Name: "Test 1", attributes: { type: "Case", url: "/services/data/v59.0/sobjects/Case/001" } },
          { Id: "002", Name: "Test 2", attributes: { type: "Case", url: "/services/data/v59.0/sobjects/Case/002" } },
        ],
      };
      mockFetch.mockResolvedValue(jsonResponse(queryResult));

      const result = await client.query("SELECT Id, Name FROM Case LIMIT 2");

      expect(result.totalSize).toBe(2);
      expect(result.records).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/query?q=SELECT"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer sf-token-123",
          }),
        }),
      );
    });

    it("should URL-encode the SOQL query", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ totalSize: 0, done: true, records: [] }));

      await client.query("SELECT Id FROM Case WHERE Status = 'New'");

      const url = mockFetch.mock.calls[0]![0] as string;
      expect(url).toContain(encodeURIComponent("SELECT Id FROM Case WHERE Status = 'New'"));
    });
  });

  describe("getRecord", () => {
    it("should fetch a record by type and ID", async () => {
      const record: SalesforceRecord = {
        Id: "500xx000001",
        Name: "Case-001",
        Subject: "Test case",
        attributes: { type: "Case", url: "/services/data/v59.0/sobjects/Case/500xx000001" },
      };
      mockFetch.mockResolvedValue(jsonResponse(record));

      const result = await client.getRecord("Case", "500xx000001");

      expect(result.Id).toBe("500xx000001");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://myorg.my.salesforce.com/services/data/v59.0/sobjects/Case/500xx000001",
        expect.any(Object),
      );
    });

    it("should include fields parameter when specified", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({
          Id: "500xx000001",
          Subject: "Test",
          attributes: { type: "Case", url: "" },
        }),
      );

      await client.getRecord("Case", "500xx000001", ["Id", "Subject"]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("?fields=Id,Subject"),
        expect.any(Object),
      );
    });

    it("should throw IntegrationError on 404", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(
          [{ errorCode: "NOT_FOUND", message: "Record not found" }],
          404,
        ),
      );

      await expect(client.getRecord("Case", "invalid")).rejects.toThrow(
        "Salesforce: API request failed: NOT_FOUND: Record not found",
      );
    });
  });

  describe("updateRecord", () => {
    it("should PATCH a record with field updates", async () => {
      mockFetch.mockResolvedValue(jsonResponse(null, 204));

      await client.updateRecord("Case", "500xx000001", {
        Subject: "Updated subject",
        Status: "Working",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://myorg.my.salesforce.com/services/data/v59.0/sobjects/Case/500xx000001",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ Subject: "Updated subject", Status: "Working" }),
        }),
      );
    });
  });

  describe("createRecord", () => {
    it("should POST a new record", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ id: "500xx000099", success: true }, 201),
      );

      const result = await client.createRecord("Case", {
        Subject: "New case from Ordolix",
        Description: "Created via integration",
      });

      expect(result.id).toBe("500xx000099");
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://myorg.my.salesforce.com/services/data/v59.0/sobjects/Case",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("linkRecord", () => {
    it("should create a SalesforceLink record", async () => {
      const db = createMockDb();

      await client.linkRecord(db, {
        issueId: "issue-1",
        recordType: "Case",
        recordId: "500xx000001",
        displayName: "Case-001: Test case",
      });

      expect(db.salesforceLink.create).toHaveBeenCalledWith({
        data: {
          issueId: "issue-1",
          recordType: "Case",
          recordId: "500xx000001",
          displayName: "Case-001: Test case",
          syncStatus: "active",
          fieldMapping: {},
        },
      });
    });

    it("should include field mapping when provided", async () => {
      const db = createMockDb();

      await client.linkRecord(db, {
        issueId: "issue-1",
        recordType: "Case",
        recordId: "500xx000001",
        displayName: "Case-001",
        fieldMapping: { summary: "Subject", description: "Description" },
      });

      expect(db.salesforceLink.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fieldMapping: { summary: "Subject", description: "Description" },
        }),
      });
    });
  });
});

describe("syncIssueToCase", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    mockFetch.mockReset();
  });

  it("should sync issue fields to a Salesforce Case", async () => {
    (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "issue-1",
      summary: "Bug in login",
      description: "Users cannot log in",
      status: { name: "Open", category: "TO_DO" },
      priority: { name: "High" },
      labels: ["bug"],
      customFieldValues: {},
    });
    mockFetch.mockResolvedValue(jsonResponse(null, 204));

    const sfClient = new SalesforceClient("https://myorg.my.salesforce.com", "token");
    const result = await syncIssueToCase(db, "org-1", "issue-1", "500xx000001", sfClient);

    expect(result.success).toBe(true);
    expect(result.fieldsUpdated).toContain("Subject");
    expect(result.fieldsUpdated).toContain("Description");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/sobjects/Case/500xx000001"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          Subject: "Bug in login",
          Description: "Users cannot log in",
        }),
      }),
    );
  });

  it("should return error when issue not found", async () => {
    (db.issue.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const sfClient = new SalesforceClient("https://myorg.my.salesforce.com", "token");
    const result = await syncIssueToCase(db, "org-1", "missing", "500xx000001", sfClient);

    expect(result.success).toBe(false);
    expect(result.errors).toContain("Issue missing not found");
  });
});

describe("syncCaseToIssue", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    mockFetch.mockReset();
  });

  it("should sync Salesforce Case fields to an issue", async () => {
    const sfCase: SalesforceCase = {
      Id: "500xx000001",
      CaseNumber: "00001",
      Subject: "Updated from SF",
      Description: "New description from SF",
      Status: "Working",
      Priority: "High",
      Origin: "Web",
      ContactId: null,
      AccountId: null,
      attributes: { type: "Case", url: "" },
    };
    mockFetch.mockResolvedValue(jsonResponse(sfCase));

    const sfClient = new SalesforceClient("https://myorg.my.salesforce.com", "token");
    const result = await syncCaseToIssue(db, "org-1", "500xx000001", "issue-1", sfClient);

    expect(result.success).toBe(true);
    expect(result.fieldsUpdated).toContain("summary");
    expect(result.fieldsUpdated).toContain("description");
    expect(db.issue.updateMany).toHaveBeenCalledWith({
      where: { id: "issue-1", organizationId: "org-1" },
      data: expect.objectContaining({
        summary: "Updated from SF",
        description: "New description from SF",
      }),
    });
  });

  it("should return error when Salesforce fetch fails", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse([{ errorCode: "NOT_FOUND", message: "Not found" }], 404),
    );

    const sfClient = new SalesforceClient("https://myorg.my.salesforce.com", "token");
    const result = await syncCaseToIssue(db, "org-1", "invalid", "issue-1", sfClient);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
