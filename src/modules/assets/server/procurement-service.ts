/**
 * Procurement workflow service.
 *
 * @description Manages procurement requests, purchase orders,
 * invoice matching, and order receiving. Provides number generation,
 * status transitions, and full procurement lifecycle operations.
 *
 * @module procurement-service
 */

import type { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/server/lib/errors";
import type {
  CreateProcurementRequestInput,
  ListProcurementRequestsInput,
  CreatePurchaseOrderInput,
  ListPurchaseOrdersInput,
  ReceiveOrderInput,
  MatchInvoiceInput,
} from "../types/schemas";

// ── Number Generation ────────────────────────────────────────────────────────

/**
 * Generates the next procurement request number in "PR-00001" format.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @returns The next request number string
 */
export async function generateRequestNumber(
  db: PrismaClient,
  organizationId: string,
): Promise<string> {
  const latest = await db.procurementRequest.findFirst({
    where: { organizationId },
    orderBy: { requestNumber: "desc" },
    select: { requestNumber: true },
  });

  let nextNum = 1;
  if (latest?.requestNumber) {
    const match = latest.requestNumber.match(/PR-(\d+)/);
    if (match?.[1]) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `PR-${String(nextNum).padStart(5, "0")}`;
}

/**
 * Generates the next purchase order number in "PO-00001" format.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @returns The next order number string
 */
export async function generateOrderNumber(
  db: PrismaClient,
  organizationId: string,
): Promise<string> {
  const latest = await db.procurementOrder.findFirst({
    where: { organizationId },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });

  let nextNum = 1;
  if (latest?.orderNumber) {
    const match = latest.orderNumber.match(/PO-(\d+)/);
    if (match?.[1]) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `PO-${String(nextNum).padStart(5, "0")}`;
}

// ── Procurement Requests ─────────────────────────────────────────────────────

/**
 * Creates a new procurement request with auto-generated request number.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param input - Request creation data
 * @param requesterId - ID of the user creating the request
 * @returns The created procurement request
 */
export async function createProcurementRequest(
  db: PrismaClient,
  organizationId: string,
  input: CreateProcurementRequestInput,
  requesterId: string,
) {
  const requestNumber = await generateRequestNumber(db, organizationId);

  return db.procurementRequest.create({
    data: {
      organizationId,
      requestNumber,
      requesterId,
      title: input.title,
      description: input.description ?? null,
      vendorId: input.vendorId ?? null,
      estimatedCost: input.estimatedCost ?? null,
      quantity: input.quantity,
      costCenter: input.costCenter ?? null,
      urgency: input.urgency,
      status: "draft",
    },
  });
}

/**
 * Gets a single procurement request by ID with related data.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param id - Request ID
 * @returns The procurement request with approvals, vendor, and order
 * @throws NotFoundError if request not found
 */
export async function getProcurementRequest(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const request = await db.procurementRequest.findFirst({
    where: { id, organizationId },
    include: {
      approvals: { orderBy: { stage: "asc" } },
      vendor: true,
      order: true,
    },
  });

  if (!request) {
    throw new NotFoundError("ProcurementRequest", id);
  }

  return request;
}

/**
 * Lists procurement requests with optional filters and cursor-based pagination.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param filters - Optional status, urgency, search, pagination filters
 * @returns Object with items array, total count, and nextCursor
 */
export async function listProcurementRequests(
  db: PrismaClient,
  organizationId: string,
  filters?: ListProcurementRequestsInput,
) {
  const where: Record<string, unknown> = {
    organizationId,
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.urgency ? { urgency: filters.urgency } : {}),
    ...(filters?.search
      ? { title: { contains: filters.search, mode: "insensitive" as const } }
      : {}),
  };

  const limit = filters?.limit ?? 50;

  const [items, total] = await Promise.all([
    db.procurementRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(filters?.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
      include: { vendor: true },
    }),
    db.procurementRequest.count({ where }),
  ]);

  const nextCursor = items.length > 0 ? items[items.length - 1]?.id ?? null : null;

  return { items, total, nextCursor };
}

/**
 * Submits a draft procurement request for approval.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param requestId - Request ID to submit
 * @returns The updated procurement request
 * @throws NotFoundError if request not found
 * @throws ValidationError if request is not in draft status
 */
export async function submitForApproval(
  db: PrismaClient,
  organizationId: string,
  requestId: string,
) {
  const request = await db.procurementRequest.findFirst({
    where: { id: requestId, organizationId },
  });

  if (!request) {
    throw new NotFoundError("ProcurementRequest", requestId);
  }

  if (request.status !== "draft") {
    throw new ValidationError(
      `Cannot submit request with status '${request.status}' for approval. Only draft requests can be submitted.`,
    );
  }

  return db.procurementRequest.update({
    where: { id: requestId },
    data: { status: "pending_approval" },
  });
}

// ── Purchase Orders ──────────────────────────────────────────────────────────

/**
 * Creates a new purchase order with auto-generated order number.
 * Optionally links to a procurement request and updates its status.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param requestId - Optional procurement request to link
 * @param input - Order creation data
 * @returns The created purchase order with line items
 */
export async function createPurchaseOrder(
  db: PrismaClient,
  organizationId: string,
  requestId: string | null | undefined,
  input: CreatePurchaseOrderInput,
) {
  const orderNumber = await generateOrderNumber(db, organizationId);

  // Validate request if provided
  if (requestId) {
    const request = await db.procurementRequest.findFirst({
      where: { id: requestId, organizationId },
    });
    if (!request) {
      throw new NotFoundError("ProcurementRequest", requestId);
    }
    if (request.status !== "approved") {
      throw new ValidationError(
        `Cannot create order for request with status '${request.status}'. Request must be approved.`,
      );
    }
  }

  const order = await db.procurementOrder.create({
    data: {
      organizationId,
      orderNumber,
      procurementRequestId: requestId ?? null,
      vendorId: input.vendorId,
      totalAmount: input.totalAmount ?? null,
      status: "ordered",
      expectedDelivery: input.expectedDelivery ?? null,
      lineItems: {
        create: input.lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
        })),
      },
    },
    include: { lineItems: true },
  });

  // Update linked request status
  if (requestId) {
    await db.procurementRequest.update({
      where: { id: requestId },
      data: { status: "ordered" },
    });
  }

  return order;
}

