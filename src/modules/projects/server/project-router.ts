/**
 * tRPC router for project operations.
 *
 * @description Exposes project CRUD, archiving, and member management
 * procedures via the protected (authenticated) procedure base.
 *
 * @module projects/server/project-router
 */

import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  createProjectInput,
  updateProjectInput,
  listProjectsInput,
  archiveProjectInput,
  addProjectMemberInput,
  removeProjectMemberInput,
} from "../types/schemas";
import * as projectService from "./project-service";

export const projectRouter = createRouter({
  create: protectedProcedure
    .input(createProjectInput)
    .mutation(async ({ ctx, input }) => {
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

  addMember: protectedProcedure
    .input(addProjectMemberInput)
    .mutation(async ({ ctx, input }) => {
      return projectService.addMember(ctx.db, ctx.organizationId, input);
    }),

  removeMember: protectedProcedure
    .input(removeProjectMemberInput)
    .mutation(async ({ ctx, input }) => {
      return projectService.removeMember(ctx.db, ctx.organizationId, input);
    }),
});
