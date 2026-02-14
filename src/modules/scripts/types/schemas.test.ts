import { describe, expect, it } from "vitest";
import {
  createScriptInput,
  updateScriptInput,
  listScriptsInput,
  executeScriptInput,
  listExecutionsInput,
} from "./schemas";

describe("createScriptInput", () => {
  it("accepts valid input", () => {
    const result = createScriptInput.safeParse({
      name: "My Script",
      triggerType: "manual",
      code: "console.log('hello')",
    });
    expect(result.success).toBe(true);
  });

  it("defaults isEnabled to true", () => {
    const result = createScriptInput.parse({
      name: "Script",
      triggerType: "scheduled",
      code: "return 1",
    });
    expect(result.isEnabled).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createScriptInput.safeParse({
      name: "",
      triggerType: "manual",
      code: "code",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty code", () => {
    const result = createScriptInput.safeParse({
      name: "Script",
      triggerType: "manual",
      code: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid trigger type", () => {
    const result = createScriptInput.safeParse({
      name: "Script",
      triggerType: "invalid",
      code: "code",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid trigger types", () => {
    for (const t of ["manual", "scheduled", "issue_created", "issue_updated", "transition", "post_function"]) {
      const result = createScriptInput.safeParse({
        name: "Script",
        triggerType: t,
        code: "code",
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("updateScriptInput", () => {
  it("accepts partial update", () => {
    const result = updateScriptInput.safeParse({
      id: "script-1",
      name: "New Name",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = updateScriptInput.safeParse({ name: "New Name" });
    expect(result.success).toBe(false);
  });
});

describe("listScriptsInput", () => {
  it("accepts empty object", () => {
    const result = listScriptsInput.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts triggerType filter", () => {
    const result = listScriptsInput.safeParse({ triggerType: "manual" });
    expect(result.success).toBe(true);
  });
});

describe("executeScriptInput", () => {
  it("accepts valid input", () => {
    const result = executeScriptInput.safeParse({ scriptId: "script-1" });
    expect(result.success).toBe(true);
  });

  it("defaults context to empty object", () => {
    const result = executeScriptInput.parse({ scriptId: "script-1" });
    expect(result.context).toEqual({});
  });
});

describe("listExecutionsInput", () => {
  it("defaults limit to 50", () => {
    const result = listExecutionsInput.parse({ scriptId: "script-1" });
    expect(result.limit).toBe(50);
  });

  it("accepts status filter", () => {
    const result = listExecutionsInput.safeParse({
      scriptId: "script-1",
      status: "success",
    });
    expect(result.success).toBe(true);
  });
});
