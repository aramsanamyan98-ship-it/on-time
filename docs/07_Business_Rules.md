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

- Every new specialist starts with a flat 3-month (90-day) trial, full
  access, no card required. The trial length is fixed — there are no
  extensions of any kind (no referral mechanic, no booking-count
  milestone).
- There is no tiered plan. Every paying specialist gets identical
  features regardless of commitment length (monthly / 3 / 6 / 12
  months) — commitment length only affects price.
- Access is a single binary check: an active trial **or** an active paid
  subscription of any commitment length. When neither applies (trial
  expired, no active subscription), the specialist **is** locked out of
  the dashboard and booking-management functionality — replaced by a
  clear "subscribe to continue" state, not a degraded dashboard. Their
  public profile page stays reachable to guests regardless, but new
  bookings are blocked with a clear message instead of completing.
- A paid subscription is activated by writing a paid-through date
  (`subscription_active_until`) via a manual/admin action once payment is
  arranged off-platform — there is no automated billing-processor
  integration yet, so this is never set on a schedule.

## Notifications

- A booking is considered successful the moment it's written to the
  database — notification delivery is a separate step and its failure
  must never roll back or invalidate the booking (see 05_Database.md,
  `notifications_log`).
- Reminder timing before an appointment: **open decision** — e.g., 24
  hours and/or 2 hours before. Decide before Phase 6.

## Reviews

(See 02_PRD.md Section 14 and 08_Roadmap.md Phase 9.)

- Only the guest who made a specific booking can review it, via the same
  private booking-token link used for self-service cancel/reschedule.
- A review can only be submitted once the appointment's time has passed
  (there's no "completed" status transition anywhere in the app — this
  is a straight comparison against `end_at`, not a status check) and only
  if the appointment was never cancelled.
- One review per appointment, enforced at the database level (a unique
  constraint on `appointment_id`, not just an application check).
- Reviews can never be edited after submission — there is no update path
  in the app, only insert.
- Reviews are collected and publicly displayed for every paying
  specialist — not gated by commitment length.
- Specialists can view every review from their dashboard, regardless of
  commitment length, but can never delete or hide one. This is
  deliberate: a review system a specialist can curate isn't trustworthy
  to guests.
- The public profile shows the guest as a first name (or "Anonymous") —
  never phone or full name. The specialist's own dashboard view shows the
  full guest name, since they already have full access to that guest's
  details elsewhere (Clients/Appointments).

## Language Rules

- A specialist's dashboard language is independent from a guest's booking
  language — each is stored/detected separately (see 02_PRD.md Section 2).
- No user-facing copy may be hardcoded in a single language anywhere in
  the codebase.

## Items Requiring a Decision Before Relevant Build Phase

Flagging these explicitly so they don't get decided by default/accident
inside the code:

1. Grace period after a specialist deletes their account? (Before Phase 2)
2. Reminder timing (24h / 2h / both)? (Before Phase 6)

**Resolved:**
- ~~How far in advance can a guest book?~~ → No limit; earliest available
  slot is always shown (see Booking Rules above).
- ~~Can guests self-cancel/reschedule via a link?~~ → Yes, via a private
  booking-token link included in every confirmation (see Cancellation &
  Rescheduling above).
- ~~Minimum notice window before appointment start?~~ → 30 minutes (see
  `MINIMUM_NOTICE_MINUTES` in `src/lib/booking/availability.ts`). Candidate
  slot start times are generated on a 15-minute grid
  (`SLOT_GRANULARITY_MINUTES`) within working hours, regardless of a given
  service's own duration — not specified elsewhere, documented here as the
  Phase 4 implementation choice.
