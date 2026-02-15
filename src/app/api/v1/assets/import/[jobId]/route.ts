/**
 * REST API v1 asset import job status endpoint.
 *
 * - GET /api/v1/assets/import/:jobId — Get import job status
 *
 * @module api-v1-assets-import-status
 */

import { db } from "@/server/db";
import { apiHandler } from "../../../lib/handler";
import * as res from "../../../lib/response";
import { getImportStatus } from "@/modules/assets/server/import-service";

/**
 * GET /api/v1/assets/import/:jobId
 *
 * Returns the current status of an import job including
 * progress counts and any errors.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const jobId = params.jobId;
  if (!jobId) {
    return res.badRequest("jobId is required");
  }

  const job = await getImportStatus(db, ctx.organizationId, jobId);

  return res.success(job, undefined, ctx.rateLimit);
});
