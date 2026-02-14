import type { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError, PermissionError } from "@/server/lib/errors";
import type {
  CreateDashboardInput,
  UpdateDashboardInput,
  AddWidgetInput,
  UpdateWidgetInput,
} from "../types/schemas";

export async function createDashboard(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  input: CreateDashboardInput,
) {
  return db.dashboard.create({
    data: {
      organizationId,
      ownerId: userId,
      name: input.name,
      isShared: input.isShared,
      layout: (input.layout ?? []) as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function getDashboard(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const dashboard = await db.dashboard.findFirst({
    where: { id, organizationId },
    include: { widgets: true },
  });
  if (!dashboard) {
    throw new NotFoundError("Dashboard", id);
  }
  return dashboard;
}

export async function listDashboards(
  db: PrismaClient,
  organizationId: string,
  userId: string,
) {
  return db.dashboard.findMany({
    where: {
      organizationId,
      OR: [{ ownerId: userId }, { isShared: true }],
    },
    include: { widgets: true },
  });
}

export async function updateDashboard(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  id: string,
  updates: Omit<UpdateDashboardInput, "id">,
) {
  const existing = await db.dashboard.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("Dashboard", id);
  }
  if (existing.ownerId !== userId && !existing.isShared) {
    throw new PermissionError(
      "You do not have permission to update this dashboard",
    );
  }

  const data: Prisma.DashboardUpdateInput = {};
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.isShared !== undefined) data.isShared = updates.isShared;
  if (updates.layout !== undefined)
    data.layout = updates.layout as unknown as Prisma.InputJsonValue;

  return db.dashboard.update({ where: { id }, data });
}

export async function deleteDashboard(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  id: string,
) {
  const existing = await db.dashboard.findFirst({
    where: { id, organizationId },
  });
  if (!existing) {
    throw new NotFoundError("Dashboard", id);
  }
  if (existing.ownerId !== userId) {
    throw new PermissionError(
      "You do not have permission to delete this dashboard",
    );
  }
  await db.dashboard.delete({ where: { id } });
}

export async function addWidget(
  db: PrismaClient,
  organizationId: string,
  input: AddWidgetInput,
) {
  const dashboard = await db.dashboard.findFirst({
    where: { id: input.dashboardId, organizationId },
  });
  if (!dashboard) {
    throw new NotFoundError("Dashboard", input.dashboardId);
  }

  return db.dashboardWidget.create({
    data: {
      dashboardId: input.dashboardId,
      widgetType: input.widgetType,
      title: input.title,
      config: (input.config ?? {}) as unknown as Prisma.InputJsonValue,
      position: (input.position ?? {}) as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function updateWidget(
  db: PrismaClient,
  organizationId: string,
  id: string,
  updates: Omit<UpdateWidgetInput, "id">,
) {
  const existing = await db.dashboardWidget.findFirst({
    where: {
      id,
      dashboard: { organizationId },
    },
  });
  if (!existing) {
    throw new NotFoundError("DashboardWidget", id);
  }

  const data: Prisma.DashboardWidgetUpdateInput = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.config !== undefined)
    data.config = updates.config as unknown as Prisma.InputJsonValue;
  if (updates.position !== undefined)
    data.position = updates.position as unknown as Prisma.InputJsonValue;

  return db.dashboardWidget.update({ where: { id }, data });
}

export async function deleteWidget(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  const existing = await db.dashboardWidget.findFirst({
    where: {
      id,
      dashboard: { organizationId },
    },
  });
  if (!existing) {
    throw new NotFoundError("DashboardWidget", id);
  }
  await db.dashboardWidget.delete({ where: { id } });
}
