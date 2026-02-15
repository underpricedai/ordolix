import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { logger } from "@/server/lib/logger";
import { createDevSession, getOrganizationId } from "./dev-auth";
import {
  checkPermission,
  checkGlobalPermission,
} from "@/modules/permissions/server/permission-checker";
import type { Session } from "next-auth";

export interface TRPCContext {
  db: typeof db;
  session: Session | null;
  organizationId: string | null;
  requestId: string;
  logger: typeof logger;
}

export async function createTRPCContext(): Promise<TRPCContext> {
  let session = await auth();

  // Dev auth fallback: use first user from DB when no real session exists
  if (!session && process.env.NODE_ENV !== "production") {
    session = await createDevSession();
  }

  let organizationId: string | null = null;
  if (session?.user?.id) {
    organizationId = await getOrganizationId(session.user.id);
  }

  const requestId = crypto.randomUUID();

  return {
    db,
    session,
    organizationId,
    requestId,
    logger: logger.child({ requestId }),
  };
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        code: error.code,
      },
    };
  },
});

export const createRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user?.id || !ctx.organizationId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
      organizationId: ctx.organizationId,
    },
  });
});

/**
 * Creates a procedure that requires a specific project-level permission.
 * The input must contain a `projectId` field.
 */
export function requirePermission(permissionKey: string) {
  return protectedProcedure.use(async ({ ctx, next, input }) => {
    const projectId = (input as unknown as Record<string, unknown> | undefined)?.projectId;
    if (typeof projectId !== "string") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "projectId is required" });
    }
    const allowed = await checkPermission(
      ctx.db,
      ctx.session.user.id!,
      projectId,
      ctx.organizationId,
      permissionKey,
    );
    if (!allowed) {
      throw new TRPCError({ code: "FORBIDDEN", message: `Missing permission: ${permissionKey}` });
    }
    return next({ ctx });
  });
}

/**
 * Creates a procedure that requires a specific global (org-level) permission.
 */
export function requireGlobalPermission(permissionKey: string) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const allowed = await checkGlobalPermission(
      ctx.db,
      ctx.session.user.id!,
      ctx.organizationId,
      permissionKey,
    );
    if (!allowed) {
      throw new TRPCError({ code: "FORBIDDEN", message: `Missing global permission: ${permissionKey}` });
    }
    return next({ ctx });
  });
}

/** Admin-only procedure — requires the ADMINISTER global permission. */
export const adminProcedure = requireGlobalPermission("ADMINISTER");

/**
 * Asserts a project-level permission inline (for procedures where projectId
 * must be resolved from an entity rather than taken from input).
 *
 * @throws TRPCError FORBIDDEN if user lacks the permission
 */
export async function assertPermission(
  ctx: { db: typeof db; session: { user: { id?: string | null } }; organizationId: string },
  projectId: string,
  permissionKey: string,
): Promise<void> {
  const userId = ctx.session.user.id;
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const allowed = await checkPermission(ctx.db, userId, projectId, ctx.organizationId, permissionKey);
  if (!allowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: `Missing permission: ${permissionKey}` });
  }
}

/**
 * Asserts a global (org-level) permission inline.
 *
 * @throws TRPCError FORBIDDEN if user lacks the permission
 */
export async function assertGlobalPermission(
  ctx: { db: typeof db; session: { user: { id?: string | null } }; organizationId: string },
  permissionKey: string,
): Promise<void> {
  const userId = ctx.session.user.id;
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const allowed = await checkGlobalPermission(ctx.db, userId, ctx.organizationId, permissionKey);
  if (!allowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: `Missing global permission: ${permissionKey}` });
  }
}
