/**
 * Asset tRPC router.
 *
 * @description Provides procedures for CRUD on asset types, assets,
 * relationships, typed attribute definitions, lifecycle transitions,
 * and asset history.
 *
 * @module asset-router
 */

import { createRouter, protectedProcedure, adminProcedure } from "@/server/trpc/init";
import {
  createAssetTypeInput,
  updateAssetTypeInput,
  createAssetInput,
  updateAssetInput,
  listAssetsInput,
  addRelationshipInput,
  removeRelationshipInput,
  createAttributeDefinitionInput,
  updateAttributeDefinitionInput,
  reorderAttributesInput,
  setLifecycleTransitionsInput,
  transitionAssetStatusInput,
  getAssetHistoryInput,
  setAssetFinancialsInput,
  warrantyAlertsInput,
  createLicenseInput,
  updateLicenseInput,
  listLicensesInput,
  allocateLicenseInput,
  renewalAlertsInput,
  startImportInput,
  validateImportPreviewInput,
  listImportJobsInput,
  exportAssetsInput,
} from "../types/schemas";
import { z } from "zod";
import * as assetService from "./asset-service";
import * as attributeService from "./asset-attribute-service";
import * as lifecycleService from "./asset-lifecycle-service";
import * as financialService from "./asset-financial-service";
import * as licenseService from "./license-service";
import * as complianceService from "./license-compliance";
import * as importService from "./import-service";
import * as exportService from "./export-service";

