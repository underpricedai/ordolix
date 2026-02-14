import { PrismaClient } from "@prisma/client";

/**
 * Creates a tenant-scoped Prisma client that automatically injects
 * organizationId into all queries and mutations.
 */
export function withTenant(prisma: PrismaClient, organizationId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }: { args: Record<string, unknown>; query: (args: unknown) => Promise<unknown> }) {
          args.where = { ...(args.where as object), organizationId };
          return query(args);
        },
        async findFirst({ args, query }: { args: Record<string, unknown>; query: (args: unknown) => Promise<unknown> }) {
          args.where = { ...(args.where as object), organizationId };
          return query(args);
        },
        async create({ args, query }: { args: Record<string, unknown>; query: (args: unknown) => Promise<unknown> }) {
          const data = args.data as Record<string, unknown>;
          data.organizationId = organizationId;
          return query(args);
        },
        async update({ args, query }: { args: Record<string, unknown>; query: (args: unknown) => Promise<unknown> }) {
          args.where = { ...(args.where as object), organizationId };
          return query(args);
        },
        async updateMany({ args, query }: { args: Record<string, unknown>; query: (args: unknown) => Promise<unknown> }) {
          args.where = { ...(args.where as object), organizationId };
          return query(args);
        },
        async delete({ args, query }: { args: Record<string, unknown>; query: (args: unknown) => Promise<unknown> }) {
          args.where = { ...(args.where as object), organizationId };
          return query(args);
        },
        async deleteMany({ args, query }: { args: Record<string, unknown>; query: (args: unknown) => Promise<unknown> }) {
          args.where = { ...(args.where as object), organizationId };
          return query(args);
        },
        async count({ args, query }: { args: Record<string, unknown>; query: (args: unknown) => Promise<unknown> }) {
          args.where = { ...(args.where as object), organizationId };
          return query(args);
        },
      },
    },
  });
}

export type TenantPrismaClient = ReturnType<typeof withTenant>;
