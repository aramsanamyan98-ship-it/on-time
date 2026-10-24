import { describe, expect, it } from "vitest";
import { buildDayRange, clampWindowStart, classifyDay } from "@/lib/booking/day-availability";
import { utcToZonedDateStr } from "@/lib/booking/timezone";

const workday = { dayOfWeek: 1 as const, isDayOff: false, startTime: "10:00", endTime: "18:00" };

describe("classifyDay", () => {
  it("separates day off, fully booked and open", () => {
    expect(classifyDay({ ...workday, isDayOff: true }, 5)).toBe("dayOff");
    expect(classifyDay(undefined, 5)).toBe("dayOff");
    expect(classifyDay(workday, 0)).toBe("full");
    expect(classifyDay(workday, 3)).toBe("open");
  });
});

describe("buildDayRange", () => {
  it("lists 14 consecutive dates across a month boundary", () => {
    const days = buildDayRange("2026-10-25");
    expect(days).toHaveLength(14);
    expect(days[0]).toBe("2026-10-25");
    expect(days[7]).toBe("2026-11-01");
    expect(days[13]).toBe("2026-11-07");
  });
});

describe("clampWindowStart", () => {
  it("never starts before today and ignores junk", () => {
    expect(clampWindowStart("2026-10-01", "2026-10-28")).toBe("2026-10-28");
    expect(clampWindowStart("nope", "2026-10-28")).toBe("2026-10-28");
    expect(clampWindowStart(undefined, "2026-10-28")).toBe("2026-10-28");
    expect(clampWindowStart("2026-11-10", "2026-10-28")).toBe("2026-11-10");
    expect(clampWindowStart("2030-01-01", "2026-10-28")).toBe("2026-10-28");
  });
});

// Regression: SlotPicker used `new Date().toISOString().slice(0, 10)` (the UTC
// date) as "today". Yerevan is UTC+4, so from 00:00 to 04:00 local the UTC
// date is still yesterday, and "today" was offered as a past day.
describe("barber-timezone 'today' (Asia/Yerevan, UTC+4)", () => {
  const TZ = "Asia/Yerevan";
  const utcDate = (d: Date) => d.toISOString().slice(0, 10);

  it("is the next calendar day from 00:00 to 04:00 local, when UTC is still yesterday", () => {
    for (const iso of ["2026-10-27T20:00:00Z", "2026-10-27T22:30:00Z", "2026-10-27T23:59:00Z"]) {
      const now = new Date(iso);
      expect(utcDate(now)).toBe("2026-10-27"); // the old, buggy value
      expect(utcToZonedDateStr(now, TZ)).toBe("2026-10-28");
    }
  });

  it("matches the UTC date for the rest of the day", () => {
    expect(utcToZonedDateStr(new Date("2026-10-27T19:59:00Z"), TZ)).toBe("2026-10-27"); // 23:59 local
    expect(utcToZonedDateStr(new Date("2026-10-28T00:00:00Z"), TZ)).toBe("2026-10-28"); // 04:00 local
    expect(utcToZonedDateStr(new Date("2026-10-28T12:00:00Z"), TZ)).toBe("2026-10-28");
  });
});
