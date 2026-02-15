import { describe, expect, it, vi } from "vitest";
import { processEscalations } from "./escalation-processor";

function createMockDb() {
  return {
    sLAInstance: {
      findMany: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";

describe("processEscalations", () => {
  it("returns triggered escalations when threshold exceeded", async () => {
    const db = createMockDb();
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 1 * 60 * 60 * 1000);

    db.sLAInstance.findMany.mockResolvedValue([
      {
        id: "inst-1",
        startedAt: twoHoursAgo,
        breachTime: oneHourFromNow,
        slaConfig: {
          escalationRules: [
            { thresholdPercent: 50, action: "notify", target: "manager-1" },
          ],
        },
        issue: { id: "issue-1", key: "TEST-1", summary: "Test", assigneeId: "user-1" },
      },
    ]);

    const result = await processEscalations(db, ORG_ID);
    // ~67% elapsed (2h of 3h total), threshold is 50%, should trigger
    expect(result).toHaveLength(1);
    expect(result[0]!.rule.action).toBe("notify");
  });

  it("returns empty array when no instances approaching breach", async () => {
    const db = createMockDb();
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    db.sLAInstance.findMany.mockResolvedValue([
      {
        id: "inst-1",
        startedAt: fiveMinAgo,
        breachTime: fourHoursFromNow,
        slaConfig: {
          escalationRules: [
            { thresholdPercent: 80, action: "notify", target: "manager-1" },
          ],
        },
        issue: { id: "issue-1", key: "TEST-1", summary: "Test", assigneeId: "user-1" },
      },
    ]);

    const result = await processEscalations(db, ORG_ID);
    expect(result).toHaveLength(0);
  });

  it("handles instances with no escalation rules", async () => {
    const db = createMockDb();
    db.sLAInstance.findMany.mockResolvedValue([
      {
        id: "inst-1",
        startedAt: new Date(),
        breachTime: new Date(Date.now() + 60000),
        slaConfig: { escalationRules: [] },
        issue: { id: "issue-1", key: "TEST-1", summary: "Test", assigneeId: null },
      },
    ]);

    const result = await processEscalations(db, ORG_ID);
    expect(result).toHaveLength(0);
  });

  it("returns empty array when no active instances", async () => {
    const db = createMockDb();
    db.sLAInstance.findMany.mockResolvedValue([]);

    const result = await processEscalations(db, ORG_ID);
    expect(result).toHaveLength(0);
  });
});
