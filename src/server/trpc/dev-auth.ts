import { db } from "@/server/db";
import type { Session } from "next-auth";

/**
 * Returns a mock session for development by querying the first user and their
 * organization membership from the database. Only used when NODE_ENV !== "production"
 * and no real auth session exists.
 */
export async function createDevSession(): Promise<Session | null> {
  const member = await db.organizationMember.findFirst({
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  if (!member) {
    return null;
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
