/**
 * Procurement tRPC router.
 *
 * @description Provides procedures for procurement request management,
 * purchase order lifecycle, approval decisions, invoice matching,
 * and order receiving.
 *
 * @module procurement-router
 */

import { createRouter, protectedProcedure, adminProcedure } from "@/server/trpc/init";
import { z } from "zod";
import * as procService from "./procurement-service";
import * as approvalService from "./procurement-approval-service";
import {
  createProcurementRequestInput,
  listProcurementRequestsInput,
  decideProcurementApprovalInput,
  createPurchaseOrderInput,
  listPurchaseOrdersInput,
  receiveOrderInput,
  matchInvoiceInput,
} from "../types/schemas";

export const procurementRouter = createRouter({
  // ── Procurement Requests ──────────────────────────────────────────────

  createProcurementRequest: protectedProcedure
    .input(createProcurementRequestInput)
    .mutation(async ({ ctx, input }) => {
      return procService.createProcurementRequest(
        ctx.db,
        ctx.organizationId,
        input,
        ctx.session.user.id!,
      );
    }),

  getProcurementRequest: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return procService.getProcurementRequest(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  listProcurementRequests: protectedProcedure
    .input(listProcurementRequestsInput)
    .query(async ({ ctx, input }) => {
      return procService.listProcurementRequests(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  submitForApproval: protectedProcedure
    .input(z.object({ requestId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return procService.submitForApproval(
        ctx.db,
        ctx.organizationId,
        input.requestId,
      );
    }),

  // ── Approvals ─────────────────────────────────────────────────────────

  decideProcurementApproval: protectedProcedure
    .input(decideProcurementApprovalInput)
    .mutation(async ({ ctx, input }) => {
      return approvalService.decideProcurementApproval(
        ctx.db,
        ctx.organizationId,
        input.approvalId,
        ctx.session.user.id!,
        input.decision,
        input.comment,
      );
    }),

  getPendingApprovals: protectedProcedure
    .query(async ({ ctx }) => {
      return approvalService.getPendingApprovals(
        ctx.db,
        ctx.organizationId,
        ctx.session.user.id!,
      );
    }),

  // ── Purchase Orders ───────────────────────────────────────────────────

  createPurchaseOrder: adminProcedure
    .input(createPurchaseOrderInput)
    .mutation(async ({ ctx, input }) => {
      return procService.createPurchaseOrder(
        ctx.db,
        ctx.organizationId,
        input.procurementRequestId,
        input,
      );
    }),

  getPurchaseOrder: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return procService.getPurchaseOrder(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  listPurchaseOrders: protectedProcedure
    .input(listPurchaseOrdersInput)
    .query(async ({ ctx, input }) => {
      return procService.listPurchaseOrders(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  receiveOrder: adminProcedure
    .input(receiveOrderInput)
    .mutation(async ({ ctx, input }) => {
      return procService.receiveOrder(
        ctx.db,
        ctx.organizationId,
        input.orderId,
        input.lineItemUpdates,
      );
    }),

  matchInvoice: adminProcedure
    .input(matchInvoiceInput)
    .mutation(async ({ ctx, input }) => {
      return procService.matchInvoice(
        ctx.db,
        ctx.organizationId,
        input.orderId,
        {
          invoiceNumber: input.invoiceNumber,
          invoiceAmount: input.invoiceAmount,
          invoiceDate: input.invoiceDate,
        },
      );
    }),

  cancelOrder: adminProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return procService.cancelOrder(
        ctx.db,
        ctx.organizationId,
        input.orderId,
      );
    }),
});
