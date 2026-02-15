import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

export async function GET() {
  const info: Record<string, unknown> = {
    nodeEnv: process.env.NODE_ENV,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
  };

  try {
    const session = await auth();
    info.session = session
      ? { userId: session.user?.id, email: session.user?.email, name: session.user?.name }
      : null;
  } catch (error) {
    info.authError = String(error);
  }

  try {
    const userCount = await db.user.count();
    const memberCount = await db.organizationMember.count();
    info.dbStatus = { userCount, memberCount };

    // Check if users have password hashes
    const usersWithHash = await db.user.count({ where: { passwordHash: { not: null } } });
    info.dbStatus = { ...info.dbStatus as object, usersWithPasswordHash: usersWithHash };
  } catch (error) {
    info.dbError = String(error);
  }

  return NextResponse.json(info);
}
