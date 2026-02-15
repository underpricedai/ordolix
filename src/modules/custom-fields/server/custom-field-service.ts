/**
 * @description Business logic for custom field management.
 * Handles CRUD operations on custom field definitions and
 * value assignment/retrieval on entities (issues, assets).
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import type {
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
  ListCustomFieldsInput,
  SetFieldValueInput,
  GetFieldValuesInput,
} from "../types/schemas";

/**
 * Creates a new custom field definition for an organization.
 * @param db - Prisma client instance
 * @param organizationId - Owning organization
 * @param userId - User performing the action (for audit log)
 * @param input - Field definition data
 * @returns The created CustomField record
 * @throws ValidationError if options are missing for select/multiSelect types
 */
export async function createField(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: CreateCustomFieldInput,
) {
  // Validate options for select types (also validated in Zod, but defense-in-depth)
  if (
    (input.fieldType === "select" || input.fieldType === "multiSelect") &&
    (!input.options || input.options.length === 0)
  ) {
    throw new ValidationError(
      "Options are required for select and multiSelect field types",
      { fieldType: input.fieldType },
    );
  }

  const field = await db.customField.create({
    data: {
      organizationId,
      name: input.name,
      fieldType: input.fieldType,
      description: input.description,
      isRequired: input.isRequired,
      options: input.options as unknown as Prisma.InputJsonValue,
      defaultValue: input.defaultValue as unknown as Prisma.InputJsonValue,
      context: { type: input.context } as unknown as Prisma.InputJsonValue,
    },
  });

  await db.auditLog.create({
    data: {
      organizationId,
      userId,
      entityType: "CustomField",
      entityId: field.id,
      action: "CREATED",
      diff: { name: input.name, fieldType: input.fieldType },
    },
  });

  return field;
}

/**
 * Updates an existing custom field definition.
 * @param db - Prisma client instance
 * @param organizationId - Owning organization
 * @param input - Partial update data including field id
 * @returns The updated CustomField record
 * @throws NotFoundError if the field does not exist in the organization
 */
export async function updateField(
  db: PrismaClient,
  organizationId: string,
  input: UpdateCustomFieldInput,
) {
  const existing = await db.customField.findFirst({
    where: { id: input.id, organizationId },
  });

  if (!existing) {
    throw new NotFoundError("CustomField", input.id);
  }

  const data: Prisma.CustomFieldUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.isRequired !== undefined) data.isRequired = input.isRequired;
  if (input.options !== undefined) {
    data.options = input.options as unknown as Prisma.InputJsonValue;
  }
  if (input.defaultValue !== undefined) {
    data.defaultValue = input.defaultValue as unknown as Prisma.InputJsonValue;
  }

  return db.customField.update({
    where: { id: input.id },
    data,
  });
}

/**
 * Lists custom field definitions for an organization.
 * @param db - Prisma client instance
 * @param organizationId - Owning organization
 * @param input - Optional context filter
 * @returns Array of CustomField records ordered by name
 */
export async function listFields(
  db: PrismaClient,
  organizationId: string,
  input: ListCustomFieldsInput,
) {
  const where: Prisma.CustomFieldWhereInput = { organizationId };

  if (input.context) {
    where.context = {
      path: ["type"],
      equals: input.context,
    };
  }

  return db.customField.findMany({
    where,
    orderBy: { name: "asc" },
  });
}

/**
 * Gets a single custom field definition by ID.
 * @param db - Prisma client instance
 * @param organizationId - Owning organization
 * @param fieldId - The custom field ID
 * @returns The CustomField record
 * @throws NotFoundError if the field does not exist in the organization
 */
export async function getField(
  db: PrismaClient,
  organizationId: string,
  fieldId: string,
) {
  const field = await db.customField.findFirst({
    where: { id: fieldId, organizationId },
  });

  if (!field) {
    throw new NotFoundError("CustomField", fieldId);
  }

  return field;
}

/**
 * Deletes a custom field definition and cascades to its values.
 * @param db - Prisma client instance
 * @param organizationId - Owning organization
 * @param fieldId - The custom field ID
 * @throws NotFoundError if the field does not exist in the organization
 */
export async function deleteField(
  db: PrismaClient,
  organizationId: string,
  fieldId: string,
) {
  const existing = await db.customField.findFirst({
    where: { id: fieldId, organizationId },
  });

  if (!existing) {
    throw new NotFoundError("CustomField", fieldId);
  }

  await db.customField.delete({ where: { id: fieldId } });
}

/**
 * Sets (upserts) a custom field value on an entity.
 * Validates that the value matches the field type definition.
 * @param db - Prisma client instance
 * @param organizationId - Owning organization
 * @param input - Entity + field + value data
 * @returns The upserted CustomFieldValue record
 * @throws NotFoundError if the field does not exist
 * @throws ValidationError if the value does not match the field type
 */
