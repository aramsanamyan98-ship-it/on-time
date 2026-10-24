"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  MAIN_ITEMS,
  MY_PAGE_ITEMS,
  NAV_ANALYTICS,
  PHONE_BAR_ITEMS,
  SETTINGS_ITEMS,
  isMoreActive,
  isNavItemActive,
  type NavItem,
} from "@/lib/dashboard/nav-items";
import { NAV_ICONS, ExternalLinkIcon, MenuIcon, ChevronRightIcon } from "./NavIcons";
import { DashboardLanguagePills } from "./DashboardLanguagePills";
import { LogoutButton } from "./LogoutButton";

const BADGE_DISPLAY_CAP = 9;

export type DashboardBarber = { name: string; photoUrl: string | null; slug: string };

function Logo({ size }: { size: number }) {
  return (
    <Image
      src="/brand/on-time-icon-light.png"
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0"
    />
  );
}

function BarberAvatar({ barber, className }: { barber: DashboardBarber; className: string }) {
  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden font-bold ${className}`}>
      {barber.photoUrl ? (
        <Image src={barber.photoUrl} alt="" fill sizes="40px" className="object-cover" />
      ) : (
        <span aria-hidden="true">{Array.from(barber.name.trim())[0]?.toUpperCase()}</span>
      )}
    </span>
  );
}

function Badge({ count, label, className = "" }: { count: number; label: string; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-brand-gold px-1 text-[0.6875rem] font-bold leading-none text-brand-green ${className}`}
      aria-label={label}
    >
      {count > BADGE_DISPLAY_CAP ? `${BADGE_DISPLAY_CAP}+` : count}
    </span>
  );
}

/** The barber's public booking page, opened in a new tab. */
function usePublicPageHref(slug: string) {
  const locale = useLocale();
  return `/${locale}/book/${slug}`;
}

// ---------------------------------------------------------------------------
// Desktop (1024px+): fixed left sidebar
// ---------------------------------------------------------------------------

