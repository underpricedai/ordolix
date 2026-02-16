/**
 * REST API v1 attachment upload endpoint.
 *
 * - POST /api/v1/attachments/upload — Upload a file attachment to an issue
 *
 * Currently stores metadata only (R2 blob upload is a future enhancement).
 *
 * @module api-v1-attachments-upload
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { createDevSession, getOrganizationId } from "@/server/trpc/dev-auth";

/** Maximum file size in bytes (25 MB) */
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * POST /api/v1/attachments/upload
 *
 * Accepts multipart/form-data with a `file` field and an `issueId` field.
 * Validates the file size (max 25 MB) and creates an Attachment record
 * in the database with a generated storage key.
 *
 * Currently skips actual R2 upload — only metadata is persisted.
 *
 * @returns JSON with the created attachment record
 */
export async function POST(req: NextRequest) {
  // 1. Auth check via NextAuth session
  let session = await auth();

  // Dev auth fallback
  if (!session && process.env.NODE_ENV !== "production") {
    session = await createDevSession();
  }

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 },
    );
  }

  const userId = session.user.id;
  const organizationId = await getOrganizationId(userId);

  if (!organizationId) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "No organization found for user" } },
      { status: 403 },
    );
  }

  // 2. Parse FormData from request
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid form data" } },
      { status: 400 },
    );
  }

  // 3. Extract file, issueId from form data
  const file = formData.get("file") as File | null;
  const issueId = formData.get("issueId") as string | null;

  // 4. Validate: file exists, file size < 25MB, issueId present
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Missing file field" } },
      { status: 400 },
    );
  }

  if (!issueId || typeof issueId !== "string" || issueId.trim().length === 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Missing issueId field" } },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: {
          code: "FILE_TOO_LARGE",
          message: `File exceeds ${MAX_FILE_SIZE / (1024 * 1024)} MB limit`,
        },
      },
      { status: 413 },
    );
  }

  // Verify issue exists in the organization
  const issue = await db.issue.findFirst({
    where: { id: issueId, organizationId, deletedAt: null },
    select: { id: true },
  });

  if (!issue) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Issue not found" } },
      { status: 404 },
    );
  }

  // 5. Generate storageKey
  const storageKey = `${organizationId}/attachments/${issueId}/${crypto.randomUUID()}-${file.name}`;

  // 6. Skip actual R2 upload (metadata only for now)

  // 7. Create Attachment record in DB
  const attachment = await db.attachment.create({
    data: {
      organizationId,
      issueId,
      uploaderId: userId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      storageKey,
    },
  });

  // 8. Return created attachment
  return NextResponse.json(
    {
      data: {
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        storageKey: attachment.storageKey,
      },
    },
    { status: 201 },
  );
}
