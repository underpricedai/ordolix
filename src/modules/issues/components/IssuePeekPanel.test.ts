/**
 * Tests for IssuePeekPanel component and PeekProvider.
 * @module issues/components/IssuePeekPanel-test
 */
import { describe, expect, it } from "vitest";
import { IssuePeekPanel } from "./IssuePeekPanel";
import { PeekProvider, usePeek } from "@/shared/providers/peek-provider";

describe("IssuePeekPanel", () => {
  it("exports IssuePeekPanel component", () => {
    expect(IssuePeekPanel).toBeDefined();
    expect(typeof IssuePeekPanel).toBe("function");
  });
});

describe("PeekProvider", () => {
  it("exports PeekProvider component", () => {
    expect(PeekProvider).toBeDefined();
    expect(typeof PeekProvider).toBe("function");
  });

  it("exports usePeek hook", () => {
    expect(usePeek).toBeDefined();
    expect(typeof usePeek).toBe("function");
  });

  it("usePeek throws when used outside React render context", () => {
    // usePeek calls useContext which requires a React render context.
    // Calling it outside React throws because hooks cannot run outside components.
    expect(() => usePeek()).toThrow();
  });
});
