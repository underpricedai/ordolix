/**
 * Tests for chart utility functions.
 * @module shared/components/charts/chart-utils-test
 */
import { describe, expect, it } from "vitest";
import { getChartColor, formatNumber, formatPercent, formatDuration, CHART_COLORS } from "./chart-utils";

describe("chart-utils", () => {
  describe("getChartColor", () => {
    it("returns colors from palette", () => {
      expect(getChartColor(0)).toBe(CHART_COLORS[0]);
      expect(getChartColor(1)).toBe(CHART_COLORS[1]);
    });

    it("wraps around when index exceeds palette size", () => {
      expect(getChartColor(CHART_COLORS.length)).toBe(CHART_COLORS[0]);
      expect(getChartColor(CHART_COLORS.length + 1)).toBe(CHART_COLORS[1]);
    });
  });

  describe("formatNumber", () => {
    it("formats small numbers as-is", () => {
      expect(formatNumber(42)).toBe("42");
      expect(formatNumber(999)).toBe("999");
    });

    it("formats thousands with K suffix", () => {
      expect(formatNumber(1000)).toBe("1.0K");
      expect(formatNumber(5500)).toBe("5.5K");
    });

    it("formats millions with M suffix", () => {
      expect(formatNumber(1000000)).toBe("1.0M");
      expect(formatNumber(2500000)).toBe("2.5M");
    });
  });

  describe("formatPercent", () => {
    it("rounds to nearest integer", () => {
      expect(formatPercent(75.4)).toBe("75%");
      expect(formatPercent(75.5)).toBe("76%");
      expect(formatPercent(100)).toBe("100%");
    });
  });

  describe("formatDuration", () => {
    it("formats minutes for sub-hour values", () => {
      expect(formatDuration(0.5)).toBe("30m");
    });

    it("formats hours for sub-day values", () => {
      expect(formatDuration(2.5)).toBe("2.5h");
    });

    it("formats days for large values", () => {
      expect(formatDuration(48)).toBe("2.0d");
    });
  });
});
