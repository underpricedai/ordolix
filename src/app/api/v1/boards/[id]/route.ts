/**
 * REST API v1 single board endpoints.
 *
 * - GET /api/v1/boards/:id — Get board with columns
 * - PUT /api/v1/boards/:id — Update board
 * - DELETE /api/v1/boards/:id — Delete board
 *
 * @module api-v1-boards-id
 */

import { db } from "@/server/db";
import { apiHandler } from "../../lib/handler";
import * as res from "../../lib/response";
import * as boardService from "@/modules/boards/server/board-service";
import { updateBoardInput } from "@/modules/boards/types/schemas";

/**
 * GET /api/v1/boards/:id
 *
 * Retrieves a single board with its column configuration.
 */
export const GET = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Board ID is required", undefined, ctx.rateLimit);
  }

  const board = await boardService.getBoard(db, ctx.organizationId, id);

  return res.success(board, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * PUT /api/v1/boards/:id
 *
 * Updates an existing board. Accepts partial updates for name,
 * columns, swimlanes, card fields, and quick filters.
 */
export const PUT = apiHandler(async (request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Board ID is required", undefined, ctx.rateLimit);
  }

  const body = await request.json();
  const input = updateBoardInput.parse({ id, ...body });
  const { id: boardId, ...updates } = input;

  const board = await boardService.updateBoard(
    db,
    ctx.organizationId,
    boardId,
    updates,
  );

  return res.success(board, { requestId: ctx.requestId }, ctx.rateLimit);
});

/**
 * DELETE /api/v1/boards/:id
 *
 * Permanently deletes a board.
 */
export const DELETE = apiHandler(async (_request, ctx, params) => {
  const { id } = params;

  if (!id) {
    return res.badRequest("Board ID is required", undefined, ctx.rateLimit);
  }

  await boardService.deleteBoard(db, ctx.organizationId, id);

  return res.success(
    { deleted: true },
    { requestId: ctx.requestId },
    ctx.rateLimit,
  );
});
