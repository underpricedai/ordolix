import { z } from "zod";

export const formFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    "text",
    "number",
    "select",
    "multiselect",
    "date",
    "checkbox",
    "textarea",
  ]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  defaultValue: z.unknown().optional(),
});

export type FormField = z.infer<typeof formFieldSchema>;

export const createFormTemplateInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  schema: z.array(formFieldSchema).min(1),
  isActive: z.boolean().default(true),
});

export type CreateFormTemplateInput = z.infer<typeof createFormTemplateInput>;

export const updateFormTemplateInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  schema: z.array(formFieldSchema).min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateFormTemplateInput = z.infer<typeof updateFormTemplateInput>;

export const listFormTemplatesInput = z.object({
  isActive: z.boolean().optional(),
});

export type ListFormTemplatesInput = z.infer<typeof listFormTemplatesInput>;

export const submitFormInput = z.object({
  formTemplateId: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
  issueId: z.string().optional(),
});

export type SubmitFormInput = z.infer<typeof submitFormInput>;

export const updateSubmissionStatusInput = z.object({
  id: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
});

export type UpdateSubmissionStatusInput = z.infer<
  typeof updateSubmissionStatusInput
>;

export const listSubmissionsInput = z.object({
  formTemplateId: z.string().min(1),
  status: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type ListSubmissionsInput = z.infer<typeof listSubmissionsInput>;
