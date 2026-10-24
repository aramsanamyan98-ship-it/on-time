import { describe, expect, it } from "vitest";
import {
  canMarkOutcome,
  initialCalendarRange,
  parseCalendarRange,
  visibleTimeRange,
  workingBusinessHours,
  type CalendarAppointment,
  type CalendarWorkingHour,
} from "@/lib/dashboard/calendar";

const TZ = "Asia/Yerevan"; // UTC+4, no DST

const hours: CalendarWorkingHour[] = [
  { dayOfWeek: 1, startTime: "10:00", endTime: "18:00", isDayOff: false },
  { dayOfWeek: 2, startTime: "09:30", endTime: "19:30", isDayOff: false },
  { dayOfWeek: 0, startTime: null, endTime: null, isDayOff: true },
];

function appt(startAt: string, endAt: string): CalendarAppointment {
  return { id: "a", startAt, endAt, status: "confirmed", guestName: "x", guestPhone: "1", guestNotes: null, serviceName: "s" };
}

describe("visibleTimeRange", () => {
  it("defaults to 08:00-22:00 with no working hours", () => {
    expect(visibleTimeRange([], [], TZ)).toEqual({ min: "08:00:00", max: "22:00:00" });
  });

  it("uses earliest start / latest end padded by an hour", () => {
    expect(visibleTimeRange(hours, [], TZ)).toEqual({ min: "08:00:00", max: "21:00:00" });
  });

  it("widens for a booking outside working hours (Yerevan local time)", () => {
    // 04:00Z = 08:00 local... use 03:00Z-04:30Z = 07:00-08:30 local
    const range = visibleTimeRange(hours, [appt("2026-10-26T03:00:00Z", "2026-10-26T04:30:00Z")], TZ);
    expect(range.min).toBe("07:00:00");
  });

  it("extends to midnight for a booking crossing local midnight", () => {
    const range = visibleTimeRange(hours, [appt("2026-10-26T19:30:00Z", "2026-10-26T20:30:00Z")], TZ);
    expect(range.max).toBe("24:00:00");
  });
});

describe("workingBusinessHours", () => {
  it("omits days off", () => {
    expect(workingBusinessHours(hours)).toEqual([
      { daysOfWeek: [1], startTime: "10:00", endTime: "18:00" },
      { daysOfWeek: [2], startTime: "09:30", endTime: "19:30" },
    ]);
  });
});

describe("initialCalendarRange", () => {
  it("covers the Monday-start week plus a day either side, in the specialist's timezone", () => {
    // Wed 2026-10-28 12:00Z -> Monday is 2026-10-26.
    const { from, to } = initialCalendarRange(new Date("2026-10-28T12:00:00Z"), TZ);
    expect(from.toISOString()).toBe("2026-10-24T20:00:00.000Z"); // Sun 25th 00:00 local
    expect(to.toISOString()).toBe("2026-11-02T20:00:00.000Z"); // Tue Nov 3rd 00:00 local
  });

  it("treats Sunday as the end of the week", () => {
    const { from } = initialCalendarRange(new Date("2026-11-01T12:00:00Z"), TZ);
    expect(from.toISOString()).toBe("2026-10-24T20:00:00.000Z");
  });
});

describe("parseCalendarRange", () => {
  it("accepts a normal range", () => {
    expect(parseCalendarRange("2026-10-26T00:00:00Z", "2026-11-02T00:00:00Z")).not.toBeNull();
  });
  it("rejects garbage, inverted and oversized ranges", () => {
    expect(parseCalendarRange("nope", "2026-11-02T00:00:00Z")).toBeNull();
    expect(parseCalendarRange("2026-11-02T00:00:00Z", "2026-10-26T00:00:00Z")).toBeNull();
    expect(parseCalendarRange("2026-01-01T00:00:00Z", "2026-12-31T00:00:00Z")).toBeNull();
  });
});

describe("canMarkOutcome", () => {
  const now = new Date("2026-10-26T12:00:00Z");
  it("allows ended confirmed/completed/no_show bookings", () => {
    for (const s of ["confirmed", "completed", "no_show"] as const) {
      expect(canMarkOutcome(s, "2026-10-26T11:00:00Z", now)).toBe(true);
    }
  });
  it("rejects bookings that haven't ended or were cancelled", () => {
    expect(canMarkOutcome("confirmed", "2026-10-26T13:00:00Z", now)).toBe(false);
    expect(canMarkOutcome("cancelled", "2026-10-26T11:00:00Z", now)).toBe(false);
  });
});
