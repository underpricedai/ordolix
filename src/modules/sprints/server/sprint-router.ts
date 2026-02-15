import { z } from "zod";
import { createRouter, protectedProcedure, requirePermission } from "@/server/trpc/init";
import {
  createSprintInput,
  updateSprintInput,
  listSprintsInput,
  startSprintInput,
  completeSprintInput,
  addIssuesToSprintInput,
  removeIssuesFromSprintInput,
  getVelocityInput,
} from "../types/schemas";
import * as sprintService from "./sprint-service";

export const sprintRouter = createRouter({
  create: requirePermission("MANAGE_SPRINTS")
    .input(createSprintInput)
    .mutation(async ({ ctx, input }) => {
      return sprintService.createSprint(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  update: protectedProcedure
    .input(updateSprintInput)
    .mutation(async ({ ctx, input }) => {
      return sprintService.updateSprint(ctx.db, ctx.organizationId, input);
    }),

  list: protectedProcedure
    .input(listSprintsInput)
    .query(async ({ ctx, input }) => {
      return sprintService.listSprints(ctx.db, ctx.organizationId, input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return sprintService.getSprint(ctx.db, ctx.organizationId, input.id);
    }),

  start: protectedProcedure
    .input(startSprintInput)
    .mutation(async ({ ctx, input }) => {
      return sprintService.startSprint(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  complete: protectedProcedure
    .input(completeSprintInput)
    .mutation(async ({ ctx, input }) => {
      return sprintService.completeSprint(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  addIssues: protectedProcedure
    .input(addIssuesToSprintInput)
    .mutation(async ({ ctx, input }) => {
      return sprintService.addIssuesToSprint(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  removeIssues: protectedProcedure
    .input(removeIssuesFromSprintInput)
    .mutation(async ({ ctx, input }) => {
      return sprintService.removeIssuesFromSprint(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  velocity: protectedProcedure
    .input(getVelocityInput)
    .query(async ({ ctx, input }) => {
      return sprintService.getVelocity(ctx.db, ctx.organizationId, input);
    }),
});
