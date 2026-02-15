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

// ── Component Schemas ────────────────────────────────────────────────────────

export const listComponentsInput = z.object({ projectId: z.string().min(1) });

export type ListComponentsInput = z.infer<typeof listComponentsInput>;

export const createComponentInput = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  lead: z.string().optional(),
});

export type CreateComponentInput = z.infer<typeof createComponentInput>;

export const updateComponentInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  lead: z.string().nullable().optional(),
});

export type UpdateComponentInput = z.infer<typeof updateComponentInput>;

export const deleteComponentInput = z.object({ id: z.string().min(1) });

export type DeleteComponentInput = z.infer<typeof deleteComponentInput>;

// ── Version Schemas ──────────────────────────────────────────────────────────

export const listVersionsInput = z.object({ projectId: z.string().min(1) });

export type ListVersionsInput = z.infer<typeof listVersionsInput>;

export const createVersionInput = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  startDate: z.coerce.date().optional(),
  releaseDate: z.coerce.date().optional(),
});

export type CreateVersionInput = z.infer<typeof createVersionInput>;

export const updateVersionInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  releaseDate: z.coerce.date().nullable().optional(),
  status: z.string().optional(),
});

export type UpdateVersionInput = z.infer<typeof updateVersionInput>;

export const deleteVersionInput = z.object({ id: z.string().min(1) });

export type DeleteVersionInput = z.infer<typeof deleteVersionInput>;

export const releaseVersionInput = z.object({ id: z.string().min(1) });

export type ReleaseVersionInput = z.infer<typeof releaseVersionInput>;
