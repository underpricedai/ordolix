/**
 * Tests for procurement-approval-service.
 *
 * @description Verifies multi-stage approval decisions, rejection cascading,
 * and pending approval queries.
 *
 * @module procurement-approval-service-test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  decideProcurementApproval,
  getPendingApprovals,
} from "./procurement-approval-service";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

const orgId = "org-1";
const approverId = "user-approver";

function createMockDb() {
  return {
    procurementApproval: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    procurementRequest: {
      update: vi.fn(),
    },
  } as unknown as PrismaClient;
}

let mockDb: ReturnType<typeof createMockDb>;

beforeEach(() => {
  mockDb = createMockDb();
  vi.clearAllMocks();
});

// ── decideProcurementApproval ────────────────────────────────────────────────

describe("decideProcurementApproval", () => {
  const baseApproval = {
    id: "appr-1",
    procurementRequestId: "req-1",
    approverId,
    stage: 1,
    status: "pending",
    comment: null,
    decidedAt: null,
    procurementRequest: {
      id: "req-1",
      organizationId: orgId,
      status: "pending_approval",
    },
  };

  it("approves and checks remaining pending count", async () => {
    (mockDb.procurementApproval.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseApproval);
    (mockDb.procurementApproval.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseApproval,
      status: "approved",
      decidedAt: new Date(),
    });
    (mockDb.procurementApproval.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (mockDb.procurementRequest.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await decideProcurementApproval(
      mockDb,
      orgId,
      "appr-1",
      approverId,
      "approved",
      "Looks good",
    );

    expect(result.status).toBe("approved");
    expect(mockDb.procurementApproval.update).toHaveBeenCalledWith({
      where: { id: "appr-1" },
      data: expect.objectContaining({
        status: "approved",
        comment: "Looks good",
      }),
    });
    // All stages approved - request should be approved
    expect(mockDb.procurementRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { status: "approved" },
    });
  });

  it("does not update request status when other stages are still pending", async () => {
    (mockDb.procurementApproval.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseApproval);
    (mockDb.procurementApproval.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseApproval,
      status: "approved",
    });
    // 1 pending approval remaining
    (mockDb.procurementApproval.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    await decideProcurementApproval(mockDb, orgId, "appr-1", approverId, "approved");

    expect(mockDb.procurementRequest.update).not.toHaveBeenCalled();
  });

  it("rejects and cascades rejection to request", async () => {
    (mockDb.procurementApproval.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseApproval);
    (mockDb.procurementApproval.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseApproval,
      status: "rejected",
    });
    (mockDb.procurementRequest.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await decideProcurementApproval(
      mockDb,
      orgId,
      "appr-1",
      approverId,
      "rejected",
      "Over budget",
    );

    expect(result.status).toBe("rejected");
    expect(mockDb.procurementRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { status: "rejected" },
    });
  });

  it("throws NotFoundError when approval does not exist", async () => {
    (mockDb.procurementApproval.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      decideProcurementApproval(mockDb, orgId, "non-existent", approverId, "approved"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when approval belongs to different organization", async () => {
    (mockDb.procurementApproval.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseApproval,
      procurementRequest: {
        ...baseApproval.procurementRequest,
        organizationId: "other-org",
      },
    });

    await expect(
      decideProcurementApproval(mockDb, orgId, "appr-1", approverId, "approved"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError when approval is already decided", async () => {
    (mockDb.procurementApproval.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseApproval,
      status: "approved",
    });

    await expect(
      decideProcurementApproval(mockDb, orgId, "appr-1", approverId, "approved"),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError when approver does not match", async () => {
    (mockDb.procurementApproval.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseApproval);

    await expect(
      decideProcurementApproval(mockDb, orgId, "appr-1", "wrong-user", "approved"),
    ).rejects.toThrow(ValidationError);
  });

  it("handles null comment", async () => {
    (mockDb.procurementApproval.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseApproval);
    (mockDb.procurementApproval.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseApproval,
      status: "approved",
    });
    (mockDb.procurementApproval.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (mockDb.procurementRequest.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await decideProcurementApproval(mockDb, orgId, "appr-1", approverId, "approved");

    expect(mockDb.procurementApproval.update).toHaveBeenCalledWith({
      where: { id: "appr-1" },
      data: expect.objectContaining({
        comment: null,
      }),
    });
  });
});

// ── getPendingApprovals ──────────────────────────────────────────────────────

describe("getPendingApprovals", () => {
  it("returns pending approvals for the given approver", async () => {
    const approvals = [
      {
        id: "appr-1",
        approverId,
        status: "pending",
        procurementRequest: { id: "req-1", title: "Laptops" },
      },
    ];
    (mockDb.procurementApproval.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(approvals);

    const result = await getPendingApprovals(mockDb, orgId, approverId);
    expect(result).toEqual(approvals);
  });

  it("queries with correct filters", async () => {
    (mockDb.procurementApproval.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await getPendingApprovals(mockDb, orgId, approverId);

    expect(mockDb.procurementApproval.findMany).toHaveBeenCalledWith({
      where: {
        approverId,
        status: "pending",
        procurementRequest: {
          organizationId: orgId,
        },
      },
      include: {
        procurementRequest: {
          include: { vendor: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  });

  it("returns empty array when no pending approvals", async () => {
    (mockDb.procurementApproval.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getPendingApprovals(mockDb, orgId, approverId);
    expect(result).toEqual([]);
  });
});