export const assetRouter = createRouter({
  // ── Asset Types ────────────────────────────────────────────────────────

  createAssetType: adminProcedure
    .input(createAssetTypeInput)
    .mutation(async ({ ctx, input }) => {
      return assetService.createAssetType(ctx.db, ctx.organizationId, input);
    }),

  listAssetTypes: protectedProcedure
    .query(async ({ ctx }) => {
      return assetService.listAssetTypes(ctx.db, ctx.organizationId);
    }),

  updateAssetType: adminProcedure
    .input(updateAssetTypeInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return assetService.updateAssetType(ctx.db, ctx.organizationId, id, data);
    }),

  deleteAssetType: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return assetService.deleteAssetType(ctx.db, ctx.organizationId, input.id);
    }),

  // ── Assets ─────────────────────────────────────────────────────────────

  createAsset: adminProcedure
    .input(createAssetInput)
    .mutation(async ({ ctx, input }) => {
      return assetService.createAsset(
        ctx.db,
        ctx.organizationId,
        input,
        ctx.session.user.id!,
      );
    }),

  getAsset: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return assetService.getAsset(ctx.db, ctx.organizationId, input.id);
    }),

  listAssets: protectedProcedure
    .input(listAssetsInput)
    .query(async ({ ctx, input }) => {
      return assetService.listAssets(ctx.db, ctx.organizationId, input);
    }),

  updateAsset: adminProcedure
    .input(updateAssetInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return assetService.updateAsset(
        ctx.db,
        ctx.organizationId,
        id,
        data,
        ctx.session.user.id!,
      );
    }),

  deleteAsset: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return assetService.deleteAsset(
        ctx.db,
        ctx.organizationId,
        input.id,
        ctx.session.user.id!,
      );
    }),

  // ── Relationships ──────────────────────────────────────────────────────

  addRelationship: adminProcedure
    .input(addRelationshipInput)
    .mutation(async ({ ctx, input }) => {
      return assetService.addRelationship(
        ctx.db,
        ctx.organizationId,
        input,
        ctx.session.user.id!,
      );
    }),

  removeRelationship: adminProcedure
    .input(removeRelationshipInput)
    .mutation(async ({ ctx, input }) => {
      return assetService.removeRelationship(
        ctx.db,
        ctx.organizationId,
        input.id,
        ctx.session.user.id!,
      );
    }),

  // ── Attribute Definitions ──────────────────────────────────────────────

  listAttributeDefinitions: protectedProcedure
    .input(z.object({ assetTypeId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return attributeService.listAttributeDefinitions(
        ctx.db,
        ctx.organizationId,
        input.assetTypeId,
      );
    }),

  createAttributeDefinition: adminProcedure
    .input(createAttributeDefinitionInput)
    .mutation(async ({ ctx, input }) => {
      return attributeService.createAttributeDefinition(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  updateAttributeDefinition: adminProcedure
    .input(updateAttributeDefinitionInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return attributeService.updateAttributeDefinition(
        ctx.db,
        ctx.organizationId,
        id,
        data,
      );
    }),

  deleteAttributeDefinition: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return attributeService.deleteAttributeDefinition(
        ctx.db,
        ctx.organizationId,
        input.id,
      );
    }),

  reorderAttributes: adminProcedure
    .input(reorderAttributesInput)
    .mutation(async ({ ctx, input }) => {
      return attributeService.reorderAttributes(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  // ── Lifecycle Transitions ──────────────────────────────────────────────

  listLifecycleTransitions: protectedProcedure
    .input(z.object({ assetTypeId: z.string().nullable() }))
    .query(async ({ ctx, input }) => {
      return lifecycleService.listLifecycleTransitions(
        ctx.db,
        ctx.organizationId,
        input.assetTypeId,
      );
    }),

  setLifecycleTransitions: adminProcedure
    .input(setLifecycleTransitionsInput)
    .mutation(async ({ ctx, input }) => {
      return lifecycleService.setLifecycleTransitions(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  transitionAssetStatus: adminProcedure
    .input(transitionAssetStatusInput)
    .mutation(async ({ ctx, input }) => {
      return lifecycleService.transitionAssetStatus(
        ctx.db,
        ctx.organizationId,
        input.assetId,
        input.toStatus,
        ctx.session.user.id!,
      );
    }),

  // ── Asset History ──────────────────────────────────────────────────────

  getAssetHistory: protectedProcedure
    .input(getAssetHistoryInput)
    .query(async ({ ctx, input }) => {
      return lifecycleService.getAssetHistory(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  // ── Financial ───────────────────────────────────────────────────────────

  getAssetFinancials: protectedProcedure
    .input(z.object({ assetId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return financialService.getAssetFinancials(ctx.db, ctx.organizationId, input.assetId);
    }),

  setAssetFinancials: adminProcedure
    .input(setAssetFinancialsInput)
    .mutation(async ({ ctx, input }) => {
      return financialService.setAssetFinancials(
        ctx.db, ctx.organizationId, input.assetId, input, ctx.session.user.id!,
      );
    }),

  calculateDepreciation: protectedProcedure
    .input(z.object({
      purchasePrice: z.number().nonnegative(),
      salvageValue: z.number().nonnegative().default(0),
      usefulLifeMonths: z.number().int().positive(),
      depreciationMethod: z.enum(["straight_line", "declining_balance"]).default("straight_line"),
      purchaseDate: z.coerce.date(),
    }))
    .query(({ input }) => {
      return financialService.calculateDepreciation(
        input.purchasePrice, input.salvageValue, input.usefulLifeMonths,
        input.depreciationMethod, input.purchaseDate,
      );
    }),

  getWarrantyAlerts: protectedProcedure
    .input(warrantyAlertsInput)
    .query(async ({ ctx, input }) => {
      return financialService.getWarrantyAlerts(ctx.db, ctx.organizationId, input.daysAhead);
    }),

  getAssetTCO: protectedProcedure
    .input(z.object({ assetId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return financialService.getAssetTCO(ctx.db, ctx.organizationId, input.assetId);
    }),

  getCostCenterSummary: protectedProcedure
    .query(async ({ ctx }) => {
      return financialService.getCostCenterSummary(ctx.db, ctx.organizationId);
    }),

  // ── Software Licenses ─────────────────────────────────────────────────

  createLicense: adminProcedure
    .input(createLicenseInput)
    .mutation(async ({ ctx, input }) => {
      return licenseService.createLicense(ctx.db, ctx.organizationId, input);
    }),

  getLicense: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return licenseService.getLicense(ctx.db, ctx.organizationId, input.id);
    }),

  listLicenses: protectedProcedure
    .input(listLicensesInput)
    .query(async ({ ctx, input }) => {
      return licenseService.listLicenses(ctx.db, ctx.organizationId, input);
    }),

  updateLicense: adminProcedure
    .input(updateLicenseInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return licenseService.updateLicense(ctx.db, ctx.organizationId, id, data);
    }),

  deleteLicense: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return licenseService.deleteLicense(ctx.db, ctx.organizationId, input.id);
    }),

  allocateLicense: adminProcedure
    .input(allocateLicenseInput)
    .mutation(async ({ ctx, input }) => {
      return licenseService.allocateLicense(ctx.db, ctx.organizationId, input.licenseId, {
        assetId: input.assetId ?? undefined,
        userId: input.userId ?? undefined,
      });
    }),

  revokeLicenseAllocation: adminProcedure
    .input(z.object({ allocationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return licenseService.revokeLicenseAllocation(ctx.db, ctx.organizationId, input.allocationId);
    }),

  getLicenseCompliance: protectedProcedure
    .input(z.object({ licenseId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return complianceService.getLicenseCompliance(ctx.db, ctx.organizationId, input.licenseId);
    }),

  getComplianceDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      return complianceService.getComplianceDashboard(ctx.db, ctx.organizationId);
    }),

  getRenewalAlerts: protectedProcedure
    .input(renewalAlertsInput)
    .query(async ({ ctx, input }) => {
      return complianceService.getRenewalAlerts(ctx.db, ctx.organizationId, input.daysAhead);
    }),

  // ── Import/Export ─────────────────────────────────────────────────────

  startImport: adminProcedure
    .input(startImportInput)
    .mutation(async ({ ctx, input }) => {
      return importService.startImport(ctx.db, ctx.organizationId, ctx.session.user.id!, input);
    }),

  getImportStatus: protectedProcedure
    .input(z.object({ jobId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return importService.getImportStatus(ctx.db, ctx.organizationId, input.jobId);
    }),

  listImportJobs: protectedProcedure
    .input(listImportJobsInput)
    .query(async ({ ctx, input }) => {
      return importService.listImportJobs(ctx.db, ctx.organizationId, input);
    }),

  cancelImport: adminProcedure
    .input(z.object({ jobId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return importService.cancelImport(ctx.db, ctx.organizationId, input.jobId);
    }),

  validateImportPreview: protectedProcedure
    .input(validateImportPreviewInput)
    .mutation(async ({ ctx, input }) => {
      return importService.validateImportPreview(ctx.db, ctx.organizationId, input);
    }),

  exportAssets: protectedProcedure
    .input(exportAssetsInput)
    .query(async ({ ctx, input }) => {
      return exportService.exportAssets(ctx.db, ctx.organizationId, input);
    }),

  getExportTemplate: protectedProcedure
    .input(z.object({ assetTypeId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return exportService.getExportTemplate(ctx.db, ctx.organizationId, input.assetTypeId);
    }),
});
