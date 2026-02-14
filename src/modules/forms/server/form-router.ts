import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createFormTemplateInput,
  updateFormTemplateInput,
  listFormTemplatesInput,
  submitFormInput,
  updateSubmissionStatusInput,
  listSubmissionsInput,
} from "../types/schemas";
import * as formService from "./form-service";

export const formRouter = createRouter({
  createTemplate: protectedProcedure
    .input(createFormTemplateInput)
    .mutation(async ({ ctx, input }) => {
      return formService.createTemplate(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  getTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return formService.getTemplate(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  listTemplates: protectedProcedure
    .input(listFormTemplatesInput)
    .query(async ({ ctx, input }) => {
      return formService.listTemplates(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  updateTemplate: protectedProcedure
    .input(updateFormTemplateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      return formService.updateTemplate(
        ctx.db,
        ctx.organizationId,
        id,
        rest,
      );
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return formService.deleteTemplate(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  submit: protectedProcedure
    .input(submitFormInput)
    .mutation(async ({ ctx, input }) => {
      return formService.submitForm(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  getSubmission: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return formService.getSubmission(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  listSubmissions: protectedProcedure
    .input(listSubmissionsInput)
    .query(async ({ ctx, input }) => {
      return formService.listSubmissions(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  updateSubmissionStatus: protectedProcedure
    .input(updateSubmissionStatusInput)
    .mutation(async ({ ctx, input }) => {
      return formService.updateSubmissionStatus(
        ctx.db,
        ctx.organizationId,
        input.id,
        input.status,
      );
    }),
});
