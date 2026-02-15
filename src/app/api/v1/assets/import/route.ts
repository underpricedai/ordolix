/**
 * REST API v1 asset import endpoint.
 *
 * - POST /api/v1/assets/import — Start an asset CSV import
 *
 * @module api-v1-assets-import
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import { startImport } from "@/modules/assets/server/import-service";

const startImportBody = z.object({
  assetTypeId: z.string().min(1),
  fileName: z.string().min(1),
  csvContent: z.string().min(1),
  columnMapping: z.record(z.string(), z.string()).default({}),
});

/**
 * POST /api/v1/assets/import
 *
 * Starts a new asset CSV import job.
 * Requires: assetTypeId, fileName, csvContent.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = startImportBody.parse(body);

  const job = await startImport(
    db,
    ctx.organizationId,
    ctx.userId ?? "system",
    input,
  );

  return res.created(job, ctx.rateLimit);
});
