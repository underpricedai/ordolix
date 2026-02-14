import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { logger } from "@/server/lib/logger";
import { createDevSession, getOrganizationId } from "./dev-auth";
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
