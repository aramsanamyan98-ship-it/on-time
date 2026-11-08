import { describe, expect, it } from "vitest";
import { detectBookingLocale, pickFromAcceptLanguage, resolveBookingRoute } from "@/lib/booking/short-url";

describe("resolveBookingRoute: short URLs are rewritten", () => {
  it.each([
    ["/anna", "anna", ""],
    ["/anna/", "anna", ""],
    ["/anna/new", "anna", "/new"],
    ["/studio-54/new", "studio-54", "/new"],
    ["/page-3f9a1c7b2e", "page-3f9a1c7b2e", ""],
  ])("%s", (path, slug, sub) => {
    expect(resolveBookingRoute(path)).toEqual({ kind: "rewrite", slug, sub });
  });

  it.each([
    "/",
    "/login",
    "/register",
    "/dashboard",
    "/dashboard/profile",
    "/api",
    "/api/auth/verify-email",
    "/hy",
    "/ru/login",
    "/en/dashboard/services",
    "/forgot-password",
    "/admin",
    "/anna/other",
    "/anna/new/extra",
    "/Anna",
    "/an",
    "/anna_k",
  ])("%s is left to the rest of the proxy", (path) => {
    expect(resolveBookingRoute(path)).toBeNull();
  });
});

describe("resolveBookingRoute: old URLs are redirected", () => {
  it.each([
    ["/hy/book/anna", "/anna", "hy"],
    ["/ru/book/anna", "/anna", "ru"],
    ["/en/book/anna/", "/anna", "en"],
    ["/hy/book/anna/new", "/anna/new", "hy"],
    ["/book/anna", "/anna", null],
    ["/book/anna/new", "/anna/new", null],
  ])("%s -> %s", (path, to, locale) => {
    expect(resolveBookingRoute(path)).toEqual({ kind: "redirect", to, locale });
  });

  it("does not redirect to a reserved word or a deeper path", () => {
    expect(resolveBookingRoute("/en/book/login")).toBeNull();
    expect(resolveBookingRoute("/en/book/dashboard/new")).toBeNull();
    expect(resolveBookingRoute("/en/book/anna/other")).toBeNull();
    expect(resolveBookingRoute("/en/book")).toBeNull();
  });

  it("never loops: a redirect target is a rewrite, not another redirect", () => {
    for (const path of ["/hy/book/anna", "/ru/book/anna/new", "/book/anna"]) {
      const route = resolveBookingRoute(path);
      expect(route?.kind).toBe("redirect");
      if (route?.kind !== "redirect") continue;
      expect(resolveBookingRoute(route.to)?.kind).toBe("rewrite");
    }
  });
});

describe("pickFromAcceptLanguage", () => {
  it("uses the highest q-weight among supported languages", () => {
    expect(pickFromAcceptLanguage("en-US,en;q=0.9,hy;q=0.8")).toBe("en");
    expect(pickFromAcceptLanguage("ru-RU,ru;q=0.9,en;q=0.8")).toBe("ru");
    expect(pickFromAcceptLanguage("hy-AM,hy;q=0.9")).toBe("hy");
    expect(pickFromAcceptLanguage("fr;q=0.9,hy;q=0.4")).toBe("hy");
  });

  it("ignores unsupported languages, bad q-values and empty headers", () => {
    expect(pickFromAcceptLanguage("fr-FR,de;q=0.8")).toBeNull();
    expect(pickFromAcceptLanguage("en;q=0")).toBeNull();
    expect(pickFromAcceptLanguage("en;q=abc")).toBeNull();
    expect(pickFromAcceptLanguage("")).toBeNull();
    expect(pickFromAcceptLanguage(null)).toBeNull();
  });
});

describe("detectBookingLocale", () => {
  it("defaults to Armenian when nothing is known", () => {
    expect(detectBookingLocale({})).toBe("hy");
    expect(detectBookingLocale({ acceptLanguage: "fr-FR,de;q=0.8" })).toBe("hy");
  });

  it("prefers ?lang over the cookie over the browser", () => {
    expect(detectBookingLocale({ langParam: "ru", cookie: "en", acceptLanguage: "hy" })).toBe("ru");
    expect(detectBookingLocale({ cookie: "en", acceptLanguage: "hy" })).toBe("en");
    expect(detectBookingLocale({ acceptLanguage: "ru-RU" })).toBe("ru");
  });

  it("ignores invalid ?lang and cookie values", () => {
    expect(detectBookingLocale({ langParam: "xx", cookie: "yy", acceptLanguage: "en" })).toBe("en");
  });
});
