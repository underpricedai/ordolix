import { describe, expect, it, vi } from "vitest";
import { resolveAssignee, type AssignmentConfig } from "./auto-assignment";

function createMockDb() {
  return {
    issue: { count: vi.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ORG_ID = "org-1";

describe("resolveAssignee", () => {
  describe("manual strategy", () => {
    it("returns null for manual assignment", async () => {
      const db = createMockDb();
      const config: AssignmentConfig = { strategy: "manual", members: ["u1", "u2"] };

      const result = await resolveAssignee(db, ORG_ID, config);
      expect(result).toBeNull();
    });
  });

  describe("round_robin strategy", () => {
    it("assigns first member when no last assigned", async () => {
      const db = createMockDb();
      const config: AssignmentConfig = { strategy: "round_robin", members: ["u1", "u2", "u3"] };

      const result = await resolveAssignee(db, ORG_ID, config);
      expect(result).toBe("u1");
    });

    it("assigns next member after last assigned", async () => {
      const db = createMockDb();
      const config: AssignmentConfig = { strategy: "round_robin", members: ["u1", "u2", "u3"], lastAssigned: "u1" };

      const result = await resolveAssignee(db, ORG_ID, config);
      expect(result).toBe("u2");
    });

    it("wraps around to first member", async () => {
      const db = createMockDb();
      const config: AssignmentConfig = { strategy: "round_robin", members: ["u1", "u2", "u3"], lastAssigned: "u3" };

      const result = await resolveAssignee(db, ORG_ID, config);
      expect(result).toBe("u1");
    });
  });

  describe("least_busy strategy", () => {
    it("assigns to member with fewest open issues", async () => {
      const db = createMockDb();
      db.issue.count
        .mockResolvedValueOnce(5) // u1 has 5 issues
        .mockResolvedValueOnce(2) // u2 has 2 issues
        .mockResolvedValueOnce(8); // u3 has 8 issues

      const config: AssignmentConfig = { strategy: "least_busy", members: ["u1", "u2", "u3"] };

      const result = await resolveAssignee(db, ORG_ID, config);
      expect(result).toBe("u2");
    });

    it("assigns first member when all have same count", async () => {
      const db = createMockDb();
      db.issue.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(3);

      const config: AssignmentConfig = { strategy: "least_busy", members: ["u1", "u2"] };

      const result = await resolveAssignee(db, ORG_ID, config);
      expect(result).toBe("u1");
    });
  });

  describe("empty members", () => {
    it("returns null when no members available", async () => {
      const db = createMockDb();
      const config: AssignmentConfig = { strategy: "round_robin", members: [] };

      const result = await resolveAssignee(db, ORG_ID, config);
      expect(result).toBeNull();
    });
  });
});
