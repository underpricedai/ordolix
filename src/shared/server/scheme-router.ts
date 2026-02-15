/**
 * Unified scheme sharing tRPC router.
 *
 * @description Provides checkSharing, fork, and clone operations that work
 * across all scheme types (permission, workflow, issueType, fieldConfig,
 * notification, issueSecurity).
 *
 * @module shared/server/scheme-router
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminProcedure } from "@/server/trpc/init";
import {
  isSchemeShared,
  forkScheme,
  cloneSchemeIndependent,
  SCHEME_TYPES,
  type SchemeAdapter,
  type SchemeType,
} from "@/shared/lib/scheme-sharing-service";
import { permissionSchemeAdapter } from "@/modules/permissions/server/permission-scheme-adapter";
import { workflowSchemeAdapter } from "@/modules/workflows/server/workflow-scheme-adapter";
import { issueTypeSchemeAdapter } from "@/modules/admin/server/issue-type-scheme-adapter";
import { fieldConfigSchemeAdapter } from "@/modules/custom-fields/server/field-config-scheme-adapter";
import { notificationSchemeAdapter } from "@/modules/notifications/server/notification-scheme-adapter";
import { issueSecuritySchemeAdapter } from "@/modules/permissions/server/issue-security-scheme-adapter";
import { componentSchemeAdapter } from "@/modules/projects/server/component-scheme-adapter";

const schemeTypeSchema = z.enum(SCHEME_TYPES);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapterMap: Record<SchemeType, SchemeAdapter<any>> = {
  permissionScheme: permissionSchemeAdapter,
  workflow: workflowSchemeAdapter,
  issueTypeScheme: issueTypeSchemeAdapter,
  fieldConfigurationScheme: fieldConfigSchemeAdapter,
  notificationScheme: notificationSchemeAdapter,
  issueSecurityScheme: issueSecuritySchemeAdapter,
  componentScheme: componentSchemeAdapter,
};

function getAdapter(type: SchemeType) {
  const adapter = adapterMap[type];
  if (!adapter) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unknown scheme type: ${type}`,
    });
  }
  return adapter;
}

export const schemeRouter = createRouter({
  /** Check if a scheme is shared by multiple projects. */
  checkSharing: adminProcedure
    .input(
      z.object({
        schemeType: schemeTypeSchema,
        schemeId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const adapter = getAdapter(input.schemeType);
      return isSchemeShared(adapter, ctx.db, input.schemeId, ctx.organizationId);
    }),

  /** Fork a shared scheme for a single project. */
  fork: adminProcedure
    .input(
      z.object({
        schemeType: schemeTypeSchema,
        schemeId: z.string().min(1),
        projectId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const adapter = getAdapter(input.schemeType);
      return forkScheme(
        adapter,
        ctx.db,
        input.schemeId,
        input.projectId,
        ctx.organizationId,
      );
    }),

  /** Clone a scheme independently (for project creation). */
  clone: adminProcedure
    .input(
      z.object({
        schemeType: schemeTypeSchema,
        sourceId: z.string().min(1),
        newName: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const adapter = getAdapter(input.schemeType);
      return cloneSchemeIndependent(
        adapter,
        ctx.db,
        input.sourceId,
        input.newName,
        ctx.organizationId,
      );
    }),
});
