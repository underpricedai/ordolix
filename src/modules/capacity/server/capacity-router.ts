/**
 * tRPC router for capacity planning — team capacity, allocations,
 * time-off, and capacity-vs-load analysis.
 * @module capacity-router
 */

import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  getTeamCapacityInput,
  setTeamCapacityInput,
  setAllocationInput,
  listAllocationsInput,
  deleteAllocationInput,
  addTimeOffInput,
  listTimeOffInput,
  removeTimeOffInput,
  computeCapacityInput,
  getCapacityVsLoadInput,
} from "../types/schemas";
import * as capacityService from "./capacity-service";

export const capacityRouter = createRouter({
  // ── Team Capacity ───────────────────────────────────────────────────────

  getTeamCapacity: protectedProcedure
    .input(getTeamCapacityInput)
    .query(async ({ ctx, input }) => {
      return capacityService.getTeamCapacity(
        ctx.db,
        ctx.organizationId,
        input.projectId,
        input.periodStart,
        input.periodEnd,
      );
    }),

  setTeamCapacity: protectedProcedure
    .input(setTeamCapacityInput)
    .mutation(async ({ ctx, input }) => {
      return capacityService.setTeamCapacity(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  // ── User Allocations ──────────────────────────────────────────────────

  setAllocation: protectedProcedure
    .input(setAllocationInput)
    .mutation(async ({ ctx, input }) => {
      return capacityService.setAllocation(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  listAllocations: protectedProcedure
    .input(listAllocationsInput)
    .query(async ({ ctx, input }) => {
      return capacityService.listAllocations(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  deleteAllocation: protectedProcedure
    .input(deleteAllocationInput)
    .mutation(async ({ ctx, input }) => {
      return capacityService.deleteAllocation(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  // ── Time Off ──────────────────────────────────────────────────────────

  addTimeOff: protectedProcedure
    .input(addTimeOffInput)
    .mutation(async ({ ctx, input }) => {
      return capacityService.addTimeOff(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  listTimeOff: protectedProcedure
    .input(listTimeOffInput)
    .query(async ({ ctx, input }) => {
      return capacityService.listTimeOff(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  removeTimeOff: protectedProcedure
    .input(removeTimeOffInput)
    .mutation(async ({ ctx, input }) => {
      return capacityService.removeTimeOff(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  // ── Capacity Computation ──────────────────────────────────────────────

  computeCapacity: protectedProcedure
    .input(computeCapacityInput)
    .query(async ({ ctx, input }) => {
      return capacityService.computeCapacity(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  capacityVsLoad: protectedProcedure
    .input(getCapacityVsLoadInput)
    .query(async ({ ctx, input }) => {
      return capacityService.getCapacityVsLoad(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),
});
