import { db } from "@/server/db";
import type { Session } from "next-auth";

/**
 * Returns a mock session for development by querying the first user and their
 * organization membership from the database. Only used when NODE_ENV !== "production"
 * and no real auth session exists.
 *
 * If the database has no organization members (fresh DB after migration but
 * before seeding), automatically creates a minimal dev org + user + member
 * so the app is immediately usable in development.
 */
export async function createDevSession(): Promise<Session | null> {
  try {
    let member = await db.organizationMember.findFirst({
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    });

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
