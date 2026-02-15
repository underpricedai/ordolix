import { cookies } from "next/headers";
import { db } from "@/server/db";
import type { Session } from "next-auth";

/**
 * Returns a mock session for development by checking the dev-user-id cookie
 * first, then falling back to the first user in the database. Only used when
 * NODE_ENV !== "production" and no real auth session exists.
 *
 * If the database has no organization members (fresh DB after migration but
 * before seeding), automatically creates a minimal dev org + user + member
 * so the app is immediately usable in development.
 */
export async function createDevSession(): Promise<Session | null> {
  try {
    // Check for dev-user-id cookie to support user picker
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let member: any = null;

    try {
      const cookieStore = await cookies();
      const devUserId = cookieStore.get("dev-user-id")?.value;
      if (devUserId) {
        member = await db.organizationMember.findFirst({
          where: { userId: devUserId },
          include: { user: true },
          orderBy: { joinedAt: "asc" },
        });
      }
    } catch {
      // cookies() may fail in non-request contexts (e.g., during build)
    }

    // Fallback: use first user
    if (!member) {
      member = await db.organizationMember.findFirst({
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      });
    }

    if (!member) {
      console.warn(
        "[dev-auth] No organization members found. Auto-creating dev data...",
      );

      const org = await db.organization.create({
        data: { name: "Dev Organization", slug: "dev-org" },
      });

      const user = await db.user.create({
        data: { name: "Dev User", email: "dev@ordolix.local" },
      });

      member = await db.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: "admin",
        },
        include: { user: true },
      });

      console.warn(
        "[dev-auth] Dev data created: org=%s, user=%s",
        org.id,
        user.id,
      );
    }

    return {
      user: {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        image: member.user.image,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch (error) {
    console.error("[dev-auth] Failed to create dev session:", error);
    return null;
  }
}

/**
 * Looks up the user's organization membership and returns the organizationId.
 */
export async function getOrganizationId(userId: string): Promise<string | null> {
  const member = await db.organizationMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "asc" },
  });

  return member?.organizationId ?? null;
}
