import { describe, expect, it } from "vitest";
import {
  calculateBusinessMs,
  addBusinessMs,
  type BusinessCalendar,
} from "./business-hours";

const calendar: BusinessCalendar = {
  timezone: "UTC",
  workingHours: { start: 9, end: 17 },
  holidays: ["2026-12-25"],
};

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 8 * MS_PER_HOUR; // 8 working hours

describe("calculateBusinessMs", () => {
  it("calculates full working day correctly", () => {
    const start = new Date("2026-02-16T09:00:00Z"); // Monday
    const end = new Date("2026-02-16T17:00:00Z");

    expect(calculateBusinessMs(start, end, calendar)).toBe(MS_PER_DAY);
  });

  it("calculates partial day correctly", () => {
    const start = new Date("2026-02-16T10:00:00Z"); // Monday 10am
    const end = new Date("2026-02-16T14:00:00Z"); // Monday 2pm

    expect(calculateBusinessMs(start, end, calendar)).toBe(4 * MS_PER_HOUR);
  });

  it("skips weekends", () => {
    const start = new Date("2026-02-20T09:00:00Z"); // Friday 9am
    const end = new Date("2026-02-23T17:00:00Z"); // Monday 5pm

    // Friday full day + Monday full day = 2 working days
    expect(calculateBusinessMs(start, end, calendar)).toBe(2 * MS_PER_DAY);
  });

  it("skips holidays", () => {
    const start = new Date("2026-12-24T09:00:00Z"); // Thursday
    const end = new Date("2026-12-26T17:00:00Z"); // Saturday

    // Thursday = 1 working day, Friday Dec 25 = holiday, Saturday = weekend
    expect(calculateBusinessMs(start, end, calendar)).toBe(MS_PER_DAY);
  });

  it("returns 0 for zero duration", () => {
    const date = new Date("2026-02-16T12:00:00Z");
    expect(calculateBusinessMs(date, date, calendar)).toBe(0);
  });

  it("returns 0 when end is before start", () => {
    const start = new Date("2026-02-16T14:00:00Z");
    const end = new Date("2026-02-16T10:00:00Z");
    expect(calculateBusinessMs(start, end, calendar)).toBe(0);
  });
});

describe("addBusinessMs", () => {
  it("adds hours within same day", () => {
    const start = new Date("2026-02-16T09:00:00Z"); // Monday 9am
    const result = addBusinessMs(start, 4 * MS_PER_HOUR, calendar);

    expect(result.getUTCHours()).toBe(13); // 1pm
    expect(result.getUTCDate()).toBe(16);
  });

  it("rolls over to next working day", () => {
    const start = new Date("2026-02-16T15:00:00Z"); // Monday 3pm
    const result = addBusinessMs(start, 4 * MS_PER_HOUR, calendar);

    // 2 hours left Monday + 2 hours Tuesday = done at Tuesday 11am
    expect(result.getUTCDate()).toBe(17);
    expect(result.getUTCHours()).toBe(11);
  });

  it("skips weekends", () => {
    const start = new Date("2026-02-20T15:00:00Z"); // Friday 3pm
    const result = addBusinessMs(start, 4 * MS_PER_HOUR, calendar);

    // 2 hours left Friday + skip Sat/Sun + 2 hours Monday = Monday 11am
    expect(result.getUTCDate()).toBe(23); // Monday
    expect(result.getUTCHours()).toBe(11);
  });

  it("returns same date for 0 ms", () => {
    const start = new Date("2026-02-16T10:00:00Z");
    const result = addBusinessMs(start, 0, calendar);
    expect(result.getTime()).toBe(start.getTime());
  });

  it("handles partial day start", () => {
    const start = new Date("2026-02-16T16:30:00Z"); // Monday 4:30pm
    const result = addBusinessMs(start, MS_PER_HOUR, calendar); // Add 1 hour

    // 30 min left Monday + 30 min Tuesday = Tuesday 9:30am
    expect(result.getUTCDate()).toBe(17);
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(30);
  });
});
