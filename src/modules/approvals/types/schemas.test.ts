import { describe, expect, it } from "vitest";
import {
  requestApprovalInput,
  decideApprovalInput,
  listApprovalsInput,
  listPendingApprovalsInput,
} from "./schemas";

describe("requestApprovalInput", () => {
  it("accepts valid input", () => {
    const result = requestApprovalInput.safeParse({
      issueId: "issue-1",
      approverId: "user-2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing issueId", () => {
    const result = requestApprovalInput.safeParse({ approverId: "user-2" });
    expect(result.success).toBe(false);
  });

  it("accepts optional expiresAt", () => {
    const result = requestApprovalInput.safeParse({
      issueId: "issue-1",
      approverId: "user-2",
      expiresAt: "2026-03-01",
    });
    expect(result.success).toBe(true);
  });
});

describe("decideApprovalInput", () => {
  it("accepts approved decision", () => {
    const result = decideApprovalInput.safeParse({
      id: "approval-1",
      decision: "approved",
    });
    expect(result.success).toBe(true);
  });

  it("accepts rejected with comment", () => {
    const result = decideApprovalInput.safeParse({
      id: "approval-1",
      decision: "rejected",
      comment: "Needs more info",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid decision", () => {
    const result = decideApprovalInput.safeParse({
      id: "approval-1",
      decision: "maybe",
    });
    expect(result.success).toBe(false);
  });
});

describe("listApprovalsInput", () => {
  it("accepts valid input", () => {
    const result = listApprovalsInput.safeParse({ issueId: "issue-1" });
    expect(result.success).toBe(true);
  });
});

describe("listPendingApprovalsInput", () => {
  it("defaults limit to 50", () => {
    const result = listPendingApprovalsInput.parse({});
    expect(result.limit).toBe(50);
  });
});
