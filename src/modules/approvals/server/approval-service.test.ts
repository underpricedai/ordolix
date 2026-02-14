import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  requestApproval,
  getApprovals,
  decide,
  getPendingApprovals,
} from "./approval-service";
import {
  NotFoundError,
  PermissionError,
  ValidationError,
} from "@/server/lib/errors";

function createMockDb() {
  return {
    issue: { findFirst: vi.fn() },
    approval: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";
const USER_ID = "user-1";

const mockApproval = {
  id: "appr-1",
  organizationId: ORG_ID,
  issueId: "issue-1",
  approverId: USER_ID,
  status: "pending",
  decision: null,
  comment: null,
  decidedAt: null,
  approver: { id: USER_ID, name: "Test User", email: "test@test.com" },
};

// ── requestApproval ──────────────────────────────────────────────────────────

describe("requestApproval", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.issue.findFirst.mockResolvedValue({ id: "issue-1" });
    db.approval.create.mockResolvedValue(mockApproval);
  });

  it("creates an approval request", async () => {
    const result = await requestApproval(db, ORG_ID, {
      issueId: "issue-1",
      approverId: USER_ID,
    });

    expect(result.id).toBe("appr-1");
    expect(db.approval.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        issueId: "issue-1",
        approverId: USER_ID,
      }),
      include: expect.any(Object),
    });
  });

  it("throws NotFoundError if issue not found", async () => {
    db.issue.findFirst.mockResolvedValue(null);

    await expect(
      requestApproval(db, ORG_ID, { issueId: "nope", approverId: USER_ID }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── getApprovals ─────────────────────────────────────────────────────────────

describe("getApprovals", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.approval.findMany.mockResolvedValue([mockApproval]);
  });

  it("returns approvals for an issue", async () => {
    const result = await getApprovals(db, ORG_ID, "issue-1");

    expect(result).toHaveLength(1);
    expect(db.approval.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG_ID, issueId: "issue-1" },
      }),
    );
  });
});

// ── decide ───────────────────────────────────────────────────────────────────

describe("decide", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.approval.findFirst.mockResolvedValue(mockApproval);
    db.approval.update.mockResolvedValue({
      ...mockApproval,
      status: "approved",
      decision: "approved",
    });
  });

  it("approves an approval", async () => {
    const result = await decide(db, ORG_ID, USER_ID, "appr-1", "approved");

    expect(result.status).toBe("approved");
    expect(db.approval.update).toHaveBeenCalledWith({
      where: { id: "appr-1" },
      data: expect.objectContaining({
        status: "approved",
        decision: "approved",
        decidedAt: expect.any(Date),
      }),
      include: expect.any(Object),
    });
  });

  it("rejects an approval with comment", async () => {
    db.approval.update.mockResolvedValue({
      ...mockApproval,
      status: "rejected",
      decision: "rejected",
      comment: "Needs more info",
    });

    const result = await decide(
      db,
      ORG_ID,
      USER_ID,
      "appr-1",
      "rejected",
      "Needs more info",
    );

    expect(result.decision).toBe("rejected");
    expect(db.approval.update).toHaveBeenCalledWith({
      where: { id: "appr-1" },
      data: expect.objectContaining({ comment: "Needs more info" }),
      include: expect.any(Object),
    });
  });

  it("throws NotFoundError if approval not found", async () => {
    db.approval.findFirst.mockResolvedValue(null);

    await expect(
      decide(db, ORG_ID, USER_ID, "nope", "approved"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws PermissionError if user is not the approver", async () => {
    await expect(
      decide(db, ORG_ID, "other-user", "appr-1", "approved"),
    ).rejects.toThrow(PermissionError);
  });

  it("throws ValidationError if already decided", async () => {
    db.approval.findFirst.mockResolvedValue({
      ...mockApproval,
      status: "approved",
    });

    await expect(
      decide(db, ORG_ID, USER_ID, "appr-1", "rejected"),
    ).rejects.toThrow(ValidationError);
  });
});

// ── getPendingApprovals ──────────────────────────────────────────────────────

describe("getPendingApprovals", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.approval.findMany.mockResolvedValue([mockApproval]);
  });

  it("returns pending approvals for user", async () => {
    const result = await getPendingApprovals(db, ORG_ID, USER_ID, {
      limit: 50,
    });

    expect(result).toHaveLength(1);
    expect(db.approval.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: ORG_ID,
          approverId: USER_ID,
          status: "pending",
        },
      }),
    );
  });

  it("respects limit parameter", async () => {
    await getPendingApprovals(db, ORG_ID, USER_ID, { limit: 10 });

    expect(db.approval.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });
});
