/**
 * Zod schemas for project module inputs.
 *
 * @description Defines validation schemas for creating, updating,
 * listing, archiving projects, and managing project members.
 *
 * @module projects/types/schemas
 */

import { z } from "zod";

/** 2-10 uppercase letters for project key (e.g., "WEB", "PLATFORM") */
const projectKeySchema = z
  .string()
  .min(2)
  .max(10)
  .regex(/^[A-Z]+$/, "Project key must be 2-10 uppercase letters");

export const createProjectInput = z.object({
  name: z.string().min(1).max(255),
  key: projectKeySchema,
  description: z.string().optional(),
  projectTypeKey: z.enum(["software", "service_management", "business"]),
  leadId: z.string().optional(),
  templateKey: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectInput>;

export const updateProjectInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectInput>;

export const listProjectsInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  isArchived: z.boolean().default(false),
});

export type ListProjectsInput = z.infer<typeof listProjectsInput>;

export const getProjectInput = z.union([
  z.object({ id: z.string().min(1) }),
  z.object({ key: z.string().min(1) }),
]);

export type GetProjectInput = z.infer<typeof getProjectInput>;

export const archiveProjectInput = z.object({
  id: z.string().min(1),
});

export type ArchiveProjectInput = z.infer<typeof archiveProjectInput>;

export const addProjectMemberInput = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  roleId: z.string().min(1),
});

export type AddProjectMemberInput = z.infer<typeof addProjectMemberInput>;

export const removeProjectMemberInput = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
});

export type RemoveProjectMemberInput = z.infer<typeof removeProjectMemberInput>;
