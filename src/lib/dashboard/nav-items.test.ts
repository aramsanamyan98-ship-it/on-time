import { describe, expect, it } from "vitest";
import {
  MAIN_ITEMS,
  MORE_ITEMS,
  MY_PAGE_ITEMS,
  PHONE_BAR_ITEMS,
  SETTINGS_ITEMS,
  isMoreActive,
  isNavItemActive,
  type NavItem,
} from "@/lib/dashboard/nav-items";

const ALL = [...MAIN_ITEMS, ...MY_PAGE_ITEMS, ...SETTINGS_ITEMS];
const activeKeys = (pathname: string) => ALL.filter((i) => isNavItemActive(i, pathname)).map((i) => i.key);

describe("dashboard nav items", () => {
  it("covers every dashboard section exactly once", () => {
    expect(ALL.map((i) => i.key).sort()).toEqual(
      [
        "analytics", "appointments", "clients", "fillSchedule", "home", "loyalty",
        "plan", "portfolio", "profile", "reviews", "services", "workingHours",
      ].sort(),
    );
  });

  it("keeps the existing URLs", () => {
    const hrefs = Object.fromEntries(ALL.map((i) => [i.key, i.href]));
    expect(hrefs).toMatchObject({
      home: "/dashboard",
      appointments: "/dashboard/appointments",
      clients: "/dashboard/clients",
      analytics: "/dashboard/analytics",
      fillSchedule: "/dashboard/fill-schedule",
      profile: "/dashboard/profile",
      portfolio: "/dashboard/portfolio",
      reviews: "/dashboard/reviews",
      services: "/dashboard/services",
      workingHours: "/dashboard/working-hours",
      loyalty: "/dashboard/loyalty",
      plan: "/dashboard/plan",
    });
  });

  it("highlights exactly one item per page, including sub-pages", () => {
    expect(activeKeys("/dashboard")).toEqual(["home"]);
    expect(activeKeys("/dashboard/appointments")).toEqual(["appointments"]);
    expect(activeKeys("/dashboard/appointments/new")).toEqual(["appointments"]);
    expect(activeKeys("/dashboard/appointments/abc/reschedule")).toEqual(["appointments"]);
    expect(activeKeys("/dashboard/clients/%2B37455123456")).toEqual(["clients"]);
    expect(activeKeys("/dashboard/services/new")).toEqual(["services"]);
    expect(activeKeys("/dashboard/services/abc/edit")).toEqual(["services"]);
    expect(activeKeys("/dashboard/plan")).toEqual(["plan"]);
  });

  it("treats the old blocked-time URL as Working hours", () => {
    expect(activeKeys("/dashboard/working-hours")).toEqual(["workingHours"]);
    expect(activeKeys("/dashboard/blocked-time")).toEqual(["workingHours"]);
  });

  it("does not match a longer sibling path by prefix", () => {
    const fake: NavItem = { key: "clients", href: "/dashboard/clients", prefixes: ["/dashboard/clients"] };
    expect(isNavItemActive(fake, "/dashboard/clients-archive")).toBe(false);
  });

  it("phone: four direct items, everything else behind More (Analytics first)", () => {
    expect(PHONE_BAR_ITEMS.map((i) => i.key)).toEqual(["home", "appointments", "clients", "fillSchedule"]);
    expect(MORE_ITEMS.map((i) => i.key)).toEqual([
      "analytics", "profile", "portfolio", "reviews", "services", "workingHours", "loyalty", "plan",
    ]);
    for (const i of ALL) {
      const direct = PHONE_BAR_ITEMS.includes(i);
      const more = MORE_ITEMS.includes(i);
      expect(direct !== more).toBe(true); // reachable exactly one way
    }
  });

  it("More is active only on pages behind it", () => {
    expect(isMoreActive("/dashboard/profile")).toBe(true);
    expect(isMoreActive("/dashboard/analytics")).toBe(true);
    expect(isMoreActive("/dashboard/blocked-time")).toBe(true);
    expect(isMoreActive("/dashboard")).toBe(false);
    expect(isMoreActive("/dashboard/appointments")).toBe(false);
  });
});
