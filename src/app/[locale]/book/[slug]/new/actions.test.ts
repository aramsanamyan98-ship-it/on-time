import { beforeEach, describe, expect, it, vi } from "vitest";

// The popup and the full page must create bookings through exactly the same
// path (validation, availability re-check, insert, guest confirmation email,
// barber alert all live in createGuestBooking). These tests pin that down.
const createGuestBooking = vi.fn();
const redirect = vi.fn((arg: unknown) => ({ redirected: arg }));

vi.mock("next-intl/server", () => ({ getLocale: async () => "hy" }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/booking/create-booking", () => ({ createGuestBooking: (input: unknown) => createGuestBooking(input) }));
vi.mock("@/i18n/navigation", () => ({ redirect: (arg: unknown) => redirect(arg) }));

import { createBookingAction, createBookingInPlaceAction } from "./actions";

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const values: Record<string, string> = {
    specialistId: "sp1",
    serviceId: "svc1",
    startAt: "2026-10-28T11:00:00.000Z",
    guestName: "Ani",
    guestPhone: "+37455123456",
    guestEmail: "ani@example.com",
    guestNotes: "hi",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  createGuestBooking.mockReset();
  redirect.mockClear();
});

describe("booking creation: full page vs popup", () => {
  it("both call createGuestBooking with identical input", async () => {
    createGuestBooking.mockResolvedValue({ ok: true, data: { bookingToken: "tok" } });

    await createBookingAction({}, form());
    await createBookingInPlaceAction({}, form());

    expect(createGuestBooking).toHaveBeenCalledTimes(2);
    expect(createGuestBooking.mock.calls[0][0]).toEqual(createGuestBooking.mock.calls[1][0]);
    expect(createGuestBooking.mock.calls[0][0]).toMatchObject({
      specialistId: "sp1",
      serviceId: "svc1",
      guestEmail: "ani@example.com",
      guestLocale: "hy",
    });
  });

  it("the full page redirects to the manage page; the popup returns the token instead", async () => {
    createGuestBooking.mockResolvedValue({ ok: true, data: { bookingToken: "tok" } });

    await createBookingAction({}, form());
    expect(redirect).toHaveBeenCalledWith({ href: "/booking/tok?justBooked=1", locale: "hy" });

    redirect.mockClear();
    const state = await createBookingInPlaceAction({}, form());
    expect(state).toEqual({ bookingToken: "tok" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("both surface the same errors", async () => {
    createGuestBooking.mockResolvedValue({ ok: false, formError: "slotTaken" });
    expect(await createBookingAction({}, form())).toEqual({ fieldErrors: undefined, formError: "slotTaken" });
    expect(await createBookingInPlaceAction({}, form())).toEqual({ fieldErrors: undefined, formError: "slotTaken" });

    createGuestBooking.mockClear();
    expect(await createBookingInPlaceAction({}, form({ startAt: "garbage" }))).toEqual({ formError: "slotInvalid" });
    expect(createGuestBooking).not.toHaveBeenCalled();
  });
});