/**
 * Gets a single purchase order by ID with related data.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param id - Order ID
 * @returns The purchase order with line items, vendor, and request
 * @throws NotFoundError if order not found
 */
export async function getPurchaseOrder(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const order = await db.procurementOrder.findFirst({
    where: { id, organizationId },
    include: {
      lineItems: true,
      vendor: true,
      procurementRequest: true,
    },
  });

  if (!order) {
    throw new NotFoundError("PurchaseOrder", id);
  }

  return order;
}

/**
 * Lists purchase orders with optional filters and cursor-based pagination.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param filters - Optional status, vendor, search, pagination filters
 * @returns Object with items array, total count, and nextCursor
 */
export async function listPurchaseOrders(
  db: PrismaClient,
  organizationId: string,
  filters?: ListPurchaseOrdersInput,
) {
  const where: Record<string, unknown> = {
    organizationId,
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.vendorId ? { vendorId: filters.vendorId } : {}),
    ...(filters?.search
      ? { orderNumber: { contains: filters.search, mode: "insensitive" as const } }
      : {}),
  };

  const limit = filters?.limit ?? 50;

  const [items, total] = await Promise.all([
    db.procurementOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(filters?.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
      include: { vendor: true, lineItems: true },
    }),
    db.procurementOrder.count({ where }),
  ]);

  const nextCursor = items.length > 0 ? items[items.length - 1]?.id ?? null : null;

  return { items, total, nextCursor };
}

/**
 * Marks a purchase order as received. Optionally links line items to assets.
 * Also updates the linked procurement request status if present.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param orderId - Order ID to receive
 * @param lineItemUpdates - Optional asset links for line items
 * @returns The updated purchase order
 * @throws NotFoundError if order not found
 * @throws ValidationError if order is already cancelled or received
 */
export async function receiveOrder(
  db: PrismaClient,
  organizationId: string,
  orderId: string,
  lineItemUpdates?: ReceiveOrderInput["lineItemUpdates"],
) {
  const order = await db.procurementOrder.findFirst({
    where: { id: orderId, organizationId },
    include: { lineItems: true },
  });

  if (!order) {
    throw new NotFoundError("PurchaseOrder", orderId);
  }

  if (order.status === "cancelled") {
    throw new ValidationError("Cannot receive a cancelled order.");
  }

  if (order.status === "received") {
    throw new ValidationError("Order has already been received.");
  }

  // Link assets to line items if provided
  if (lineItemUpdates && lineItemUpdates.length > 0) {
    for (const update of lineItemUpdates) {
      await db.procurementLineItem.update({
        where: { id: update.lineItemId },
        data: { assetId: update.assetId ?? null },
      });
    }
  }

  const updatedOrder = await db.procurementOrder.update({
    where: { id: orderId },
    data: { status: "received" },
    include: { lineItems: true },
  });

  // Update linked procurement request
  if (order.procurementRequestId) {
    await db.procurementRequest.update({
      where: { id: order.procurementRequestId },
      data: { status: "received" },
    });
  }

  return updatedOrder;
}

/**
 * Records invoice information on a purchase order.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param orderId - Order ID to match invoice to
 * @param invoiceData - Invoice number, amount, and date
 * @returns The updated purchase order
 * @throws NotFoundError if order not found
 * @throws ValidationError if order is cancelled
 */
export async function matchInvoice(
  db: PrismaClient,
  organizationId: string,
  orderId: string,
  invoiceData: Omit<MatchInvoiceInput, "orderId">,
) {
  const order = await db.procurementOrder.findFirst({
    where: { id: orderId, organizationId },
  });

  if (!order) {
    throw new NotFoundError("PurchaseOrder", orderId);
  }

  if (order.status === "cancelled") {
    throw new ValidationError("Cannot match invoice to a cancelled order.");
  }

  return db.procurementOrder.update({
    where: { id: orderId },
    data: {
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceAmount: invoiceData.invoiceAmount,
      invoiceDate: invoiceData.invoiceDate,
      status: "invoiced",
    },
  });
}

/**
 * Cancels a purchase order. Cannot cancel orders that have been received.
 *
 * @param db - Prisma client
 * @param organizationId - Organization scope
 * @param orderId - Order ID to cancel
 * @returns The cancelled purchase order
 * @throws NotFoundError if order not found
 * @throws ValidationError if order has already been received or is already cancelled
 */
export async function cancelOrder(
  db: PrismaClient,
  organizationId: string,
  orderId: string,
) {
  const order = await db.procurementOrder.findFirst({
    where: { id: orderId, organizationId },
  });

  if (!order) {
    throw new NotFoundError("PurchaseOrder", orderId);
  }

  if (order.status === "received") {
    throw new ValidationError("Cannot cancel an order that has been received.");
  }

  if (order.status === "cancelled") {
    throw new ConflictError("Order is already cancelled.");
  }

  return db.procurementOrder.update({
    where: { id: orderId },
    data: { status: "cancelled" },
  });
}
