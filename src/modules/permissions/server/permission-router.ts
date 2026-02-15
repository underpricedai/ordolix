/**
 * tRPC router for permissions management.
 *
 * @description Provides CRUD operations for project roles, groups,
 * permission schemes, global permissions, and issue security schemes.
 *
 * @module permission-router
 */

import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import { invalidatePermissionCache } from "./permission-checker";
import {
  createProjectRoleSchema,
  updateProjectRoleSchema,
  deleteProjectRoleSchema,
  createGroupSchema,
  updateGroupSchema,
  deleteGroupSchema,
  groupMemberSchema,
  listGroupMembersSchema,
  createPermissionSchemeSchema,
  updatePermissionSchemeSchema,
  deletePermissionSchemeSchema,
  getPermissionSchemeSchema,
  addPermissionGrantSchema,
  removePermissionGrantSchema,
  assignSchemeToProjectSchema,
  addGlobalPermissionSchema,
  removeGlobalPermissionSchema,
  createIssueSecuritySchemeSchema,
  deleteIssueSecuritySchemeSchema,
  addSecurityLevelSchema,
  removeSecurityLevelSchema,
  addSecurityLevelMemberSchema,
  removeSecurityLevelMemberSchema,
  assignSecuritySchemeToProjectSchema,
} from "../types/schemas";

// ── Project Roles ───────────────────────────────────────────────────────────

const projectRoleRouter = createRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.projectRole.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { name: "asc" },
    });
  }),

  create: protectedProcedure
    .input(createProjectRoleSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectRole.create({
        data: { organizationId: ctx.organizationId, ...input },
      });
    }),

  update: protectedProcedure
    .input(updateProjectRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.projectRole.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(deleteProjectRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const inUse = await ctx.db.projectMember.count({
        where: { projectRoleId: input.id },
      });
      if (inUse > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete role that is assigned to project members",
        });
      }
      return ctx.db.projectRole.delete({ where: { id: input.id } });
    }),
});

// ── Groups ──────────────────────────────────────────────────────────────────

const groupRouter = createRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.group.findMany({
      where: { organizationId: ctx.organizationId },
      include: { _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    });
  }),

  create: protectedProcedure
    .input(createGroupSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.group.create({
        data: { organizationId: ctx.organizationId, ...input },
      });
    }),

  update: protectedProcedure
    .input(updateGroupSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.group.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(deleteGroupSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.group.delete({ where: { id: input.id } });
    }),

  addMember: protectedProcedure
    .input(groupMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.groupMember.create({ data: input });
      await invalidatePermissionCache(ctx.organizationId, input.userId);
      return result;
    }),

  removeMember: protectedProcedure
    .input(groupMemberSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.groupMember.delete({
        where: { groupId_userId: { groupId: input.groupId, userId: input.userId } },
      });
      await invalidatePermissionCache(ctx.organizationId, input.userId);
      return { success: true };
    }),

  listMembers: protectedProcedure
    .input(listGroupMembersSchema)
    .query(async ({ ctx, input }) => {
      return ctx.db.groupMember.findMany({
        where: { groupId: input.groupId },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      });
    }),
});

// ── Permission Schemes ──────────────────────────────────────────────────────

