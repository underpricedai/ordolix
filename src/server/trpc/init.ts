import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { logger } from "@/server/lib/logger";
import type { Session } from "next-auth";

export interface TRPCContext {
  db: typeof db;
  session: Session | null;
  requestId: string;
  logger: typeof logger;
}

export async function createTRPCContext(): Promise<TRPCContext> {
  const session = await auth();
  const requestId = crypto.randomUUID();

  return {
    db,
    session,
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
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});
