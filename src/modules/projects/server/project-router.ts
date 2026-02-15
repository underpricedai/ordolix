/**
 * tRPC router for project operations.
 *
 * @description Exposes project CRUD, archiving, and member management
 * procedures via the protected (authenticated) procedure base.
 *
 * @module projects/server/project-router
 */

import { z } from "zod";
import { createRouter, protectedProcedure, requirePermission, assertGlobalPermission } from "@/server/trpc/init";
import {
  createProjectInput,
  updateProjectInput,
  listProjectsInput,
  archiveProjectInput,
  addProjectMemberInput,
  removeProjectMemberInput,
  listComponentsInput,
  createComponentInput,
  updateComponentInput,
  deleteComponentInput,
  listVersionsInput,
  createVersionInput,
  updateVersionInput,
  deleteVersionInput,
  releaseVersionInput,
} from "../types/schemas";
import * as projectService from "./project-service";
import * as componentService from "./component-service";
import * as versionService from "./version-service";

export const projectRouter = createRouter({
  create: protectedProcedure
    .input(createProjectInput)
    .mutation(async ({ ctx, input }) => {
      await assertGlobalPermission(ctx, "CREATE_PROJECT");
      return projectService.createProject(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  update: protectedProcedure
    .input(updateProjectInput)
    .mutation(async ({ ctx, input }) => {
      return projectService.updateProject(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  list: protectedProcedure
    .input(listProjectsInput)
    .query(async ({ ctx, input }) => {
      return projectService.listProjects(ctx.db, ctx.organizationId, input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return projectService.getProject(ctx.db, ctx.organizationId, {
        id: input.id,
      });
    }),

  getByKey: protectedProcedure
    .input(z.object({ key: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return projectService.getProject(ctx.db, ctx.organizationId, {
        key: input.key,
      });
    }),

  archive: protectedProcedure
    .input(archiveProjectInput)
    .mutation(async ({ ctx, input }) => {
      return projectService.archiveProject(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.id,
      );
    }),

  addMember: requirePermission("ADMINISTER_PROJECTS")
    .input(addProjectMemberInput)
    .mutation(async ({ ctx, input }) => {
      return projectService.addMember(ctx.db, ctx.organizationId, input);
    }),

  removeMember: requirePermission("ADMINISTER_PROJECTS")
    .input(removeProjectMemberInput)
    .mutation(async ({ ctx, input }) => {
      return projectService.removeMember(ctx.db, ctx.organizationId, input);
    }),

  // ── Component Procedures ─────────────────────────────────────────────────

  listComponents: protectedProcedure
    .input(listComponentsInput)
    .query(async ({ ctx, input }) => {
      return componentService.listComponents(ctx.db, ctx.organizationId, input.projectId);
    }),

  createComponent: requirePermission("ADMINISTER_PROJECTS")
    .input(createComponentInput)
    .mutation(async ({ ctx, input }) => {
      return componentService.createComponent(ctx.db, ctx.organizationId, input);
    }),

  updateComponent: protectedProcedure
    .input(updateComponentInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return componentService.updateComponent(ctx.db, ctx.organizationId, id, updates);
    }),

  deleteComponent: protectedProcedure
    .input(deleteComponentInput)
    .mutation(async ({ ctx, input }) => {
      return componentService.deleteComponent(ctx.db, ctx.organizationId, input.id);
    }),

  // ── Version Procedures ───────────────────────────────────────────────────

  listVersions: protectedProcedure
    .input(listVersionsInput)
    .query(async ({ ctx, input }) => {
      return versionService.listVersions(ctx.db, ctx.organizationId, input.projectId);
    }),

  createVersion: requirePermission("ADMINISTER_PROJECTS")
    .input(createVersionInput)
    .mutation(async ({ ctx, input }) => {
      return versionService.createVersion(ctx.db, ctx.organizationId, input);
    }),

  updateVersion: protectedProcedure
    .input(updateVersionInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return versionService.updateVersion(ctx.db, ctx.organizationId, id, updates);
    }),

  deleteVersion: protectedProcedure
    .input(deleteVersionInput)
    .mutation(async ({ ctx, input }) => {
      return versionService.deleteVersion(ctx.db, ctx.organizationId, input.id);
    }),

  releaseVersion: protectedProcedure
    .input(releaseVersionInput)
    .mutation(async ({ ctx, input }) => {
      return versionService.releaseVersion(ctx.db, ctx.organizationId, input.id);
    }),
});