const permissionSchemeRouter = createRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.permissionScheme.findMany({
      where: { organizationId: ctx.organizationId },
      include: { _count: { select: { grants: true, projects: true } } },
      orderBy: { name: "asc" },
    });
  }),

  get: protectedProcedure
    .input(getPermissionSchemeSchema)
    .query(async ({ ctx, input }) => {
      const scheme = await ctx.db.permissionScheme.findUnique({
        where: { id: input.id },
        include: {
          grants: {
            include: {
              projectRole: { select: { id: true, name: true } },
              group: { select: { id: true, name: true } },
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });
      if (!scheme) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Permission scheme not found" });
      }
      return scheme;
    }),

  create: protectedProcedure
    .input(createPermissionSchemeSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.permissionScheme.create({
        data: { organizationId: ctx.organizationId, ...input },
      });
    }),

  update: protectedProcedure
    .input(updatePermissionSchemeSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.permissionScheme.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(deletePermissionSchemeSchema)
    .mutation(async ({ ctx, input }) => {
      const inUse = await ctx.db.project.count({
        where: { permissionSchemeId: input.id },
      });
      if (inUse > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete scheme that is assigned to projects",
        });
      }
      return ctx.db.permissionScheme.delete({ where: { id: input.id } });
    }),

  addGrant: protectedProcedure
    .input(addPermissionGrantSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.permissionGrant.create({ data: input });
      await invalidatePermissionCache(ctx.organizationId);
      return result;
    }),

  removeGrant: protectedProcedure
    .input(removePermissionGrantSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.permissionGrant.delete({ where: { id: input.id } });
      await invalidatePermissionCache(ctx.organizationId);
      return { success: true };
    }),

  assignToProject: protectedProcedure
    .input(assignSchemeToProjectSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.project.update({
        where: { id: input.projectId },
        data: { permissionSchemeId: input.permissionSchemeId },
      });
      await invalidatePermissionCache(ctx.organizationId);
      return { success: true };
    }),
});

// ── Global Permissions ──────────────────────────────────────────────────────

const globalPermissionRouter = createRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.globalPermission.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { permissionKey: "asc" },
    });
  }),

  add: protectedProcedure
    .input(addGlobalPermissionSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.globalPermission.create({
        data: { organizationId: ctx.organizationId, ...input },
      });
      await invalidatePermissionCache(ctx.organizationId);
      return result;
    }),

  remove: protectedProcedure
    .input(removeGlobalPermissionSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.globalPermission.delete({ where: { id: input.id } });
      await invalidatePermissionCache(ctx.organizationId);
      return { success: true };
    }),
});

// ── Issue Security ──────────────────────────────────────────────────────────

const issueSecurityRouter = createRouter({
  listSchemes: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.issueSecurityScheme.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        _count: { select: { levels: true, projects: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  createScheme: protectedProcedure
    .input(createIssueSecuritySchemeSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.issueSecurityScheme.create({
        data: { organizationId: ctx.organizationId, ...input },
      });
    }),

  deleteScheme: protectedProcedure
    .input(deleteIssueSecuritySchemeSchema)
    .mutation(async ({ ctx, input }) => {
      const inUse = await ctx.db.project.count({
        where: { issueSecuritySchemeId: input.id },
      });
      if (inUse > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete scheme that is assigned to projects",
        });
      }
      return ctx.db.issueSecurityScheme.delete({ where: { id: input.id } });
    }),

  addLevel: protectedProcedure
    .input(addSecurityLevelSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.issueSecurityLevel.create({ data: input });
    }),

  removeLevel: protectedProcedure
    .input(removeSecurityLevelSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.issueSecurityLevel.delete({ where: { id: input.id } });
    }),

  addLevelMember: protectedProcedure
    .input(addSecurityLevelMemberSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.issueSecurityLevelMember.create({ data: input });
    }),

  removeLevelMember: protectedProcedure
    .input(removeSecurityLevelMemberSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.issueSecurityLevelMember.delete({ where: { id: input.id } });
    }),

  assignToProject: protectedProcedure
    .input(assignSecuritySchemeToProjectSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.project.update({
        where: { id: input.projectId },
        data: { issueSecuritySchemeId: input.issueSecuritySchemeId },
      });
      return { success: true };
    }),
});

// ── Combined Router ─────────────────────────────────────────────────────────

export const permissionRouter = createRouter({
  projectRole: projectRoleRouter,
  group: groupRouter,
  permissionScheme: permissionSchemeRouter,
  globalPermission: globalPermissionRouter,
  issueSecurity: issueSecurityRouter,
});
