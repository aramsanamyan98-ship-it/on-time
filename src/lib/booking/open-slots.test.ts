import { describe, expect, it } from "vitest";
import { computeOpenSlots, pickSuggestion } from "@/lib/booking/open-slots";
import { DAYS_OF_WEEK, type DaySchedule } from "@/lib/working-hours/defaults";

const TZ = "Asia/Yerevan"; // UTC+4 year-round, no DST

function week(overrides: Partial<Record<number, Partial<DaySchedule>>> = {}): DaySchedule[] {
  return DAYS_OF_WEEK.map((dayOfWeek) => ({
    dayOfWeek,
    isDayOff: false,
    startTime: "10:00",
    endTime: "19:00",
    ...overrides[dayOfWeek],
  }));
}

// Yerevan wall-clock -> UTC instant
const yvn = (iso: string) => new Date(`${iso}+04:00`);
const hhmm = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);

// 2026-10-12 is a Monday.
const MON_9AM = yvn("2026-10-12T09:00:00");

function open(params: {
  schedule?: DaySchedule[];
  busy?: { start: Date; end: Date }[];
  duration?: number;
  now?: Date;
  horizonHours?: number;
}) {
  return computeOpenSlots({
    schedule: params.schedule ?? week(),
    busyRanges: params.busy ?? [],
    serviceDurationMinutes: params.duration ?? 60,
    timezone: TZ,
    now: params.now ?? MON_9AM,
    horizonHours: params.horizonHours,
  });
}

describe("computeOpenSlots", () => {
  it("returns the first slot at opening time and stays inside the 48h window", () => {
    const slots = open({});
    expect(hhmm(slots[0])).toBe("10:00");
    const end = new Date(MON_9AM.getTime() + 48 * 3_600_000);
    expect(slots.every((s) => s < end)).toBe(true);
    // Wed 09:00 window end is before Wed's 10:00 opening, so Mon + Tue only.
    expect(slots.some((s) => s >= yvn("2026-10-14T00:00:00"))).toBe(false);
    expect(slots.some((s) => s >= yvn("2026-10-13T10:00:00"))).toBe(true);
  });

  it("skips slots overlapping an existing booking, including partial overlaps", () => {
    const slots = open({
      busy: [{ start: yvn("2026-10-12T10:30:00"), end: yvn("2026-10-12T11:30:00") }],
    });
    const monday = slots.filter((s) => s < yvn("2026-10-13T00:00:00")).map(hhmm);
    // 60-min service: 10:00 would run to 11:00 (overlaps), so the first fit is 11:30.
    expect(monday[0]).toBe("11:30");
    expect(monday).not.toContain("10:00");
    expect(monday).not.toContain("10:45");
    expect(monday).not.toContain("11:15");
  });

  it("handles back-to-back and overlapping busy ranges together", () => {
    const slots = open({
      busy: [
        { start: yvn("2026-10-12T10:00:00"), end: yvn("2026-10-12T12:00:00") },
        { start: yvn("2026-10-12T11:00:00"), end: yvn("2026-10-12T13:00:00") },
      ],
    });
    expect(hhmm(slots[0])).toBe("13:00");
  });

  it("returns nothing for a day off, and moves on to the next working day", () => {
    const slots = open({ schedule: week({ 1: { isDayOff: true } }) });
    expect(slots.every((s) => s >= yvn("2026-10-13T00:00:00"))).toBe(true);
    expect(hhmm(slots[0])).toBe("10:00");

    const allOff = open({ schedule: week({ 1: { isDayOff: true }, 2: { isDayOff: true }, 3: { isDayOff: true } }) });
    expect(allOff).toEqual([]);
  });

  it("never returns times in the past or inside the minimum-notice window", () => {
    const now = yvn("2026-10-12T14:10:00");
    const slots = open({ now });
    // 30 min minimum notice -> earliest 14:40; next grid point is 14:45.
    expect(hhmm(slots[0])).toBe("14:45");
    expect(slots.every((s) => s.getTime() >= now.getTime() + 30 * 60_000)).toBe(true);
  });

  it("returns nothing when it is already past closing and tomorrow is a day off", () => {
    const slots = open({
      now: yvn("2026-10-12T20:00:00"),
      schedule: week({ 2: { isDayOff: true } }),
      horizonHours: 24,
    });
    expect(slots).toEqual([]);
  });

  it("skips a gap shorter than the service", () => {
    // 45-minute hole between two bookings.
    const busy = [
      { start: yvn("2026-10-12T10:00:00"), end: yvn("2026-10-12T12:00:00") },
      { start: yvn("2026-10-12T12:45:00"), end: yvn("2026-10-12T19:00:00") },
    ];
    const monday = (duration: number) =>
      open({ busy, duration })
        .filter((s) => s < yvn("2026-10-13T00:00:00"))
        .map(hhmm);

    expect(monday(60)).toEqual([]); // 45 min gap can't hold a 60 min service
    expect(monday(45)).toEqual(["12:00"]); // exactly fits
    expect(monday(30)).toEqual(["12:00", "12:15"]);
  });

  it("works on the specialist's local calendar when UTC is still on the previous date", () => {
    // 01:00 Tuesday in Yerevan is 21:00 Monday UTC.
    const now = new Date("2026-10-12T21:00:00Z");
    expect(now.toISOString().slice(0, 10)).toBe("2026-10-12");
    const slots = open({ now });
    // First slot is Tuesday 10:00 local = 06:00Z on the 13th, not Monday's schedule.
    expect(slots[0].toISOString()).toBe("2026-10-13T06:00:00.000Z");
  });

  it("uses the right weekday for the local date near midnight", () => {
    // Sunday 23:30 local = Sunday 19:30Z. Sunday off -> first slot is Monday 10:00 local.
    const now = new Date("2026-10-11T19:30:00Z");
    const slots = open({ now, schedule: week({ 0: { isDayOff: true } }) });
    expect(slots[0].toISOString()).toBe("2026-10-12T06:00:00.000Z");
  });

  it("has no DST shift: the same wall-clock hour is the same UTC offset across a Europe DST change", () => {
    // 2026-10-25 is the end of EU DST; Yerevan must stay at UTC+4.
    const slots = open({ now: yvn("2026-10-25T09:00:00"), horizonHours: 24 });
    expect(slots[0].toISOString()).toBe("2026-10-25T06:00:00.000Z");
  });
});

describe("pickSuggestion", () => {
  it("returns null when there are no slots", () => {
    expect(pickSuggestion([])).toBeNull();
  });

  it("suggests the soonest slot and spaces alternatives at least an hour apart", () => {
    const slots = open({ duration: 30 });
    const picked = pickSuggestion(slots)!;
    expect(hhmm(picked.suggested)).toBe("10:00");
    expect(picked.alternatives.length).toBeGreaterThan(0);
    expect(picked.alternatives.length).toBeLessThanOrEqual(5);
    const all = [picked.suggested, ...picked.alternatives];
    for (let i = 1; i < all.length; i++) {
      expect(all[i].getTime() - all[i - 1].getTime()).toBeGreaterThanOrEqual(60 * 60_000);
    }
  });

  it("returns no alternatives when only one slot exists", () => {
    const only = [yvn("2026-10-12T10:00:00")];
    expect(pickSuggestion(only)).toEqual({ suggested: only[0], alternatives: [] });
  });
});
