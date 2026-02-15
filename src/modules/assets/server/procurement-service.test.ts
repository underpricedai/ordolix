/**
 * Tests for procurement-service.
 *
 * @description Verifies procurement request lifecycle, purchase order
 * management, invoice matching, and number generation.
 *
 * @module procurement-service-test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  createProcurementRequest,
  getProcurementRequest,
  listProcurementRequests,
  submitForApproval,
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  receiveOrder,
  matchInvoice,
  cancelOrder,
  generateRequestNumber,
  generateOrderNumber,
} from "./procurement-service";
import { NotFoundError, ValidationError, ConflictError } from "@/server/lib/errors";

const orgId = "org-1";

function createMockDb() {
  return {
    procurementRequest: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    procurementApproval: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    procurementOrder: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    procurementLineItem: {
      createMany: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  } as unknown as PrismaClient;
}

let mockDb: ReturnType<typeof createMockDb>;

beforeEach(() => {
  mockDb = createMockDb();
  vi.clearAllMocks();
});

// ── Number Generation ────────────────────────────────────────────────────────

describe("generateRequestNumber", () => {
  it("returns PR-00001 when no existing requests", async () => {
    (mockDb.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await generateRequestNumber(mockDb, orgId);
    expect(result).toBe("PR-00001");
  });

  it("increments from existing maximum request number", async () => {
    (mockDb.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      requestNumber: "PR-00042",
    });

    const result = await generateRequestNumber(mockDb, orgId);
    expect(result).toBe("PR-00043");
  });

  it("queries with correct organization filter and ordering", async () => {
    (mockDb.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await generateRequestNumber(mockDb, orgId);

    expect(mockDb.procurementRequest.findFirst).toHaveBeenCalledWith({
      where: { organizationId: orgId },
      orderBy: { requestNumber: "desc" },
      select: { requestNumber: true },
    });
  });
});

describe("generateOrderNumber", () => {
  it("returns PO-00001 when no existing orders", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await generateOrderNumber(mockDb, orgId);
    expect(result).toBe("PO-00001");
  });

  it("increments from existing maximum order number", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      orderNumber: "PO-00010",
    });

    const result = await generateOrderNumber(mockDb, orgId);
    expect(result).toBe("PO-00011");
  });
});

// ── Procurement Requests ─────────────────────────────────────────────────────

describe("createProcurementRequest", () => {
  it("creates a request with auto-generated number", async () => {
    (mockDb.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const created = {
      id: "req-1",
      requestNumber: "PR-00001",
      title: "New Laptops",
      status: "draft",
    };
    (mockDb.procurementRequest.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);

    const result = await createProcurementRequest(mockDb, orgId, {
      title: "New Laptops",
      quantity: 10,
      urgency: "high",
    }, "user-1");

    expect(result).toEqual(created);
    expect(mockDb.procurementRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: orgId,
        requestNumber: "PR-00001",
        requesterId: "user-1",
        title: "New Laptops",
        status: "draft",
        quantity: 10,
        urgency: "high",
      }),
    });
  });

  it("passes nullable fields correctly", async () => {
    (mockDb.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockDb.procurementRequest.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "req-1" });

    await createProcurementRequest(mockDb, orgId, {
      title: "Test",
      description: "A description",
      vendorId: "vendor-1",
      estimatedCost: 5000,
      quantity: 1,
      costCenter: "IT-OPS",
      urgency: "normal",
    }, "user-1");

    expect(mockDb.procurementRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: "A description",
        vendorId: "vendor-1",
        costCenter: "IT-OPS",
      }),
    });
  });
});

describe("getProcurementRequest", () => {
  it("returns request with related data", async () => {
    const request = {
      id: "req-1",
      organizationId: orgId,
      title: "Laptops",
      approvals: [],
      vendor: null,
      order: null,
    };
    (mockDb.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(request);

    const result = await getProcurementRequest(mockDb, orgId, "req-1");
    expect(result).toEqual(request);
  });

  it("throws NotFoundError when request does not exist", async () => {
    (mockDb.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      getProcurementRequest(mockDb, orgId, "non-existent"),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("listProcurementRequests", () => {
  it("returns paginated results with total", async () => {
    const items = [
      { id: "req-1", title: "Request 1" },
      { id: "req-2", title: "Request 2" },
    ];
    (mockDb.procurementRequest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(items);
    (mockDb.procurementRequest.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);

    const result = await listProcurementRequests(mockDb, orgId, {
      limit: 50,
    });

    expect(result.items).toEqual(items);
    expect(result.total).toBe(2);
    expect(result.nextCursor).toBe("req-2");
  });

  it("applies status and urgency filters", async () => {
    (mockDb.procurementRequest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockDb.procurementRequest.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await listProcurementRequests(mockDb, orgId, {
      status: "pending_approval",
      urgency: "critical",
      limit: 50,
    });

    expect(mockDb.procurementRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "pending_approval",
          urgency: "critical",
        }),
      }),
    );
  });

  it("applies search filter", async () => {
    (mockDb.procurementRequest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockDb.procurementRequest.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await listProcurementRequests(mockDb, orgId, {
      search: "laptop",
      limit: 50,
    });

    expect(mockDb.procurementRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          title: { contains: "laptop", mode: "insensitive" },
        }),
      }),
    );
  });

  it("returns null nextCursor when no items", async () => {
    (mockDb.procurementRequest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockDb.procurementRequest.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const result = await listProcurementRequests(mockDb, orgId);
    expect(result.nextCursor).toBeNull();
  });
});

describe("submitForApproval", () => {
  it("changes status from draft to pending_approval", async () => {
    (mockDb.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "req-1",
      status: "draft",
    });
    const updated = { id: "req-1", status: "pending_approval" };
    (mockDb.procurementRequest.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

    const result = await submitForApproval(mockDb, orgId, "req-1");
    expect(result.status).toBe("pending_approval");
  });

  it("throws NotFoundError when request does not exist", async () => {
    (mockDb.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      submitForApproval(mockDb, orgId, "non-existent"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError when request is not in draft status", async () => {
    (mockDb.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "req-1",
      status: "approved",
    });

    await expect(
      submitForApproval(mockDb, orgId, "req-1"),
    ).rejects.toThrow(ValidationError);
  });
});

// ── Purchase Orders ──────────────────────────────────────────────────────────

describe("createPurchaseOrder", () => {
  it("creates an order with auto-generated number", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const created = {
      id: "ord-1",
      orderNumber: "PO-00001",
      status: "ordered",
      lineItems: [],
    };
    (mockDb.procurementOrder.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);

    const result = await createPurchaseOrder(mockDb, orgId, null, {
      vendorId: "vendor-1",
      lineItems: [],
    });

    expect(result).toEqual(created);
    expect(mockDb.procurementOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderNumber: "PO-00001",
          status: "ordered",
          vendorId: "vendor-1",
        }),
      }),
    );
  });

  it("validates linked request is approved", async () => {
    // First call for order number generation (findFirst on procurementOrder)
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    // Call for request validation
    (mockDb.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "req-1",
      status: "draft",
      organizationId: orgId,
    });

    await expect(
      createPurchaseOrder(mockDb, orgId, "req-1", {
        vendorId: "vendor-1",
        lineItems: [],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws NotFoundError when linked request not found", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockDb.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      createPurchaseOrder(mockDb, orgId, "non-existent", {
        vendorId: "vendor-1",
        lineItems: [],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("updates linked request status to ordered", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockDb.procurementRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "req-1",
      status: "approved",
      organizationId: orgId,
    });
    (mockDb.procurementOrder.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ord-1",
      lineItems: [],
    });
    (mockDb.procurementRequest.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await createPurchaseOrder(mockDb, orgId, "req-1", {
      vendorId: "vendor-1",
      lineItems: [],
    });

    expect(mockDb.procurementRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { status: "ordered" },
    });
  });

  it("creates line items with order", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockDb.procurementOrder.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ord-1",
      lineItems: [{ id: "li-1" }],
    });

    await createPurchaseOrder(mockDb, orgId, null, {
      vendorId: "vendor-1",
      lineItems: [
        { description: "Laptop", quantity: 5, unitPrice: 1200 },
      ],
    });

    const createCall = (mockDb.procurementOrder.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(createCall.data.lineItems.create).toHaveLength(1);
    expect(createCall.data.lineItems.create[0].description).toBe("Laptop");
  });
});

describe("getPurchaseOrder", () => {
  it("returns order with related data", async () => {
    const order = {
      id: "ord-1",
      lineItems: [],
      vendor: { id: "v-1", name: "Acme" },
      procurementRequest: null,
    };
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    const result = await getPurchaseOrder(mockDb, orgId, "ord-1");
    expect(result).toEqual(order);
  });

  it("throws NotFoundError when order does not exist", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      getPurchaseOrder(mockDb, orgId, "non-existent"),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("listPurchaseOrders", () => {
  it("returns paginated results", async () => {
    const items = [{ id: "ord-1" }];
    (mockDb.procurementOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(items);
    (mockDb.procurementOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    const result = await listPurchaseOrders(mockDb, orgId, { limit: 50 });
    expect(result.items).toEqual(items);
    expect(result.total).toBe(1);
  });

  it("applies status and vendor filters", async () => {
    (mockDb.procurementOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockDb.procurementOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await listPurchaseOrders(mockDb, orgId, {
      status: "ordered",
      vendorId: "v-1",
      limit: 50,
    });

    expect(mockDb.procurementOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ordered",
          vendorId: "v-1",
        }),
      }),
    );
  });
});

describe("receiveOrder", () => {
  it("marks order as received", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ord-1",
      status: "ordered",
      procurementRequestId: null,
      lineItems: [],
    });
    const updated = { id: "ord-1", status: "received", lineItems: [] };
    (mockDb.procurementOrder.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

    const result = await receiveOrder(mockDb, orgId, "ord-1");
    expect(result.status).toBe("received");
  });

  it("links assets to line items when provided", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ord-1",
      status: "ordered",
      procurementRequestId: null,
      lineItems: [{ id: "li-1" }],
    });
    (mockDb.procurementLineItem.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (mockDb.procurementOrder.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ord-1",
      status: "received",
      lineItems: [],
    });

    await receiveOrder(mockDb, orgId, "ord-1", [
      { lineItemId: "li-1", assetId: "asset-1" },
    ]);

    expect(mockDb.procurementLineItem.update).toHaveBeenCalledWith({
      where: { id: "li-1" },
      data: { assetId: "asset-1" },
    });
  });

  it("updates linked procurement request to received", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ord-1",
      status: "ordered",
      procurementRequestId: "req-1",
      lineItems: [],
    });
    (mockDb.procurementOrder.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ord-1",
      status: "received",
      lineItems: [],
    });
    (mockDb.procurementRequest.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await receiveOrder(mockDb, orgId, "ord-1");

    expect(mockDb.procurementRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { status: "received" },
    });
  });

  it("throws NotFoundError when order does not exist", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      receiveOrder(mockDb, orgId, "non-existent"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError when order is cancelled", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ord-1",
      status: "cancelled",
      lineItems: [],
    });

    await expect(
      receiveOrder(mockDb, orgId, "ord-1"),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError when order is already received", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ord-1",
      status: "received",
      lineItems: [],
    });

    await expect(
      receiveOrder(mockDb, orgId, "ord-1"),
    ).rejects.toThrow(ValidationError);
  });
});

describe("matchInvoice", () => {
  it("records invoice data and sets status to invoiced", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ord-1",
      status: "received",
    });
    const updated = {
      id: "ord-1",
      status: "invoiced",
      invoiceNumber: "INV-001",
    };
    (mockDb.procurementOrder.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

    const invoiceDate = new Date("2026-02-01");
    const result = await matchInvoice(mockDb, orgId, "ord-1", {
      invoiceNumber: "INV-001",
      invoiceAmount: 12000,
      invoiceDate,
    });

    expect(result.status).toBe("invoiced");
    expect(mockDb.procurementOrder.update).toHaveBeenCalledWith({
      where: { id: "ord-1" },
      data: expect.objectContaining({
        invoiceNumber: "INV-001",
        invoiceDate,
        status: "invoiced",
      }),
    });
  });

  it("throws NotFoundError when order does not exist", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      matchInvoice(mockDb, orgId, "non-existent", {
        invoiceNumber: "INV-001",
        invoiceAmount: 100,
        invoiceDate: new Date(),
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError when order is cancelled", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ord-1",
      status: "cancelled",
    });

    await expect(
      matchInvoice(mockDb, orgId, "ord-1", {
        invoiceNumber: "INV-001",
        invoiceAmount: 100,
        invoiceDate: new Date(),
      }),
    ).rejects.toThrow(ValidationError);
  });
});

describe("cancelOrder", () => {
  it("cancels an ordered purchase order", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ord-1",
      status: "ordered",
    });
    const updated = { id: "ord-1", status: "cancelled" };
    (mockDb.procurementOrder.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

    const result = await cancelOrder(mockDb, orgId, "ord-1");
    expect(result.status).toBe("cancelled");
  });

  it("throws NotFoundError when order does not exist", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      cancelOrder(mockDb, orgId, "non-existent"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError when order has been received", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ord-1",
      status: "received",
    });

    await expect(
      cancelOrder(mockDb, orgId, "ord-1"),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ConflictError when order is already cancelled", async () => {
    (mockDb.procurementOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ord-1",
      status: "cancelled",
    });

    await expect(
      cancelOrder(mockDb, orgId, "ord-1"),
    ).rejects.toThrow(ConflictError);
  });
});
