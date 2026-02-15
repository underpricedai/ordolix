/**
 * tRPC router for the Search module.
 *
 * @description Exposes search, quick search, autocomplete suggestions,
 * and saved filter CRUD as type-safe tRPC procedures.
 *
 * @module search-router
 */

import { z } from "zod";
import { createRouter, protectedProcedure } from "@/server/trpc/init";
import {
  searchInput,
  quickSearchInput,
  searchSuggestInput,
  savedFilterInput,
  updateSavedFilterInput,
  listSavedFiltersInput,
} from "../types/schemas";
import * as searchService from "./search-service";

export const searchRouter = createRouter({
  /**
   * Execute an AQL or plain-text search.
   */
  search: protectedProcedure
    .input(searchInput)
    .query(async ({ ctx, input }) => {
      return searchService.search(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  /**
   * Quick search for command palette / omnibar.
   */
  quickSearch: protectedProcedure
    .input(quickSearchInput)
    .query(async ({ ctx, input }) => {
      return searchService.quickSearch(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  /**
   * Autocomplete suggestions for AQL field values.
   */
  suggest: protectedProcedure
    .input(searchSuggestInput)
    .query(async ({ ctx, input }) => {
      return searchService.suggest(
        ctx.db,
        ctx.organizationId,
        input,
      );
    }),

  /**
   * Save a new filter.
   */
  saveFilter: protectedProcedure
    .input(savedFilterInput)
    .mutation(async ({ ctx, input }) => {
      return searchService.saveFilter(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  /**
   * Update an existing saved filter.
   */
  updateFilter: protectedProcedure
    .input(updateSavedFilterInput)
    .mutation(async ({ ctx, input }) => {
      return searchService.updateFilter(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  /**
   * List saved filters (user's own + optionally shared).
   */
  listFilters: protectedProcedure
    .input(listSavedFiltersInput)
    .query(async ({ ctx, input }) => {
      return searchService.listFilters(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input,
      );
    }),

  /**
   * Delete a saved filter.
   */
  deleteFilter: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return searchService.deleteFilter(
        ctx.db,
        ctx.organizationId,
        ctx.session.user!.id!,
        input.id,
      );
    }),
});
