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
  createFieldConfigSchemeInput,
  updateFieldConfigSchemeInput,
  addFieldConfigEntryInput,
  updateFieldConfigEntryInput,
  removeFieldConfigEntryInput,
  assignFieldConfigSchemeInput,
} from "../types/schemas";
import * as customFieldService from "./custom-field-service";
import * as fieldConfigSchemeService from "./field-config-scheme-service";

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

  // ── Field Configuration Scheme Procedures ──────────────────────────────

  listFieldConfigSchemes: adminProcedure
    .query(async ({ ctx }) => {
      return fieldConfigSchemeService.listFieldConfigSchemes(ctx.db, ctx.organizationId);
    }),

  getFieldConfigScheme: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return fieldConfigSchemeService.getFieldConfigScheme(ctx.db, ctx.organizationId, input.id);
    }),

  createFieldConfigScheme: adminProcedure
    .input(createFieldConfigSchemeInput)
    .mutation(async ({ ctx, input }) => {
      return fieldConfigSchemeService.createFieldConfigScheme(ctx.db, ctx.organizationId, input);
    }),

  updateFieldConfigScheme: adminProcedure
    .input(updateFieldConfigSchemeInput)
    .mutation(async ({ ctx, input }) => {
      return fieldConfigSchemeService.updateFieldConfigScheme(ctx.db, ctx.organizationId, input);
    }),

  deleteFieldConfigScheme: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return fieldConfigSchemeService.deleteFieldConfigScheme(ctx.db, ctx.organizationId, input.id);
    }),

  addFieldConfigEntry: adminProcedure
    .input(addFieldConfigEntryInput)
    .mutation(async ({ ctx, input }) => {
      return fieldConfigSchemeService.addField(ctx.db, ctx.organizationId, input);
    }),

  updateFieldConfigEntry: adminProcedure
    .input(updateFieldConfigEntryInput)
    .mutation(async ({ ctx, input }) => {
      return fieldConfigSchemeService.updateField(ctx.db, input);
    }),

  removeFieldConfigEntry: adminProcedure
    .input(removeFieldConfigEntryInput)
    .mutation(async ({ ctx, input }) => {
      return fieldConfigSchemeService.removeField(ctx.db, input.id);
    }),

  assignFieldConfigScheme: adminProcedure
    .input(assignFieldConfigSchemeInput)
    .mutation(async ({ ctx, input }) => {
      return fieldConfigSchemeService.assignToProject(ctx.db, ctx.organizationId, input.schemeId, input.projectId);
    }),
});
