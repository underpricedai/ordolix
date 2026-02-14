import { describe, expect, it } from "vitest";
import {
  severityEnum,
  timelineEntrySchema,
  communicationEntrySchema,
  createIncidentInput,
  updateIncidentInput,
  addTimelineEntryInput,
  addCommunicationInput,
  resolveIncidentInput,
  listIncidentsInput,
} from "./schemas";

describe("severityEnum", () => {
  it("accepts valid severity levels", () => {
    expect(severityEnum.parse("P1")).toBe("P1");
    expect(severityEnum.parse("P2")).toBe("P2");
    expect(severityEnum.parse("P3")).toBe("P3");
    expect(severityEnum.parse("P4")).toBe("P4");
  });

  it("rejects invalid severity", () => {
    expect(() => severityEnum.parse("P5")).toThrow();
    expect(() => severityEnum.parse("")).toThrow();
  });
});

describe("timelineEntrySchema", () => {
  it("accepts valid timeline entry", () => {
    const result = timelineEntrySchema.parse({ event: "Incident started" });
    expect(result.event).toBe("Incident started");
    expect(result.author).toBeUndefined();
  });

  it("accepts entry with author", () => {
    const result = timelineEntrySchema.parse({
      event: "Escalated",
      author: "user-1",
    });
    expect(result.author).toBe("user-1");
  });

  it("rejects empty event string", () => {
    expect(() => timelineEntrySchema.parse({ event: "" })).toThrow();
  });
});

describe("communicationEntrySchema", () => {
  it("accepts valid communication entry", () => {
    const result = communicationEntrySchema.parse({
      channel: "slack",
      message: "Investigating the issue",
    });
    expect(result.channel).toBe("slack");
    expect(result.message).toBe("Investigating the issue");
  });

  it("rejects empty channel", () => {
    expect(() =>
      communicationEntrySchema.parse({ channel: "", message: "hi" }),
    ).toThrow();
  });

  it("rejects empty message", () => {
    expect(() =>
      communicationEntrySchema.parse({ channel: "slack", message: "" }),
    ).toThrow();
  });
});

describe("createIncidentInput", () => {
  it("accepts valid input", () => {
    const result = createIncidentInput.parse({
      issueId: "issue-1",
      severity: "P1",
    });
    expect(result.issueId).toBe("issue-1");
    expect(result.severity).toBe("P1");
  });

  it("rejects missing issueId", () => {
    expect(() => createIncidentInput.parse({ severity: "P1" })).toThrow();
  });
});

describe("updateIncidentInput", () => {
  it("accepts partial update with severity only", () => {
    const result = updateIncidentInput.parse({ id: "inc-1", severity: "P2" });
    expect(result.severity).toBe("P2");
    expect(result.statusPageUpdate).toBeUndefined();
  });

  it("accepts partial update with statusPageUpdate only", () => {
    const result = updateIncidentInput.parse({
      id: "inc-1",
      statusPageUpdate: "We are investigating",
    });
    expect(result.statusPageUpdate).toBe("We are investigating");
  });
});

describe("addTimelineEntryInput", () => {
  it("accepts valid input", () => {
    const result = addTimelineEntryInput.parse({
      id: "inc-1",
      entry: { event: "Root cause identified" },
    });
    expect(result.id).toBe("inc-1");
    expect(result.entry.event).toBe("Root cause identified");
  });
});

describe("addCommunicationInput", () => {
  it("accepts valid input", () => {
    const result = addCommunicationInput.parse({
      id: "inc-1",
      entry: { channel: "email", message: "Update sent to stakeholders" },
    });
    expect(result.entry.channel).toBe("email");
  });
});

describe("resolveIncidentInput", () => {
  it("accepts valid id", () => {
    const result = resolveIncidentInput.parse({ id: "inc-1" });
    expect(result.id).toBe("inc-1");
  });

  it("rejects empty id", () => {
    expect(() => resolveIncidentInput.parse({ id: "" })).toThrow();
  });
});

describe("listIncidentsInput", () => {
  it("applies defaults", () => {
    const result = listIncidentsInput.parse({});
    expect(result.limit).toBe(50);
    expect(result.severity).toBeUndefined();
    expect(result.resolved).toBeUndefined();
    expect(result.cursor).toBeUndefined();
  });

  it("accepts all optional filters", () => {
    const result = listIncidentsInput.parse({
      severity: "P1",
      resolved: false,
      limit: 10,
      cursor: "inc-5",
    });
    expect(result.severity).toBe("P1");
    expect(result.resolved).toBe(false);
    expect(result.limit).toBe(10);
    expect(result.cursor).toBe("inc-5");
  });
});