function SidebarLink({
  item,
  pathname,
  badgeCount,
  tall,
}: {
  item: NavItem;
  pathname: string;
  badgeCount: number;
  tall: boolean;
}) {
  const t = useTranslations("Dashboard.nav");
  const Icon = NAV_ICONS[item.key];
  const active = isNavItemActive(item, pathname);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex ${tall ? "min-h-[2.625rem]" : "min-h-10"} items-center gap-3 rounded-[0.625rem] px-3 text-sm transition ${
        active ? "bg-brand-cream/12 font-semibold text-white" : "font-medium text-brand-cream/90 hover:bg-brand-cream/10"
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${active ? "text-brand-gold" : ""}`} />
      <span className="min-w-0 flex-1 leading-tight">{t(item.key)}</span>
      <Badge count={badgeCount} label={t("unviewedBadgeLabel", { count: badgeCount })} />
    </Link>
  );
}

function SidebarGroup({
  heading,
  items,
  pathname,
  unviewedAppointmentsCount,
}: {
  heading?: string;
  items: readonly NavItem[];
  pathname: string;
  unviewedAppointmentsCount: number;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {heading && (
        <span className="px-3 pb-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-brand-cream/60">
          {heading}
        </span>
      )}
      {items.map((item) => (
        <SidebarLink
          key={item.key}
          item={item}
          pathname={pathname}
          badgeCount={item.key === "appointments" ? unviewedAppointmentsCount : 0}
          tall={!heading}
        />
      ))}
    </div>
  );
}

export function DashboardSidebar({
  barber,
  unviewedAppointmentsCount,
}: {
  barber: DashboardBarber;
  unviewedAppointmentsCount: number;
}) {
  const t = useTranslations("Dashboard.nav");
  const tCommon = useTranslations("Common");
  const pathname = usePathname();
  const publicHref = usePublicPageHref(barber.slug);
  const groupProps = { pathname, unviewedAppointmentsCount };

  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col gap-3.5 overflow-y-auto bg-brand-green px-3.5 py-4 text-brand-cream lg:flex"
    >
      <Link
        href="/dashboard"
        className="flex min-h-11 items-center gap-2.5 px-2 text-[1.0625rem] font-bold text-brand-cream"
      >
        <Logo size={34} />
        {tCommon("appName")}
      </Link>

      <SidebarGroup items={MAIN_ITEMS} {...groupProps} />
      <SidebarGroup heading={t("groupMyPage")} items={MY_PAGE_ITEMS} {...groupProps} />
      <SidebarGroup heading={t("groupSettings")} items={SETTINGS_ITEMS} {...groupProps} />

      <div className="mt-auto flex flex-col gap-2.5">
        <a
          href={publicHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-xl bg-brand-cream/10 p-2.5 text-brand-cream transition hover:bg-brand-cream/15"
        >
          <BarberAvatar barber={barber} className="h-9 w-9 rounded-[0.625rem] bg-brand-gold text-brand-green" />
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <strong className="truncate text-[0.8125rem] font-semibold">{barber.name}</strong>
            <span className="text-xs text-brand-cream/75">{t("viewMyPage")}</span>
          </span>
          <ExternalLinkIcon className="h-4 w-4 shrink-0" />
          <span className="sr-only">{t("opensInNewTab")}</span>
        </a>
        <div className="flex gap-2">
          <DashboardLanguagePills tone="dark" className="flex-1" />
          <LogoutButton variant="sidebar" />
        </div>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Phone (< 1024px): slim top bar, fixed bottom tab bar, "More" bottom sheet
// ---------------------------------------------------------------------------

export function DashboardPhoneTopBar({ barber }: { barber: DashboardBarber }) {
  const t = useTranslations("Dashboard.nav");
  const tCommon = useTranslations("Common");
  const publicHref = usePublicPageHref(barber.slug);

  return (
    <header className="flex items-center justify-between bg-brand-green pb-2.5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.625rem,env(safe-area-inset-top))] lg:hidden">
      <Link href="/dashboard" className="flex min-h-11 items-center gap-2 text-base font-bold text-brand-cream">
        <Logo size={30} />
        {tCommon("appName")}
      </Link>
      <a
        href={publicHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-center gap-1.5 rounded-full border border-brand-cream/30 px-3.5 text-[0.8125rem] font-semibold text-brand-cream transition hover:bg-brand-cream/10"
      >
        {t("myPageShort")}
        <ExternalLinkIcon className="h-3.5 w-3.5" />
        <span className="sr-only">{t("opensInNewTab")}</span>
      </a>
    </header>
  );
}

function MoreSheet({
  dialogRef,
  barber,
  pathname,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  barber: DashboardBarber;
  pathname: string;
}) {
  const t = useTranslations("Dashboard.nav");
  const publicHref = usePublicPageHref(barber.slug);
  const pressStartedOnBackdrop = useRef(false);

  const heading = "px-1 pb-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-brand-muted";

  return (
    <dialog
      ref={dialogRef}
      aria-label={t("more")}
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressStartedOnBackdrop.current) dialogRef.current?.close();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none items-end justify-center bg-transparent p-0 text-brand-charcoal backdrop:bg-brand-charcoal/45 open:flex lg:hidden"
    >
      <div className="ot-sheet flex max-h-[92dvh] w-full flex-col gap-3.5 overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2.5">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label={t("closeMenu")}
          className="flex min-h-6 w-full shrink-0 items-start justify-center"
        >
          <span className="h-[5px] w-10 rounded-full bg-brand-sand" />
        </button>

        <a
          href={publicHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-[0.875rem] bg-brand-gold-tint p-3 text-brand-green"
        >
          <BarberAvatar barber={barber} className="h-10 w-10 rounded-xl bg-brand-green text-brand-gold" />
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <strong className="truncate font-bold">{barber.name}</strong>
            <span className="text-[0.8125rem] text-brand-charcoal/75">{t("viewMyPage")}</span>
          </span>
          <ExternalLinkIcon className="h-[18px] w-[18px] shrink-0" />
          <span className="sr-only">{t("opensInNewTab")}</span>
        </a>

        <MoreRow item={NAV_ANALYTICS} pathname={pathname} standalone />

        <div className="flex flex-col">
          <span className={heading}>{t("groupMyPage")}</span>
          <div className="grid grid-cols-3 gap-2">
            {MY_PAGE_ITEMS.map((item) => (
              <MoreTile key={item.key} item={item} pathname={pathname} />
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <span className={heading}>{t("groupSettings")}</span>
          <div className="flex flex-col overflow-hidden rounded-[0.875rem] border border-brand-card-border">
            {SETTINGS_ITEMS.map((item) => (
              <MoreRow key={item.key} item={item} pathname={pathname} />
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <DashboardLanguagePills tone="light" className="flex-1" />
          <LogoutButton variant="sheet" className="flex-1" />
        </div>
      </div>
    </dialog>
  );
}

function MoreTile({ item, pathname }: { item: NavItem; pathname: string }) {
  const t = useTranslations("Dashboard.nav");
  const Icon = NAV_ICONS[item.key];
  const active = isNavItemActive(item, pathname);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-[0.875rem] border px-1 py-3.5 text-[0.8125rem] font-medium ${
        active ? "border-brand-gold-border bg-brand-gold-tint text-brand-green" : "border-brand-card-border text-brand-charcoal"
      }`}
    >
      <Icon className="h-[22px] w-[22px] text-brand-green" />
      <span className="max-w-full truncate">{t(item.key)}</span>
    </Link>
  );
}

