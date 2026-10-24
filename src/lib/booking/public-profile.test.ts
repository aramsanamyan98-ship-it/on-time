import { describe, expect, it } from "vitest";
import { appendSpreadSlots } from "@/lib/booking/open-slots";
import {
  computeOpenStatus,
  formatAmount,
  groupHours,
  mapLinks,
  shortestService,
  slotDayKind,
  telHref,
} from "@/lib/booking/public-profile";
import type { DayOfWeek, DaySchedule } from "@/lib/working-hours/defaults";

const TZ = "Asia/Yerevan"; // UTC+4

function week(overrides: Partial<Record<DayOfWeek, Partial<DaySchedule>>> = {}): DaySchedule[] {
  return ([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((dayOfWeek) => ({
    dayOfWeek,
    isDayOff: dayOfWeek === 0,
    startTime: "10:00",
    endTime: "18:00",
    ...overrides[dayOfWeek],
  }));
}

// Wed 2026-10-28
const at = (hhmmLocal: string) => new Date(`2026-10-28T${hhmmLocal}:00+04:00`);

describe("computeOpenStatus", () => {
  it("is open during working hours", () => {
    expect(computeOpenStatus(week(), TZ, at("12:00"))).toEqual({ kind: "open", until: "18:00" });
  });
  it("opens later today before opening time", () => {
    expect(computeOpenStatus(week(), TZ, at("08:00"))).toEqual({
      kind: "closed",
      opens: { dayOffset: 0, dayOfWeek: 3, time: "10:00" },
    });
  });
  it("opens tomorrow after closing time", () => {
    expect(computeOpenStatus(week(), TZ, at("19:00"))).toEqual({
      kind: "closed",
      opens: { dayOffset: 1, dayOfWeek: 4, time: "10:00" },
    });
  });
  it("skips days off", () => {
    // Sat 2026-10-31 after close -> Sunday off -> Monday
    const sat = new Date("2026-10-31T19:00:00+04:00");
    expect(computeOpenStatus(week(), TZ, sat)).toEqual({
      kind: "closed",
      opens: { dayOffset: 2, dayOfWeek: 1, time: "10:00" },
    });
  });
  it("handles a schedule that is always off", () => {
    const allOff = week({
      0: { isDayOff: true },
      1: { isDayOff: true },
      2: { isDayOff: true },
      3: { isDayOff: true },
      4: { isDayOff: true },
      5: { isDayOff: true },
      6: { isDayOff: true },
    });
    expect(computeOpenStatus(allOff, TZ, at("12:00"))).toEqual({ kind: "closedAlways" });
  });
  it("uses the specialist timezone, not the server one", () => {
    // 22:30Z Wed = 02:30 Thu in Yerevan -> closed, opens Thu 10:00 today
    expect(computeOpenStatus(week(), TZ, new Date("2026-10-28T22:30:00Z"))).toEqual({
      kind: "closed",
      opens: { dayOffset: 0, dayOfWeek: 4, time: "10:00" },
    });
  });
});

describe("groupHours", () => {
  it("merges equal neighbouring days, Monday first, and isolates today", () => {
    const rows = groupHours(week({ 6: { endTime: "16:00" } }), 3);
    expect(rows.map((r) => [r.days, r.isToday, r.isDayOff])).toEqual([
      [[1, 2], false, false],
      [[3], true, false],
      [[4, 5], false, false],
      [[6], false, false],
      [[0], false, true],
    ]);
  });
});

describe("slotDayKind", () => {
  it("labels today / tomorrow / later in the specialist timezone", () => {
    const now = at("12:00");
    expect(slotDayKind(at("15:00"), now, TZ)).toBe("today");
    expect(slotDayKind(new Date("2026-10-29T11:00:00+04:00"), now, TZ)).toBe("tomorrow");
    expect(slotDayKind(new Date("2026-10-30T11:00:00+04:00"), now, TZ)).toBe("other");
  });
});

describe("appendSpreadSlots", () => {
  it("takes the first slot then spreads the rest at least an hour apart", () => {
    const base = new Date("2026-10-28T11:00:00Z").getTime();
    const slots = [0, 15, 30, 60, 75, 150, 160, 240].map((m) => new Date(base + m * 60_000));
    const picked = appendSpreadSlots([], slots, 4).map((d) => (d.getTime() - base) / 60_000);
    expect(picked).toEqual([0, 60, 150, 240]);
  });
  it("keeps spacing when fed day by day", () => {
    const a = new Date("2026-10-28T15:00:00Z");
    const picked = appendSpreadSlots([], [a], 4);
    appendSpreadSlots(picked, [new Date(a.getTime() + 15 * 60_000), new Date(a.getTime() + 24 * 3_600_000)], 4);
    expect(picked).toHaveLength(2);
  });
});

describe("misc helpers", () => {
  it("builds map links from the address", () => {
    expect(mapLinks("Komitas 5, Yerevan").google).toContain("query=Komitas%205%2C%20Yerevan");
    expect(mapLinks("x").yandex).toContain("text=x");
  });
  it("sanitises tel links", () => {
    expect(telHref("+374 (77) 12-34-56")).toBe("tel:+37477123456");
  });
  it("groups thousands", () => {
    expect(formatAmount(5000)).toBe("5 000");
    expect(formatAmount(950)).toBe("950");
  });
  it("picks the shortest service, cheapest on ties", () => {
    expect(
      shortestService([
        { durationMinutes: 60, priceAmd: 1 },
        { durationMinutes: 30, priceAmd: 3000 },
        { durationMinutes: 30, priceAmd: 2500 },
      ]),
    ).toEqual({ durationMinutes: 30, priceAmd: 2500 });
    expect(shortestService([])).toBeNull();
  });
});
