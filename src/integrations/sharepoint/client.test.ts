/**
 * Tests for the SharePoint (Microsoft Graph) client.
 *
 * @module integrations/sharepoint/client.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SharePointClient } from "./client";
import type { SharePointSite, SharePointListItem, SharePointDriveItem } from "./types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function createMockDb() {
  return {
    sharePointLink: {
      create: vi.fn().mockResolvedValue({ id: "spl-1" }),
    },
  } as unknown as import("@prisma/client").PrismaClient;
}

const sampleSite: SharePointSite = {
  id: "site-123",
  name: "engineering",
  displayName: "Engineering",
  webUrl: "https://contoso.sharepoint.com/sites/engineering",
  createdDateTime: "2025-01-01T00:00:00Z",
  lastModifiedDateTime: "2026-01-01T00:00:00Z",
};

describe("SharePointClient", () => {
  let client: SharePointClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new SharePointClient("eyJ0eXAiOiJKV1Qi...");
  });

  describe("getSite", () => {
    it("should fetch a SharePoint site by ID", async () => {
      mockFetch.mockResolvedValue(jsonResponse(sampleSite));

      const site = await client.getSite("site-123");

      expect(site.id).toBe("site-123");
      expect(site.displayName).toBe("Engineering");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/sites/site-123",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer eyJ0eXAiOiJKV1Qi...",
          }),
        }),
      );
    });

    it("should throw IntegrationError on 403", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ error: { code: "accessDenied" } }, 403));

      await expect(client.getSite("forbidden-site")).rejects.toThrow(
        "SharePoint: Graph API request failed: 403",
      );
    });
  });

  describe("getLists", () => {
    it("should return lists for a site", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({
          value: [
            { id: "list-1", name: "Tasks", displayName: "Tasks", webUrl: "", createdDateTime: "", lastModifiedDateTime: "" },
            { id: "list-2", name: "Documents", displayName: "Documents", webUrl: "", createdDateTime: "", lastModifiedDateTime: "" },
          ],
        }),
      );

      const lists = await client.getLists("site-123");
      expect(lists).toHaveLength(2);
      expect(lists[0]!.name).toBe("Tasks");
    });
  });

  describe("getListItems", () => {
    it("should fetch list items with expanded fields", async () => {
      const items: SharePointListItem[] = [
        {
          id: "item-1",
          webUrl: "https://contoso.sharepoint.com/lists/Tasks/1",
          createdDateTime: "2026-01-01T00:00:00Z",
          lastModifiedDateTime: "2026-01-01T00:00:00Z",
          fields: { Title: "Task 1", Status: "Active" },
        },
      ];
      mockFetch.mockResolvedValue(jsonResponse({ value: items }));

      const result = await client.getListItems("site-123", "Tasks", 10);

      expect(result).toHaveLength(1);
      expect(result[0]!.fields).toEqual({ Title: "Task 1", Status: "Active" });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/sites/site-123/lists/Tasks/items?$expand=fields&$top=10",
        expect.any(Object),
      );
    });
  });

  describe("searchDocuments", () => {
    it("should POST a search query to the search API", async () => {
      const searchResult = {
        hitsContainers: [
          {
            total: 1,
            moreResultsAvailable: false,
            hits: [
              {
                hitId: "hit-1",
                rank: 1,
                summary: "Architecture doc",
                resource: {
                  id: "doc-1",
                  name: "architecture.docx",
                  webUrl: "https://contoso.sharepoint.com/docs/architecture.docx",
                  createdDateTime: "",
                  lastModifiedDateTime: "",
                },
              },
            ],
          },
        ],
      };
      mockFetch.mockResolvedValue(jsonResponse(searchResult));

      const result = await client.searchDocuments("architecture");

      expect(result.hitsContainers[0]!.hits).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/search/query",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("architecture"),
        }),
      );
    });
  });

  describe("getDocuments", () => {
    it("should fetch root drive items when no folder specified", async () => {
      const items: SharePointDriveItem[] = [
        {
          id: "file-1",
          name: "readme.md",
          webUrl: "https://contoso.sharepoint.com/docs/readme.md",
          file: { mimeType: "text/markdown" },
          createdDateTime: "",
          lastModifiedDateTime: "",
        },
      ];
      mockFetch.mockResolvedValue(jsonResponse({ value: items }));

      const result = await client.getDocuments("site-123");

      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/sites/site-123/drive/root/children",
        expect.any(Object),
      );
    });

    it("should fetch folder contents when folder ID specified", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ value: [] }));

      await client.getDocuments("site-123", "folder-abc");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/sites/site-123/drive/items/folder-abc/children",
        expect.any(Object),
      );
    });
  });

  describe("linkDocument", () => {
    it("should create a SharePointLink record", async () => {
      const db = createMockDb();

      await client.linkDocument(
        db,
        "issue-1",
        "doc-abc",
        "document",
        "https://contoso.sharepoint.com/docs/spec.docx",
        "Project Spec",
        { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      );

      expect(db.sharePointLink.create).toHaveBeenCalledWith({
        data: {
          issueId: "issue-1",
          resourceId: "doc-abc",
          resourceType: "document",
          url: "https://contoso.sharepoint.com/docs/spec.docx",
          title: "Project Spec",
          preview: { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
        },
      });
    });

    it("should set preview to Prisma.JsonNull when not provided", async () => {
      const db = createMockDb();

      await client.linkDocument(
        db,
        "issue-1",
        "page-1",
        "page",
        "https://contoso.sharepoint.com/pages/readme",
        "ReadMe Page",
      );

      const call = (db.sharePointLink.create as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(call.data.issueId).toBe("issue-1");
      expect(call.data.resourceType).toBe("page");
      expect(call.data.title).toBe("ReadMe Page");
      // Prisma.JsonNull is used instead of null for nullable JSON fields
      expect(call.data.preview).toBeDefined();
    });
  });
});
