import type { PrismaClient, Prisma } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import type {
  CreateFormTemplateInput,
  UpdateFormTemplateInput,
  ListFormTemplatesInput,
  SubmitFormInput,
  ListSubmissionsInput,
} from "../types/schemas";

const TEMPLATE_SELECT = {
  id: true,
  organizationId: true,
  name: true,
  description: true,
  config: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function createTemplate(
  db: PrismaClient,
  organizationId: string,
  input: CreateFormTemplateInput,
) {
  return db.formTemplate.create({
    data: {
      organizationId,
      name: input.name,
      description: input.description,
      config: input.schema as unknown as Prisma.InputJsonValue,
      isActive: input.isActive,
    },
    select: TEMPLATE_SELECT,
  });
}

export async function getTemplate(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const template = await db.formTemplate.findFirst({
    where: { id, organizationId },
    select: {
      ...TEMPLATE_SELECT,
      _count: { select: { submissions: true } },
    },
  });
  if (!template) {
    throw new NotFoundError("FormTemplate", id);
  }
  return template;
}

export async function listTemplates(
  db: PrismaClient,
  organizationId: string,
  input: ListFormTemplatesInput,
) {
  return db.formTemplate.findMany({
    where: {
      organizationId,
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    select: TEMPLATE_SELECT,
    orderBy: { createdAt: "desc" as const },
  });
}

export async function updateTemplate(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: Omit<UpdateFormTemplateInput, "id">,
) {
  const existing = await db.formTemplate.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("FormTemplate", id);
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.schema !== undefined) data.config = input.schema as unknown as Prisma.InputJsonValue;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  return db.formTemplate.update({
    where: { id },
    data,
    select: TEMPLATE_SELECT,
  });
}

export async function deleteTemplate(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const existing = await db.formTemplate.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("FormTemplate", id);
  }

  return db.formTemplate.delete({
    where: { id },
  });
}

export async function submitForm(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: SubmitFormInput,
) {
  const template = await db.formTemplate.findFirst({
    where: { id: input.formTemplateId, organizationId },
  });
  if (!template) {
    throw new NotFoundError("FormTemplate", input.formTemplateId);
  }
  if (!template.isActive) {
    throw new ValidationError("Form template is not active", {
      code: "FORM_TEMPLATE_INACTIVE",
      templateId: input.formTemplateId,
    });
  }

  return db.formSubmission.create({
    data: {
      organizationId,
      templateId: input.formTemplateId,
      submittedBy: userId,
      data: input.data as unknown as Prisma.InputJsonValue,
      issueId: input.issueId,
    },
    include: {
      template: { select: { id: true, name: true } },
    },
  });
}

export async function getSubmission(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const submission = await db.formSubmission.findFirst({
    where: { id, organizationId },
    include: {
      template: { select: { id: true, name: true, config: true } },
    },
  });
  if (!submission) {
    throw new NotFoundError("FormSubmission", id);
  }
  return submission;
}

export async function listSubmissions(
  db: PrismaClient,
  organizationId: string,
  input: ListSubmissionsInput,
) {
  return db.formSubmission.findMany({
    where: {
      organizationId,
      templateId: input.formTemplateId,
      ...(input.status ? { status: input.status } : {}),
    },
    include: {
      template: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" as const },
    take: input.limit,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
  });
}

export async function updateSubmissionStatus(
  db: PrismaClient,
  organizationId: string,
  id: string,
  status: "approved" | "rejected",
) {
  const submission = await db.formSubmission.findFirst({
    where: { id, organizationId },
  });
  if (!submission) {
    throw new NotFoundError("FormSubmission", id);
  }

  return db.formSubmission.update({
    where: { id },
    data: { status },
    include: {
      template: { select: { id: true, name: true } },
    },
  });
}
