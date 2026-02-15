/**
 * Zod schemas for the Search module.
 *
 * @description Defines input validation schemas for AQL search, quick search,
 * autocomplete suggestions, and saved filter CRUD operations.
 *
 * @module search-schemas
 */

import { z } from "zod";

/**
 * Input schema for the main AQL / text search endpoint.
 *
 * @description Accepts an AQL query string (or plain text). The service will
 * attempt to parse it as AQL first and fall back to ILIKE text search on
 * summary + description when parsing fails.
 */
export const searchInput = z.object({
  query: z.string().min(1, "Search query is required"),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export type SearchInput = z.infer<typeof searchInput>;

/**
 * Input schema for saving a new filter.
 */
export const savedFilterInput = z.object({
  name: z.string().min(1, "Filter name is required").max(255),
  query: z.string().min(1, "Filter query is required"),
  isShared: z.boolean().default(false),
});

export type SavedFilterInput = z.infer<typeof savedFilterInput>;

/**
 * Input schema for updating an existing saved filter.
 */
export const updateSavedFilterInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  query: z.string().min(1).optional(),
  isShared: z.boolean().optional(),
});

export type UpdateSavedFilterInput = z.infer<typeof updateSavedFilterInput>;

/**
 * Input schema for listing saved filters.
 */
export const listSavedFiltersInput = z.object({
  includeShared: z.boolean().default(false),
});

export type ListSavedFiltersInput = z.infer<typeof listSavedFiltersInput>;

/**
 * Input schema for quick search (command palette, header omnibar).
 */
export const quickSearchInput = z.object({
  term: z.string().min(1, "Search term is required"),
  limit: z.number().int().min(1).max(50).default(10),
});

export type QuickSearchInput = z.infer<typeof quickSearchInput>;

/**
 * Input schema for autocomplete suggestions in the AQL editor.
 */
export const searchSuggestInput = z.object({
  partial: z.string().min(1, "Partial text is required"),
  field: z.enum(["status", "assignee", "priority", "project"]).optional(),
});

export type SearchSuggestInput = z.infer<typeof searchSuggestInput>;
