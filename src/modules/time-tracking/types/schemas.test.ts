import { describe, expect, it } from "vitest";
import {
  logTimeInput,
  updateTimeLogInput,
  listTimeLogsInput,
  deleteTimeLogInput,
} from "./schemas";

describe("logTimeInput", () => {
  it("accepts valid input", () => {
    const result = logTimeInput.safeParse({
      issueId: "issue-1",
      date: "2026-02-14",
      duration: 3600,
    });
    expect(result.success).toBe(true);
    expect(result.data?.billable).toBe(true);
  });

  it("rejects non-positive duration", () => {
    const result = logTimeInput.safeParse({
      issueId: "issue-1",
      date: "2026-02-14",
      duration: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing issueId", () => {
    const result = logTimeInput.safeParse({
      date: "2026-02-14",
      duration: 3600,
    });
    expect(result.success).toBe(false);
  });

  it("coerces date string to Date", () => {
    const result = logTimeInput.safeParse({
      issueId: "issue-1",
      date: "2026-02-14",
      duration: 1800,
    });
    expect(result.success).toBe(true);
    expect(result.data?.date).toBeInstanceOf(Date);
  });
});

describe("updateTimeLogInput", () => {
  it("accepts valid partial update", () => {
    const result = updateTimeLogInput.safeParse({
      id: "tl-1",
      duration: 7200,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = updateTimeLogInput.safeParse({ duration: 7200 });
    expect(result.success).toBe(false);
  });
});

describe("listTimeLogsInput", () => {
  it("applies default limit of 50", () => {
    const result = listTimeLogsInput.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.limit).toBe(50);
  });

  it("rejects limit over 100", () => {
    const result = listTimeLogsInput.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });
});

describe("deleteTimeLogInput", () => {
  it("accepts valid id", () => {
    const result = deleteTimeLogInput.safeParse({ id: "tl-1" });
    expect(result.success).toBe(true);
  });

  it("rejects empty id", () => {
    const result = deleteTimeLogInput.safeParse({ id: "" });
    expect(result.success).toBe(false);
  });
});
