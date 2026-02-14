/**
 * REST API v1 boards collection endpoints.
 *
 * - GET /api/v1/boards — List boards (with optional project filter)
 * - POST /api/v1/boards — Create a new board
 *
 * @module api-v1-boards
 */

import { z } from "zod";
import { db } from "@/server/db";
import { apiHandler } from "../lib/handler";
import * as res from "../lib/response";
import * as boardService from "@/modules/boards/server/board-service";
import { createBoardInput } from "@/modules/boards/types/schemas";

/** Query parameters for listing boards */
const listQuerySchema = z.object({
  projectId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * GET /api/v1/boards
 *
 * Lists boards for the authenticated organization.
 * Optionally filtered by projectId. Pagination is cursor-based.
 */
export const GET = apiHandler(async (request, ctx) => {
  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const input = listQuerySchema.parse(rawParams);

  const where = {
    organizationId: ctx.organizationId,
    ...(input.projectId ? { projectId: input.projectId } : {}),
  };

  const [boards, total] = await Promise.all([
    db.board.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    }),
    db.board.count({ where }),
  ]);

  const nextCursor =
    boards.length > 0 ? boards[boards.length - 1]?.id ?? null : null;

  return res.success(
    boards,
    { total, nextCursor, requestId: ctx.requestId },
    ctx.rateLimit,
  );
});

/**
 * POST /api/v1/boards
 *
 * Creates a new board for the authenticated organization.
 * Requires at minimum: projectId and name.
 */
export const POST = apiHandler(async (request, ctx) => {
  const body = await request.json();
  const input = createBoardInput.parse(body);

  const board = await boardService.createBoard(db, ctx.organizationId, input);

  return res.created(board, ctx.rateLimit);
});
