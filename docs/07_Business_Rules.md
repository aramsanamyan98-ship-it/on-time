# 07 — Business Rules

Concrete rules Claude Code (or any developer) should follow without
needing to guess. Update this file whenever a new ambiguous case comes up
— don't let undocumented decisions live only in someone's memory.

## Booking Rules

- **No advance-booking limit.** A guest can book any open slot on the
  specialist's calendar, however far out it is. The booking page always
  shows the *earliest* available slot first — if the specialist is fully
  booked tomorrow but has an opening in 4 days, that opening is what the
  guest sees and can book. Do not artificially cap the booking horizon
  (e.g., "only show 14 days ahead") — surface whatever the specialist's
  actual working hours and existing appointments allow.
- A guest can book as late as the next available slot, including same-day,
  if the specialist's calendar allows it.
- Minimum notice before an appointment start time to still allow booking:
  *(Open — decide, e.g., 30 minutes. Lower priority than the item above —
  a sensible default of 0–30 minutes is fine to ship with and adjust
  later.)*
- Appointment slots are generated based on service duration + specialist
  working hours + existing appointments + blocked time. A slot is only
  "available" if the full service duration fits without overlapping
  anything else.
- If two guests attempt to book the same slot at the same time, the
  database constraint (see 05_Database.md) must guarantee only one
  succeeds. The losing request must receive a clear "this slot was just
  taken" message and be shown updated availability — not a generic error.

## Cancellation & Rescheduling

- Specialists can cancel or reschedule any appointment at any time from
  their dashboard.
- **Guests can self-service cancel or reschedule via a unique link.** Every
  booking confirmation (email and/or WhatsApp/Telegram) includes a private
  link that lets the guest view their appointment and cancel or reschedule
  it themselves, without creating an account or contacting the specialist
  directly. This requires a `booking_token` on each appointment (see
  05_Database.md).
- If a guest reschedules via the link, the same double-booking protection
  applies as any other booking — they can only move into a genuinely open
  slot.
- The specialist is notified whenever a guest cancels or reschedules via
  their link, the same as if the specialist had made the change.
- Cancelling an appointment immediately frees the slot for new bookings.

## No-Shows

- v1 has no automated penalty, blocking, or charge for no-shows (see
  02_PRD.md Section 12).
- Specialists can mark an appointment as "no-show" for their own record-
  keeping. This has no system-side consequence in v1 — it's informational
  only.

## Specialist Account Rules

- A specialist can deactivate a service without deleting its history —
  past appointments referencing that service must remain intact and
  viewable.
- If a specialist deletes/deactivates their account, existing future
  appointments should trigger a cancellation notification to affected
  guests (do not silently orphan bookings). Exact grace period: **open
  decision.**
- A specialist's public page must be unreachable (404 or "unavailable")
  the moment their account is deactivated — no bookings should be
  possible against an inactive specialist.

## Trial & Billing Rules

(See 02_PRD.md Section 14 for the source values.)

- Every new specialist starts with 30 days of full access, no card
  required.
- Trial extensions (+14 days at 10 bookings, +7 days per 5 referrals) are
  additive and can both apply to the same specialist.
- When a trial expires without upgrade, the specialist drops to the Basic
  (Free) plan automatically — they are never fully locked out of their
  account or data.
- The "5 bookings received" subscription prompt is informational and
  non-blocking; it must never prevent the specialist from continuing to
  use the app.

## Notifications

- A booking is considered successful the moment it's written to the
  database — notification delivery is a separate step and its failure
  must never roll back or invalidate the booking (see 05_Database.md,
  `notifications_log`).
- Reminder timing before an appointment: **open decision** — e.g., 24
  hours and/or 2 hours before. Decide before Phase 6.

## Language Rules

- A specialist's dashboard language is independent from a guest's booking
  language — each is stored/detected separately (see 02_PRD.md Section 2).
- No user-facing copy may be hardcoded in a single language anywhere in
  the codebase.

## Items Requiring a Decision Before Relevant Build Phase

Flagging these explicitly so they don't get decided by default/accident
inside the code:

1. Minimum notice window before appointment start? (Before Phase 4 —
   low-stakes, a default of 0–30 minutes is fine to ship with)
2. Grace period after a specialist deletes their account? (Before Phase 2)
3. Reminder timing (24h / 2h / both)? (Before Phase 6)

**Resolved:**
- ~~How far in advance can a guest book?~~ → No limit; earliest available
  slot is always shown (see Booking Rules above).
- ~~Can guests self-cancel/reschedule via a link?~~ → Yes, via a private
  booking-token link included in every confirmation (see Cancellation &
  Rescheduling above).
