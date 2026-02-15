/**
 * Unit tests for Omnea integration service.
 *
 * @module integrations/omnea/omnea-service-test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the integration config module before importing the service
vi.mock("@/integrations/config", () => ({
  getIntegrationConfig: vi.fn(),
  saveIntegrationConfig: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import * as omneaService from "./omnea-service";
import { getIntegrationConfig, saveIntegrationConfig } from "@/integrations/config";

const mockGetConfig = getIntegrationConfig as ReturnType<typeof vi.fn>;
const mockSaveConfig = saveIntegrationConfig as ReturnType<typeof vi.fn>;

function createMockDb() {
  return {
    integrationConfig: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
    omneaMapping: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    procurementRequest: {
      findFirst: vi.fn(),
    },
    softwareLicense: {
      findFirst: vi.fn(),
    },
  } as unknown as Parameters<typeof omneaService.getOmneaConfig>[0];
}

describe("createOmneaClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a client with correct base URL", () => {
    const client = omneaService.createOmneaClient({
      apiUrl: "https://api.omnea.com/",
      apiKey: "test-key",
    });

    expect(client).toBeDefined();
    expect(client.listRequests).toBeInstanceOf(Function);
    expect(client.getRequest).toBeInstanceOf(Function);
    expect(client.createRequest).toBeInstanceOf(Function);
    expect(client.updateRequest).toBeInstanceOf(Function);
  });

  it("listRequests calls the correct endpoint", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [{ id: "req-1", title: "Test" }] }),
    });

    const client = omneaService.createOmneaClient({
      apiUrl: "https://api.omnea.com",
      apiKey: "test-key",
    });

    const result = await client.listRequests();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.omnea.com/api/v1/requests",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
    expect(result).toEqual([{ id: "req-1", title: "Test" }]);
  });

  it("getRequest calls the correct endpoint with ID", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: "req-1", title: "Test", status: "pending" } }),
    });

    const client = omneaService.createOmneaClient({
      apiUrl: "https://api.omnea.com",
      apiKey: "key",
    });

    const result = await client.getRequest("req-1");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.omnea.com/api/v1/requests/req-1",
      expect.any(Object),
    );
    expect(result).toEqual({ id: "req-1", title: "Test", status: "pending" });
  });

  it("createRequest sends POST with data", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: "req-new", title: "New" } }),
    });

    const client = omneaService.createOmneaClient({
      apiUrl: "https://api.omnea.com",
      apiKey: "key",
    });

    await client.createRequest({ title: "New Request" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.omnea.com/api/v1/requests",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "New Request" }),
      }),
    );
  });

  it("updateRequest sends PATCH to the correct endpoint", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: "req-1", status: "approved" } }),
    });

    const client = omneaService.createOmneaClient({
      apiUrl: "https://api.omnea.com",
      apiKey: "key",
    });

    await client.updateRequest("req-1", { status: "approved" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.omnea.com/api/v1/requests/req-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "approved" }),
      }),
    );
  });

  it("throws IntegrationError on non-2xx response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: () => Promise.resolve("Invalid token"),
    });

    const client = omneaService.createOmneaClient({
      apiUrl: "https://api.omnea.com",
      apiKey: "bad-key",
    });

    await expect(client.listRequests()).rejects.toThrow("API request failed: 401");
  });

  it("strips trailing slash from base URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });

    const client = omneaService.createOmneaClient({
      apiUrl: "https://api.omnea.com/",
      apiKey: "key",
    });

    await client.listRequests();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.omnea.com/api/v1/requests",
      expect.any(Object),
    );
  });
});

describe("getOmneaConfig", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("returns null when no config exists", async () => {
    mockGetConfig.mockResolvedValue(null);

    const result = await omneaService.getOmneaConfig(db, "org-1");

    expect(result).toBeNull();
  });

  it("returns sanitized config without tokens", async () => {
    mockGetConfig.mockResolvedValue({
      id: "cfg-1",
      config: { apiUrl: "https://api.omnea.com", webhookUrl: "https://hook.example.com" },
      tokens: { accessToken: "secret-key" },
      webhookSecret: null,
      isActive: true,
    });

    const result = await omneaService.getOmneaConfig(db, "org-1");

    expect(result).toEqual({
      id: "cfg-1",
      isActive: true,
      apiUrl: "https://api.omnea.com",
      webhookUrl: "https://hook.example.com",
      hasApiKey: true,
    });
  });

  it("returns hasApiKey false when no access token", async () => {
    mockGetConfig.mockResolvedValue({
      id: "cfg-1",
      config: { apiUrl: "https://api.omnea.com" },
      tokens: null,
      webhookSecret: null,
      isActive: false,
    });

    const result = await omneaService.getOmneaConfig(db, "org-1");

    expect(result?.hasApiKey).toBe(false);
    expect(result?.isActive).toBe(false);
  });
});

describe("configureOmnea", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("saves integration config with correct parameters", async () => {
    mockSaveConfig.mockResolvedValue({ id: "cfg-1" });

    const result = await omneaService.configureOmnea(db, "org-1", {
      apiUrl: "https://api.omnea.com",
      apiKey: "test-key",
      webhookUrl: "https://hook.example.com",
      isActive: true,
    });

    expect(mockSaveConfig).toHaveBeenCalledWith(
      db,
      "org-1",
      "omnea",
      { apiUrl: "https://api.omnea.com", webhookUrl: "https://hook.example.com" },
      { accessToken: "test-key" },
    );
    expect(result).toEqual({ id: "cfg-1" });
  });
});

describe("Mapping CRUD", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  describe("listOmneaRequests", () => {
    it("returns paginated results with total count", async () => {
      const mockItems = [
        { id: "m-1", omneaRequestId: "req-1", status: "synced" },
        { id: "m-2", omneaRequestId: "req-2", status: "pending" },
      ];
      (db.omneaMapping.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockItems);
      (db.omneaMapping.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);

      const result = await omneaService.listOmneaRequests(db, "org-1");

      expect(result).toEqual({
        items: mockItems,
        total: 2,
        nextCursor: "m-2",
      });
    });

    it("applies status filter", async () => {
      (db.omneaMapping.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (db.omneaMapping.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      await omneaService.listOmneaRequests(db, "org-1", { status: "synced", limit: 50 });

      expect(db.omneaMapping.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            status: "synced",
          }),
        }),
      );
    });

    it("applies search filter on omneaRequestId", async () => {
      (db.omneaMapping.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (db.omneaMapping.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      await omneaService.listOmneaRequests(db, "org-1", { search: "req-1", limit: 50 });

      expect(db.omneaMapping.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            omneaRequestId: { contains: "req-1", mode: "insensitive" },
          }),
        }),
      );
    });

    it("returns null nextCursor when no items", async () => {
      (db.omneaMapping.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (db.omneaMapping.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await omneaService.listOmneaRequests(db, "org-1");

      expect(result.nextCursor).toBeNull();
    });
  });

  describe("getOmneaMapping", () => {
    it("returns mapping when found", async () => {
      const mockMapping = { id: "m-1", organizationId: "org-1", omneaRequestId: "req-1" };
      (db.omneaMapping.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      const result = await omneaService.getOmneaMapping(db, "org-1", "m-1");

      expect(result).toEqual(mockMapping);
    });

    it("throws NotFoundError when mapping not found", async () => {
      (db.omneaMapping.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(omneaService.getOmneaMapping(db, "org-1", "m-1")).rejects.toThrow("not found");
    });
  });

  describe("createOmneaMapping", () => {
    it("creates mapping with procurement request", async () => {
      const mockMapping = {
        id: "m-1",
        organizationId: "org-1",
        omneaRequestId: "req-1",
        procurementRequestId: "pr-1",
      };
      (db.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "pr-1" });
      (db.omneaMapping.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      const result = await omneaService.createOmneaMapping(db, "org-1", {
        omneaRequestId: "req-1",
        procurementRequestId: "pr-1",
        metadata: {},
      });

      expect(result).toEqual(mockMapping);
      expect(db.omneaMapping.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "org-1",
          omneaRequestId: "req-1",
          procurementRequestId: "pr-1",
          licenseId: null,
          status: "pending",
        }),
      });
    });

    it("creates mapping with license ID", async () => {
      (db.softwareLicense.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "lic-1" });
      (db.omneaMapping.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m-1" });

      await omneaService.createOmneaMapping(db, "org-1", {
        omneaRequestId: "req-1",
        licenseId: "lic-1",
        metadata: {},
      });

      expect(db.omneaMapping.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          licenseId: "lic-1",
          procurementRequestId: null,
        }),
      });
    });

    it("throws ValidationError when neither procurementRequestId nor licenseId provided", async () => {
      await expect(
        omneaService.createOmneaMapping(db, "org-1", {
          omneaRequestId: "req-1",
          metadata: {},
        }),
      ).rejects.toThrow("At least one of procurementRequestId or licenseId must be provided");
    });

    it("throws NotFoundError when procurement request does not exist", async () => {
      (db.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        omneaService.createOmneaMapping(db, "org-1", {
          omneaRequestId: "req-1",
          procurementRequestId: "pr-missing",
          metadata: {},
        }),
      ).rejects.toThrow("not found");
    });

    it("throws NotFoundError when license does not exist", async () => {
      (db.softwareLicense.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        omneaService.createOmneaMapping(db, "org-1", {
          omneaRequestId: "req-1",
          licenseId: "lic-missing",
          metadata: {},
        }),
      ).rejects.toThrow("not found");
    });
  });

  describe("deleteOmneaMapping", () => {
    it("deletes mapping when found", async () => {
      const mockMapping = { id: "m-1", organizationId: "org-1" };
      (db.omneaMapping.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);
      (db.omneaMapping.delete as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      const result = await omneaService.deleteOmneaMapping(db, "org-1", "m-1");

      expect(result).toEqual(mockMapping);
      expect(db.omneaMapping.delete).toHaveBeenCalledWith({ where: { id: "m-1" } });
    });

    it("throws NotFoundError when mapping not found", async () => {
      (db.omneaMapping.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(omneaService.deleteOmneaMapping(db, "org-1", "m-1")).rejects.toThrow("not found");
    });
  });
});

describe("syncProcurementRequest", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("throws NotFoundError when procurement request does not exist", async () => {
    (db.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      omneaService.syncProcurementRequest(db, "org-1", "pr-missing"),
    ).rejects.toThrow("not found");
  });

  it("throws IntegrationError when integration not configured", async () => {
    (db.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "pr-1",
      title: "Test",
      organizationId: "org-1",
    });
    mockGetConfig.mockResolvedValue(null);

    await expect(
      omneaService.syncProcurementRequest(db, "org-1", "pr-1"),
    ).rejects.toThrow("not configured or not active");
  });

  it("pushes procurement request to Omnea and creates mapping", async () => {
    (db.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "pr-1",
      title: "Test Request",
      description: "Desc",
      estimatedCost: 1000,
      quantity: 5,
      status: "approved",
      requestNumber: "PR-00001",
      organizationId: "org-1",
    });

    mockGetConfig.mockResolvedValue({
      id: "cfg-1",
      config: { apiUrl: "https://api.omnea.com" },
      tokens: { accessToken: "key" },
      isActive: true,
      webhookSecret: null,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { id: "omnea-req-1", title: "Test Request", status: "pending" },
        }),
    });

    const mockMapping = { id: "m-1", omneaRequestId: "omnea-req-1", status: "synced" };
    (db.omneaMapping.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

    const result = await omneaService.syncProcurementRequest(db, "org-1", "pr-1");

    expect(result).toEqual(mockMapping);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.omnea.com/api/v1/requests",
      expect.objectContaining({ method: "POST" }),
    );
    expect(db.omneaMapping.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_omneaRequestId: {
            organizationId: "org-1",
            omneaRequestId: "omnea-req-1",
          },
        },
        create: expect.objectContaining({
          omneaRequestId: "omnea-req-1",
          procurementRequestId: "pr-1",
          status: "synced",
        }),
      }),
    );
  });
});

describe("syncLicenseFromOmnea", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("throws IntegrationError when integration not configured", async () => {
    mockGetConfig.mockResolvedValue(null);

    await expect(
      omneaService.syncLicenseFromOmnea(db, "org-1", "omnea-req-1"),
    ).rejects.toThrow("not configured or not active");
  });

  it("creates a new mapping when none exists", async () => {
    mockGetConfig.mockResolvedValue({
      id: "cfg-1",
      config: { apiUrl: "https://api.omnea.com" },
      tokens: { accessToken: "key" },
      isActive: true,
      webhookSecret: null,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            id: "omnea-req-1",
            title: "License Request",
            status: "approved",
            vendor: "Acme",
            licenseType: "subscription",
            totalCost: 5000,
          },
        }),
    });

    (db.omneaMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const mockMapping = { id: "m-new", status: "synced" };
    (db.omneaMapping.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

    const result = await omneaService.syncLicenseFromOmnea(db, "org-1", "omnea-req-1");

    expect(result).toEqual(mockMapping);
    expect(db.omneaMapping.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        omneaRequestId: "omnea-req-1",
        status: "synced",
      }),
    });
  });

  it("updates existing mapping", async () => {
    mockGetConfig.mockResolvedValue({
      id: "cfg-1",
      config: { apiUrl: "https://api.omnea.com" },
      tokens: { accessToken: "key" },
      isActive: true,
      webhookSecret: null,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            id: "omnea-req-1",
            title: "License Request",
            status: "approved",
          },
        }),
    });

    const existing = { id: "m-1", status: "pending", organizationId: "org-1" };
    (db.omneaMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    const updated = { id: "m-1", status: "synced" };
    (db.omneaMapping.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

    const result = await omneaService.syncLicenseFromOmnea(db, "org-1", "omnea-req-1");

    expect(result).toEqual(updated);
    expect(db.omneaMapping.update).toHaveBeenCalledWith({
      where: { id: "m-1" },
      data: expect.objectContaining({
        status: "synced",
      }),
    });
  });
});

describe("syncAll", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("throws IntegrationError when not configured", async () => {
    mockGetConfig.mockResolvedValue(null);

    await expect(omneaService.syncAll(db, "org-1")).rejects.toThrow(
      "not configured or not active",
    );
  });

  it("syncs all requests from Omnea", async () => {
    mockGetConfig.mockResolvedValue({
      id: "cfg-1",
      config: { apiUrl: "https://api.omnea.com" },
      tokens: { accessToken: "key" },
      isActive: true,
      webhookSecret: null,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: [
            { id: "req-1", title: "Req 1", status: "pending" },
            { id: "req-2", title: "Req 2", status: "approved" },
          ],
        }),
    });

    // req-1 already exists, req-2 is new
    (db.omneaMapping.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: "m-1" })
      .mockResolvedValueOnce(null);
    (db.omneaMapping.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m-1" });
    (db.omneaMapping.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m-2" });

    const result = await omneaService.syncAll(db, "org-1");

    expect(result).toEqual({
      synced: 1,
      created: 1,
      errors: 0,
      total: 2,
    });
  });

  it("counts errors without throwing", async () => {
    mockGetConfig.mockResolvedValue({
      id: "cfg-1",
      config: { apiUrl: "https://api.omnea.com" },
      tokens: { accessToken: "key" },
      isActive: true,
      webhookSecret: null,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: [{ id: "req-1", title: "Req 1", status: "pending" }],
        }),
    });

    (db.omneaMapping.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error"),
    );

    const result = await omneaService.syncAll(db, "org-1");

    expect(result).toEqual({
      synced: 0,
      created: 0,
      errors: 1,
      total: 1,
    });
  });
});

describe("handleOmneaWebhook", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("updates existing mapping on request.approved event", async () => {
    const existing = {
      id: "m-1",
      metadata: { title: "Old" },
    };
    (db.omneaMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (db.omneaMapping.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m-1" });

    const result = await omneaService.handleOmneaWebhook(db, "org-1", {
      event: "request.approved",
      requestId: "omnea-req-1",
      status: "approved",
      data: { approver: "user-1" },
    });

    expect(result).toEqual({ processed: true, event: "request.approved", requestId: "omnea-req-1" });
    expect(db.omneaMapping.update).toHaveBeenCalledWith({
      where: { id: "m-1" },
      data: expect.objectContaining({
        status: "synced",
        metadata: expect.objectContaining({
          omneaStatus: "approved",
          lastWebhookEvent: "request.approved",
        }),
      }),
    });
  });

  it("creates mapping on request.approved when none exists", async () => {
    (db.omneaMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.omneaMapping.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m-new" });

    const result = await omneaService.handleOmneaWebhook(db, "org-1", {
      event: "request.approved",
      requestId: "omnea-req-1",
      status: "approved",
      data: {},
    });

    expect(result).toEqual({ processed: true, event: "request.approved", requestId: "omnea-req-1" });
    expect(db.omneaMapping.create).toHaveBeenCalled();
  });

  it("sets error status on request.rejected event", async () => {
    const existing = { id: "m-1", metadata: {} };
    (db.omneaMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (db.omneaMapping.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m-1" });

    await omneaService.handleOmneaWebhook(db, "org-1", {
      event: "request.rejected",
      requestId: "omnea-req-1",
      data: {},
    });

    expect(db.omneaMapping.update).toHaveBeenCalledWith({
      where: { id: "m-1" },
      data: expect.objectContaining({
        status: "error",
      }),
    });
  });

  it("marks mapping as deleted on request.deleted event", async () => {
    const existing = { id: "m-1", metadata: {} };
    (db.omneaMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (db.omneaMapping.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m-1" });

    const result = await omneaService.handleOmneaWebhook(db, "org-1", {
      event: "request.deleted",
      requestId: "omnea-req-1",
      data: {},
    });

    expect(result).toEqual({ processed: true, event: "request.deleted", requestId: "omnea-req-1" });
    expect(db.omneaMapping.update).toHaveBeenCalledWith({
      where: { id: "m-1" },
      data: expect.objectContaining({
        status: "deleted",
      }),
    });
  });

  it("ignores request.deleted when no mapping exists", async () => {
    (db.omneaMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await omneaService.handleOmneaWebhook(db, "org-1", {
      event: "request.deleted",
      requestId: "omnea-req-1",
      data: {},
    });

    expect(result).toEqual({ processed: true, event: "request.deleted", requestId: "omnea-req-1" });
    expect(db.omneaMapping.update).not.toHaveBeenCalled();
  });

  it("returns unprocessed for unknown event types", async () => {
    (db.omneaMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await omneaService.handleOmneaWebhook(db, "org-1", {
      event: "unknown.event",
      requestId: "omnea-req-1",
      data: {},
    });

    expect(result).toEqual({
      processed: false,
      event: "unknown.event",
      requestId: "omnea-req-1",
      reason: "Unhandled event: unknown.event",
    });
  });

  it("handles request.updated event", async () => {
    (db.omneaMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.omneaMapping.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m-new" });

    const result = await omneaService.handleOmneaWebhook(db, "org-1", {
      event: "request.updated",
      requestId: "omnea-req-1",
      status: "in_review",
      data: { field: "status" },
    });

    expect(result).toEqual({ processed: true, event: "request.updated", requestId: "omnea-req-1" });
    expect(db.omneaMapping.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "synced",
        metadata: expect.objectContaining({
          omneaStatus: "in_review",
          lastWebhookEvent: "request.updated",
        }),
      }),
    });
  });
});
