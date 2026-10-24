/**
 * Dashboard navigation model, shared by the desktop sidebar and the phone
 * bottom bar / "More" sheet. Pure (no React) so the active-item rules can be
 * unit-tested. Paths are the locale-less pathnames next-intl's usePathname
 * returns.
 */

export type NavKey =
  | "home"
  | "appointments"
  | "clients"
  | "analytics"
  | "fillSchedule"
  | "profile"
  | "portfolio"
  | "reviews"
  | "services"
  | "workingHours"
  | "loyalty"
  | "plan";

export type NavItem = {
  key: NavKey;
  href: string;
  /** Pathname prefixes that count as "on this item" (sub-pages stay highlighted under their parent). */
  prefixes: readonly string[];
  /** Home is only active on exactly /dashboard, otherwise it would match every page. */
  exact?: boolean;
};

const item = (key: NavKey, href: string, prefixes: readonly string[] = [href], exact = false): NavItem => ({
  key,
  href,
  prefixes,
  exact,
});

export const NAV_HOME = item("home", "/dashboard", ["/dashboard"], true);
export const NAV_BOOKINGS = item("appointments", "/dashboard/appointments");
export const NAV_CLIENTS = item("clients", "/dashboard/clients");
export const NAV_ANALYTICS = item("analytics", "/dashboard/analytics");
export const NAV_FILL = item("fillSchedule", "/dashboard/fill-schedule");

/** Group 1 on the desktop sidebar (no heading). */
export const MAIN_ITEMS: readonly NavItem[] = [NAV_HOME, NAV_BOOKINGS, NAV_CLIENTS, NAV_ANALYTICS, NAV_FILL];

/** "My page" group. */
export const MY_PAGE_ITEMS: readonly NavItem[] = [
  item("profile", "/dashboard/profile"),
  item("portfolio", "/dashboard/portfolio"),
  item("reviews", "/dashboard/reviews"),
];

/** "Settings" group. Blocked time now lives on the Working hours page, so its old URL counts as Working hours. */
export const SETTINGS_ITEMS: readonly NavItem[] = [
  item("services", "/dashboard/services"),
  item("workingHours", "/dashboard/working-hours", ["/dashboard/working-hours", "/dashboard/blocked-time"]),
  item("loyalty", "/dashboard/loyalty"),
  item("plan", "/dashboard/plan"),
];

/** Phone bottom bar: four direct items plus "More". */
export const PHONE_BAR_ITEMS: readonly NavItem[] = [NAV_HOME, NAV_BOOKINGS, NAV_CLIENTS, NAV_FILL];

/** Everything that lives behind "More" on phones (Analytics first, then the two groups). */
export const MORE_ITEMS: readonly NavItem[] = [NAV_ANALYTICS, ...MY_PAGE_ITEMS, ...SETTINGS_ITEMS];

function matches(prefix: string, pathname: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isNavItemActive(navItem: NavItem, pathname: string): boolean {
  if (navItem.exact) return pathname === navItem.href;
  return navItem.prefixes.some((prefix) => matches(prefix, pathname));
}

/** "More" is highlighted whenever the current page is one of its items. */
export function isMoreActive(pathname: string): boolean {
  return MORE_ITEMS.some((navItem) => isNavItemActive(navItem, pathname));
}
