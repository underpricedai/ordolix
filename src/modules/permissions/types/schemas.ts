/**
 * Zod schemas for the permissions module CRUD operations.
 *
 * @module permission-schemas
 */

import { z } from "zod";
import {
  ALL_PROJECT_PERMISSIONS,
  ALL_GLOBAL_PERMISSIONS,
  HOLDER_TYPES,
  SECURITY_HOLDER_TYPES,
} from "./constants";

// ── Project Roles ───────────────────────────────────────────────────────────

export const createProjectRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

export const updateProjectRoleSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullish(),
  isDefault: z.boolean().optional(),
});

export const deleteProjectRoleSchema = z.object({
  id: z.string().cuid(),
});

// ── Groups ──────────────────────────────────────────────────────────────────

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const updateGroupSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullish(),
});

export const deleteGroupSchema = z.object({
  id: z.string().cuid(),
});

export const groupMemberSchema = z.object({
  groupId: z.string().cuid(),
  userId: z.string().cuid(),
});

// ── Permission Schemes ──────────────────────────────────────────────────────

export const createPermissionSchemeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  isDefault: z.boolean().optional(),
  parentId: z.string().cuid().nullish(),
});

export const updatePermissionSchemeSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullish(),
  isDefault: z.boolean().optional(),
  parentId: z.string().cuid().nullish(),
});

export const deletePermissionSchemeSchema = z.object({
  id: z.string().cuid(),
});

export const addPermissionGrantSchema = z.object({
  permissionSchemeId: z.string().cuid(),
  permissionKey: z.enum(ALL_PROJECT_PERMISSIONS as [string, ...string[]]),
  holderType: z.enum(
    Object.values(HOLDER_TYPES) as [string, ...string[]],
  ),
  projectRoleId: z.string().cuid().optional(),
  groupId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
});

export const removePermissionGrantSchema = z.object({
  id: z.string().cuid(),
});

export const assignSchemeToProjectSchema = z.object({
  projectId: z.string().cuid(),
  permissionSchemeId: z.string().cuid().nullable(),
});

// ── Global Permissions ──────────────────────────────────────────────────────

export const addGlobalPermissionSchema = z.object({
  permissionKey: z.enum(ALL_GLOBAL_PERMISSIONS as [string, ...string[]]),
  holderType: z.enum(["group", "user"] as [string, ...string[]]),
  groupId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
});

export const removeGlobalPermissionSchema = z.object({
  id: z.string().cuid(),
});

// ── Issue Security Schemes ──────────────────────────────────────────────────

export const createIssueSecuritySchemeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const deleteIssueSecuritySchemeSchema = z.object({
  id: z.string().cuid(),
});

export const addSecurityLevelSchema = z.object({
  issueSecuritySchemeId: z.string().cuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const removeSecurityLevelSchema = z.object({
  id: z.string().cuid(),
});

export const addSecurityLevelMemberSchema = z.object({
  issueSecurityLevelId: z.string().cuid(),
  holderType: z.enum(
    Object.values(SECURITY_HOLDER_TYPES) as [string, ...string[]],
  ),
  projectRoleId: z.string().cuid().optional(),
  groupId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
});

export const removeSecurityLevelMemberSchema = z.object({
  id: z.string().cuid(),
});

export const assignSecuritySchemeToProjectSchema = z.object({
  projectId: z.string().cuid(),
  issueSecuritySchemeId: z.string().cuid().nullable(),
});

export const getPermissionSchemeSchema = z.object({
  id: z.string().cuid(),
});

export const listGroupMembersSchema = z.object({
  groupId: z.string().cuid(),
});
