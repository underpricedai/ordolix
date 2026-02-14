import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  addDependencyInput,
  removeDependencyInput,
  getGanttDataInput,
} from "../types/schemas";
import * as ganttService from "./gantt-service";

export const ganttRouter = createRouter({
  addDependency: protectedProcedure
    .input(addDependencyInput)
    .mutation(async ({ ctx, input }) => {
      return ganttService.addDependency(ctx.db, ctx.organizationId, input);
    }),

  removeDependency: protectedProcedure
    .input(removeDependencyInput)
    .mutation(async ({ ctx, input }) => {
      return ganttService.removeDependency(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  getData: protectedProcedure
    .input(getGanttDataInput)
    .query(async ({ ctx, input }) => {
      return ganttService.getGanttData(ctx.db, ctx.organizationId, input);
    }),
});