export async function setFieldValue(
  db: PrismaClient,
  organizationId: string,
  input: SetFieldValueInput,
) {
  // Load field definition
  const field = await db.customField.findFirst({
    where: { id: input.fieldId, organizationId },
  });

  if (!field) {
    throw new NotFoundError("CustomField", input.fieldId);
  }

  // Validate value against field type
  validateFieldValue(field.fieldType, input.value, field.options);

  // If fieldType is "user", verify user exists
  if (field.fieldType === "user" && input.value) {
    const user = await db.user.findFirst({
      where: { id: input.value as string },
    });
    if (!user) {
      throw new ValidationError("User not found", {
        userId: input.value as string,
      });
    }
  }

  return db.customFieldValue.upsert({
    where: {
      fieldId_entityId_entityType: {
        fieldId: input.fieldId,
        entityId: input.entityId,
        entityType: input.entityType,
      },
    },
    create: {
      organizationId,
      fieldId: input.fieldId,
      entityId: input.entityId,
      entityType: input.entityType,
      value: input.value as unknown as Prisma.InputJsonValue,
    },
    update: {
      value: input.value as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * Retrieves all custom field values for an entity, joined with field definitions.
 * @param db - Prisma client instance
 * @param organizationId - Owning organization
 * @param input - Entity identification
 * @returns Array of { fieldId, fieldName, fieldType, value } objects
 */
export async function getFieldValues(
  db: PrismaClient,
  organizationId: string,
  input: GetFieldValuesInput,
) {
  const values = await db.customFieldValue.findMany({
    where: {
      organizationId,
      entityId: input.entityId,
      entityType: input.entityType,
    },
    include: {
      field: true,
    },
  });

  return values.map((v) => ({
    fieldId: v.fieldId,
    fieldName: v.field.name,
    fieldType: v.field.fieldType,
    value: v.value,
  }));
}

/**
 * Validates a value against a custom field type definition.
 * @param type - The field type string
 * @param value - The value to validate
 * @param options - Available options (for select/multiSelect fields)
 * @throws ValidationError if validation fails
 * @internal
 */
export function validateFieldValue(
  type: string,
  value: unknown,
  options: unknown,
): void {
  switch (type) {
    case "text": {
      if (typeof value !== "string") {
        throw new ValidationError("Text field value must be a string", {
          fieldType: type,
        });
      }
      break;
    }
    case "number": {
      if (typeof value !== "number") {
        throw new ValidationError("Number field value must be a number", {
          fieldType: type,
        });
      }
      break;
    }
    case "date": {
      if (typeof value !== "string" || isNaN(Date.parse(value))) {
        throw new ValidationError(
          "Date field value must be a valid ISO date string",
          { fieldType: type },
        );
      }
      break;
    }
    case "select": {
      if (typeof value !== "string") {
        throw new ValidationError("Select field value must be a string", {
          fieldType: type,
        });
      }
      const selectOptions = options as string[] | null;
      if (
        selectOptions &&
        Array.isArray(selectOptions) &&
        !selectOptions.includes(value)
      ) {
        throw new ValidationError(
          `Value "${value}" is not one of the allowed options`,
          { fieldType: type, options: selectOptions },
        );
      }
      break;
    }
    case "multiSelect": {
      if (!Array.isArray(value)) {
        throw new ValidationError(
          "MultiSelect field value must be an array of strings",
          { fieldType: type },
        );
      }
      const multiOptions = options as string[] | null;
      if (multiOptions && Array.isArray(multiOptions)) {
        for (const v of value) {
          if (!multiOptions.includes(v as string)) {
            throw new ValidationError(
              `Value "${v}" is not one of the allowed options`,
              { fieldType: type, options: multiOptions },
            );
          }
        }
      }
      break;
    }
    case "checkbox": {
      if (typeof value !== "boolean") {
        throw new ValidationError("Checkbox field value must be a boolean", {
          fieldType: type,
        });
      }
      break;
    }
    case "url": {
      if (typeof value !== "string") {
        throw new ValidationError("URL field value must be a string", {
          fieldType: type,
        });
      }
      try {
        new URL(value);
      } catch {
        throw new ValidationError("URL field value must be a valid URL", {
          fieldType: type,
        });
      }
      break;
    }
    case "user": {
      if (typeof value !== "string") {
        throw new ValidationError("User field value must be a user ID string", {
          fieldType: type,
        });
      }
      break;
    }
    case "label": {
      if (typeof value !== "string") {
        throw new ValidationError("Label field value must be a string", {
          fieldType: type,
        });
      }
      break;
    }
    default: {
      throw new ValidationError(`Unknown field type: ${type}`, {
        fieldType: type,
      });
    }
  }
}
