/**
 * Tests for dashboard chart widget components.
 * @module dashboards/components/dashboard-widgets-test
 */
import { describe, expect, it } from "vitest";
import { BurndownWidget } from "./BurndownWidget";
import { VelocityTrendWidget } from "./VelocityTrendWidget";
import { CumulativeFlowWidget } from "./CumulativeFlowWidget";

describe("Dashboard Chart Widgets", () => {
  it("BurndownWidget is a function component", () => {
    expect(typeof BurndownWidget).toBe("function");
  });

  it("VelocityTrendWidget is a function component", () => {
    expect(typeof VelocityTrendWidget).toBe("function");
  });

  it("CumulativeFlowWidget is a function component", () => {
    expect(typeof CumulativeFlowWidget).toBe("function");
  });
});
