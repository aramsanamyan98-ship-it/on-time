# 05 — Database

Target: PostgreSQL. This is a starting schema for v1 scope
(see 02_PRD.md). Field lists are not exhaustive — Claude Code should treat
this as the required minimum, not the ceiling.

## Design principles for this schema

1. **No double bookings, enforced at the database level** — not just
   checked in application code. Use a constraint (e.g., an exclusion
   constraint on specialist_id + time range, or a unique constraint on
   specialist_id + slot_start after slot-based booking) so that a race
   condition between two simultaneous requests cannot both succeed.
2. **Guest bookings store customer info directly on the appointment** —
   since there are no customer accounts in v1 (see 02_PRD.md Section 8),
   customer identity is captured per-booking, not via a foreign key to a
   `users` table. Structure this so a future `customers` table can be
   introduced later and backfilled, without breaking existing data.
3. **All timestamps stored in UTC**, with the specialist's timezone stored
   explicitly on their profile and used only for display/availability
   calculation — never assume a single timezone.
4. **Soft deletes** for specialists and appointments (a `deleted_at` /
   `is_active` flag) rather than hard deletes, so accidental deletion is
   recoverable and history isn't destroyed.

## Core Tables (v1)

### `specialists`
- id
- email (unique)
- password_hash
- email_verified_at
- display_name
- slug (unique, used in `book.ontime.am/[slug]`)
- profile_photo_url
- cover_photo_url
- bio
- phone
- address (nullable)
- timezone
- instagram_url (nullable)
- language_preference (am / ru / en)
- plan (basic / starter / pro)
- trial_ends_at
- created_at, updated_at, deleted_at

### `services`
- id
- specialist_id (FK → specialists)
- name
- duration_minutes
- price_amd
- description (nullable)
- is_active
- created_at, updated_at

### `working_hours`
- id
- specialist_id (FK)
- day_of_week
- start_time
- end_time
- is_day_off (boolean)

### `blocked_time`
- id
- specialist_id (FK)
- start_at, end_at (UTC)
- reason (nullable, private to specialist)

### `appointments`
- id
- specialist_id (FK)
- service_id (FK)
- start_at, end_at (UTC) — derived from service duration at booking time
- status (confirmed / cancelled / completed / no_show)
- guest_name
- guest_phone
- guest_email (nullable)
- guest_notes (nullable)
- source (guest_booking / manual_specialist_entry)
- booking_token (unique, securely random) — used to build the private
  "manage your booking" link sent in every guest confirmation, allowing
  self-service cancel/reschedule without an account (see
  07_Business_Rules.md). Must be long/random enough to not be guessable —
  do not derive it from sequential IDs or predictable data.
- created_at, updated_at

**Constraint requirement:** no two non-cancelled appointments for the same
`specialist_id` may have overlapping `start_at`/`end_at` ranges. This must
be enforced with a database-level constraint, not application logic alone.

**No advance-booking cap:** there is no maximum `start_at` distance from
now — slot availability is generated purely from working hours, existing
appointments, and blocked time, however far into the future that extends
(see 07_Business_Rules.md, Booking Rules).

### `portfolio_photos`
- id
- specialist_id (FK)
- image_url
- sort_order
- created_at

### `notifications_log`
- id
- appointment_id (FK)
- type (booking_confirmation / reminder / cancellation / new_booking_alert)
- channel (email / whatsapp / telegram / sms)
- recipient (email or phone)
- status (queued / sent / failed)
- attempted_at
- error_message (nullable)

This table exists specifically so a failed notification never blocks or
corrupts a booking, and so failures can be retried/audited (see
10_Risks.md).

### `referrals` (supports trial-extension logic)
- id
- specialist_id (FK — the referrer)
- referred_email or referred_phone
- status (invited / booked_first_appointment)
- created_at

## Tables Deferred to Later Versions (do not build in v1)

- `customers` (account-based customer history — v1 uses guest fields
  directly on `appointments` instead)
- `payments` / `deposits`
- `reviews`
- `employees` / `shops` (multi-staff, multi-location)
- `subscriptions_billing` (if billing is manual/off-platform initially,
  this can be a simple `plan` field on `specialists` for now)

## Open Question to Resolve Before Phase 4

Should a cancellable/reschedulable link be issued to guests at booking
time (e.g., a signed token in the confirmation email/message) so they can
manage their own booking without an account? If yes, this needs a
`booking_token` field on `appointments`. Decide before building the
booking engine — see 04_User_Flows.md, Flow 4.
