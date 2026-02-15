/**
 * Dev-only API endpoint that lists seeded users for the dev login picker.
 *
 * @description Returns a list of users with their org membership roles.
 * Only available in non-production environments.
 *
 * @module dev-users-api
 */

import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const members = await db.organizationMember.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });

  const users = members.map((m) => ({
    id: m.user.id,
    name: m.user.name ?? m.user.email,
    email: m.user.email,
    role: m.role,
  }));

  return NextResponse.json({ users });
}
