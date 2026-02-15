/**
 * @description Zod validation schemas for the Custom Fields module.
 * Defines input shapes for creating, updating, listing, and managing
 * custom field definitions and their values on entities (issues, assets).
 */
import { z } from "zod";

/** Supported custom field types */
export const fieldType = z.enum([
  "text",
  "number",
  "date",
  "select",
  "multiSelect",
  "checkbox",
  "url",
  "user",
  "label",
]);

export type FieldType = z.infer<typeof fieldType>;

/** Context where a custom field can be applied */
export const fieldContext = z.enum(["issue", "project", "asset"]);

export type FieldContext = z.infer<typeof fieldContext>;

/** Entity types that can hold custom field values */
export const entityType = z.enum(["issue", "asset"]);

export type EntityType = z.infer<typeof entityType>;

/**
 * Input schema for creating a new custom field definition.
 * Options are required when fieldType is "select" or "multiSelect".
 */
export const createCustomFieldInput = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    fieldType: fieldType,
    isRequired: z.boolean().default(false),
    options: z.array(z.string().min(1)).optional(),
    defaultValue: z.unknown().optional(),
    context: fieldContext.default("issue"),
  })
  .refine(
    (data) => {
      if (data.fieldType === "select" || data.fieldType === "multiSelect") {
        return data.options && data.options.length > 0;
      }
      return true;
    },
    {
      message: "Options are required for select and multiSelect field types",
      path: ["options"],
    },
  );

export type CreateCustomFieldInput = z.infer<typeof createCustomFieldInput>;

/**
 * Input schema for updating an existing custom field definition.
 * Note: fieldType cannot be changed after creation.
 */
export const updateCustomFieldInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  isRequired: z.boolean().optional(),
  options: z.array(z.string().min(1)).optional(),
  defaultValue: z.unknown().optional(),
});

export type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldInput>;

/** Input schema for listing custom fields, optionally filtered by context */
export const listCustomFieldsInput = z.object({
  context: fieldContext.optional(),
});

export type ListCustomFieldsInput = z.infer<typeof listCustomFieldsInput>;

/**
 * Input schema for setting a custom field value on an entity.
 * The value is validated at the service layer against the field definition.
 */
export const setFieldValueInput = z.object({
  entityId: z.string().min(1),
  entityType: entityType,
  fieldId: z.string().min(1),
  value: z.unknown(),
});

export type SetFieldValueInput = z.infer<typeof setFieldValueInput>;

/** Input schema for retrieving all custom field values for an entity */
export const getFieldValuesInput = z.object({
  entityId: z.string().min(1),
  entityType: entityType,
});

export type GetFieldValuesInput = z.infer<typeof getFieldValuesInput>;

// ── Field Configuration Scheme Schemas ─────────────────────────────────────

export const createFieldConfigSchemeInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export type CreateFieldConfigSchemeInput = z.infer<typeof createFieldConfigSchemeInput>;

export const updateFieldConfigSchemeInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
});

export type UpdateFieldConfigSchemeInput = z.infer<typeof updateFieldConfigSchemeInput>;

export const addFieldConfigEntryInput = z.object({
  fieldConfigurationSchemeId: z.string().min(1),
  customFieldId: z.string().min(1),
  isVisible: z.boolean().default(true),
  isRequired: z.boolean().default(false),
  position: z.number().int().min(0).optional(),
});

export type AddFieldConfigEntryInput = z.infer<typeof addFieldConfigEntryInput>;

export const updateFieldConfigEntryInput = z.object({
  id: z.string().min(1),
  isVisible: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export type UpdateFieldConfigEntryInput = z.infer<typeof updateFieldConfigEntryInput>;

export const removeFieldConfigEntryInput = z.object({
  id: z.string().min(1),
});

export type RemoveFieldConfigEntryInput = z.infer<typeof removeFieldConfigEntryInput>;

export const assignFieldConfigSchemeInput = z.object({
  schemeId: z.string().min(1),
  projectId: z.string().min(1),
});

export type AssignFieldConfigSchemeInput = z.infer<typeof assignFieldConfigSchemeInput>;
