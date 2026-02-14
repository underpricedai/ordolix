import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createIncidentInput,
  updateIncidentInput,
  addTimelineEntryInput,
  addCommunicationInput,
  resolveIncidentInput,
  listIncidentsInput,
} from "../types/schemas";
import { z } from "zod";
import * as incidentService from "./incident-service";

export const incidentRouter = createRouter({
  create: protectedProcedure
    .input(createIncidentInput)
    .mutation(async ({ ctx, input }) => {
      return incidentService.createIncident(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return incidentService.getIncident(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  list: protectedProcedure
    .input(listIncidentsInput)
    .query(async ({ ctx, input }) => {
      return incidentService.listIncidents(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  update: protectedProcedure
    .input(updateIncidentInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return incidentService.updateIncident(
        ctx.db,
        ctx.organizationId,
        id,
        data,
      );
    }),

  addTimelineEntry: protectedProcedure
    .input(addTimelineEntryInput)
    .mutation(async ({ ctx, input }) => {
      return incidentService.addTimelineEntry(
        ctx.db,
        ctx.organizationId,
        input.id,
        input.entry,
      );
    }),

  addCommunication: protectedProcedure
    .input(addCommunicationInput)
    .mutation(async ({ ctx, input }) => {
      return incidentService.addCommunication(
        ctx.db,
        ctx.organizationId,
        input.id,
        input.entry,
      );
    }),

  resolve: protectedProcedure
    .input(resolveIncidentInput)
    .mutation(async ({ ctx, input }) => {
      return incidentService.resolveIncident(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return incidentService.deleteIncident(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),
});
