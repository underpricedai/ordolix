/**
 * Tests for Search module Zod schemas.
 *
 * @module search-schemas-test
 */

import { describe, expect, it } from "vitest";
import {
  searchInput,
  savedFilterInput,
  updateSavedFilterInput,
  listSavedFiltersInput,
  quickSearchInput,
  searchSuggestInput,
} from "./schemas";

describe("searchInput", () => {
  it("accepts a valid query with defaults", () => {
    const result = searchInput.parse({ query: "status = \"Open\"" });
    expect(result.query).toBe("status = \"Open\"");
    expect(result.limit).toBe(50);
    expect(result.cursor).toBeUndefined();
  });

  it("rejects an empty query string", () => {
    expect(() => searchInput.parse({ query: "" })).toThrow();
  });

  it("clamps limit to 200 maximum", () => {
    expect(() => searchInput.parse({ query: "test", limit: 201 })).toThrow();
  });

  it("accepts cursor and custom limit", () => {
    const result = searchInput.parse({
      query: "test",
      cursor: "abc123",
      limit: 100,
    });
    expect(result.cursor).toBe("abc123");
    expect(result.limit).toBe(100);
  });
});

describe("savedFilterInput", () => {
  it("accepts a valid filter with defaults", () => {
    const result = savedFilterInput.parse({
      name: "My Filter",
      query: "status = \"Open\"",
    });
    expect(result.name).toBe("My Filter");
    expect(result.isShared).toBe(false);
  });

  it("rejects a missing name", () => {
    expect(() =>
      savedFilterInput.parse({ name: "", query: "test" }),
    ).toThrow();
  });

  it("accepts isShared = true", () => {
    const result = savedFilterInput.parse({
      name: "Shared",
      query: "test",
      isShared: true,
    });
    expect(result.isShared).toBe(true);
  });
});

describe("updateSavedFilterInput", () => {
  it("requires id, allows partial updates", () => {
    const result = updateSavedFilterInput.parse({
      id: "filter-1",
      name: "Updated Name",
    });
    expect(result.id).toBe("filter-1");
    expect(result.name).toBe("Updated Name");
    expect(result.query).toBeUndefined();
    expect(result.isShared).toBeUndefined();
  });

  it("rejects missing id", () => {
    expect(() =>
      updateSavedFilterInput.parse({ name: "No ID" }),
    ).toThrow();
  });
});

describe("listSavedFiltersInput", () => {
  it("defaults includeShared to false", () => {
    const result = listSavedFiltersInput.parse({});
    expect(result.includeShared).toBe(false);
  });

  it("accepts includeShared = true", () => {
    const result = listSavedFiltersInput.parse({ includeShared: true });
    expect(result.includeShared).toBe(true);
  });
});

describe("quickSearchInput", () => {
  it("accepts a valid term with default limit", () => {
    const result = quickSearchInput.parse({ term: "login" });
    expect(result.term).toBe("login");
    expect(result.limit).toBe(10);
  });

  it("rejects an empty term", () => {
    expect(() => quickSearchInput.parse({ term: "" })).toThrow();
  });
});

describe("searchSuggestInput", () => {
  it("accepts partial text without field", () => {
    const result = searchSuggestInput.parse({ partial: "open" });
    expect(result.partial).toBe("open");
    expect(result.field).toBeUndefined();
  });

  it("accepts partial text with field context", () => {
    const result = searchSuggestInput.parse({
      partial: "In",
      field: "status",
    });
    expect(result.field).toBe("status");
  });

  it("rejects an invalid field value", () => {
    expect(() =>
      searchSuggestInput.parse({ partial: "test", field: "invalid" }),
    ).toThrow();
  });
});
