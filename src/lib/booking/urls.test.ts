import { afterEach, describe, expect, it } from "vitest";
import { buildBookingUrl, getBookingBaseUrl, hostFromBaseUrl } from "@/lib/booking/urls";
import { buildSlotBookingUrl } from "@/lib/booking/slot-link";

const original = { booking: process.env.BOOKING_BASE_URL, app: process.env.APP_URL };
afterEach(() => {
  if (original.booking === undefined) delete process.env.BOOKING_BASE_URL;
  else process.env.BOOKING_BASE_URL = original.booking;
  if (original.app === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = original.app;
});

describe("getBookingBaseUrl", () => {
  it("prefers BOOKING_BASE_URL, then APP_URL, then production", () => {
    process.env.BOOKING_BASE_URL = "https://book.example.com/";
    process.env.APP_URL = "http://localhost:3000";
    expect(getBookingBaseUrl()).toBe("https://book.example.com");

    delete process.env.BOOKING_BASE_URL;
    expect(getBookingBaseUrl()).toBe("http://localhost:3000");

    delete process.env.APP_URL;
    expect(getBookingBaseUrl()).toBe("https://book.on-time.am");
  });
});

describe("buildBookingUrl", () => {
  const base = "https://book.on-time.am";

  it("builds the short URLs with no language prefix", () => {
    expect(buildBookingUrl(base, "anna")).toBe("https://book.on-time.am/anna");
    expect(buildBookingUrl(base, "anna", { page: "new" })).toBe("https://book.on-time.am/anna/new");
  });

  it("adds query params and an optional language", () => {
    expect(buildBookingUrl(base, "anna", { page: "new", query: { service: "s1" }, lang: "ru" })).toBe(
      "https://book.on-time.am/anna/new?service=s1&lang=ru",
    );
  });

  it("builds slot links for Stories on the short URL", () => {
    const url = buildSlotBookingUrl({
      baseUrl: base,
      locale: "hy",
      slug: "anna",
      serviceId: "s1",
      startAt: new Date("2026-11-10T09:00:00.000Z"),
    });
    expect(url).toBe("https://book.on-time.am/anna/new?service=s1&start=2026-11-10T09%3A00%3A00.000Z&lang=hy");
    expect(url).not.toContain("/book/");
  });
});

describe("hostFromBaseUrl", () => {
  it("drops the protocol and trailing slash", () => {
    expect(hostFromBaseUrl("https://book.on-time.am")).toBe("book.on-time.am");
    expect(hostFromBaseUrl("http://localhost:3000/")).toBe("localhost:3000");
  });
});
