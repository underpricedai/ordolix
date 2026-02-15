/**
 * @description tRPC router for the Custom Fields module.
 * Exposes CRUD operations on custom field definitions and
 * value management on entities (issues, assets).
 */
import { z } from "zod";
import { createRouter, protectedProcedure, adminProcedure } from "@/server/trpc/init";
import {
  createCustomFieldInput,
  updateCustomFieldInput,
  listCustomFieldsInput,
  setFieldValueInput,
  getFieldValuesInput,
} from "../types/schemas";
import * as customFieldService from "./custom-field-service";

export const customFieldRouter = createRouter({
  create: adminProcedure
    .input(createCustomFieldInput)
    .mutation(async ({ ctx, input }) => {
      return customFieldService.createField(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  update: adminProcedure
    .input(updateCustomFieldInput)
    .mutation(async ({ ctx, input }) => {
      return customFieldService.updateField(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  list: protectedProcedure
    .input(listCustomFieldsInput)
    .query(async ({ ctx, input }) => {
      return customFieldService.listFields(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return customFieldService.getField(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return customFieldService.deleteField(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  setValue: adminProcedure
    .input(setFieldValueInput)
    .mutation(async ({ ctx, input }) => {
      return customFieldService.setFieldValue(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  getValues: protectedProcedure
    .input(getFieldValuesInput)
    .query(async ({ ctx, input }) => {
      return customFieldService.getFieldValues(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),
});