function MoreRow({ item, pathname, standalone = false }: { item: NavItem; pathname: string; standalone?: boolean }) {
  const t = useTranslations("Dashboard.nav");
  const Icon = NAV_ICONS[item.key];
  const active = isNavItemActive(item, pathname);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[3.125rem] items-center gap-3 px-3.5 text-[0.9375rem] ${
        standalone
          ? "rounded-[0.875rem] border border-brand-card-border"
          : "border-b border-brand-card-border last:border-b-0"
      } ${active ? "bg-brand-gold-tint font-semibold text-brand-green" : "text-brand-charcoal"}`}
    >
      <Icon className="h-5 w-5 shrink-0 text-brand-green" />
      <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-brand-muted" />
    </Link>
  );
}

export function DashboardBottomBar({
  barber,
  unviewedAppointmentsCount,
}: {
  barber: DashboardBarber;
  unviewedAppointmentsCount: number;
}) {
  const t = useTranslations("Dashboard.nav");
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const moreActive = isMoreActive(pathname);

  // Navigating from inside the sheet (or any route change) closes it.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const itemClass = (active: boolean) =>
    `relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[0.625rem] tracking-tight ${
      active ? "font-bold text-brand-green" : "font-medium text-brand-muted"
    }`;
  const iconWrap = (active: boolean) =>
    `flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-brand-gold-tint" : ""}`;

  return (
    <>
      <nav
        aria-label={t("label")}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-brand-card-border bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-1.5 shadow-[0_-6px_20px_rgba(28,27,24,0.06)] lg:hidden"
      >
        {PHONE_BAR_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.key];
          const active = isNavItemActive(item, pathname);
          const badgeCount = item.key === "appointments" ? unviewedAppointmentsCount : 0;
          return (
            <Link key={item.key} href={item.href} aria-current={active ? "page" : undefined} className={itemClass(active)}>
              <span className={`relative ${iconWrap(active)}`}>
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 2} />
                <Badge
                  count={badgeCount}
                  label={t("unviewedBadgeLabel", { count: badgeCount })}
                  className="absolute -right-0.5 -top-1 !h-4 !min-w-4 text-[0.625rem]"
                />
              </span>
              <span className="max-w-full truncate">{t(item.key === "fillSchedule" ? "fillShort" : item.key)}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => dialogRef.current?.showModal()}
          className={itemClass(moreActive)}
        >
          <span className={iconWrap(moreActive)}>
            <MenuIcon className="h-[22px] w-[22px]" />
          </span>
          <span className="max-w-full truncate">{t("more")}</span>
        </button>
      </nav>
      <MoreSheet dialogRef={dialogRef} barber={barber} pathname={pathname} />
    </>
  );
}

/** Everything the dashboard chrome renders: sidebar (lg+), phone top bar, bottom bar + More sheet (< lg). */
export function DashboardNav(props: { barber: DashboardBarber; unviewedAppointmentsCount: number }) {
  return (
    <>
      <DashboardSidebar {...props} />
      <DashboardPhoneTopBar barber={props.barber} />
      <DashboardBottomBar {...props} />
    </>
  );
}

