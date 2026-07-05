# 04 — User Flows

## Flow 1: Specialist Onboarding

1. Specialist visits `ontime.am` (Webflow), clicks "Sign Up"
2. Redirected to `app.ontime.am/register`
3. Enters email + password
4. Verification email sent → specialist confirms email
5. Redirected into a guided setup:
   - Upload profile photo
   - Add first service (name, duration, price)
   - Set working hours
   - (Optional at this stage) upload portfolio photos
6. Specialist receives their public link: `book.ontime.am/[slug]`
7. Dashboard shown, with a profile-completion progress indicator
   encouraging remaining steps (portfolio photos, more services, etc.)

**Design note:** every step after email verification should be skippable.
A specialist should be able to reach "I have a working booking link" in
under 5 minutes, then fill in the rest later.

## Flow 2: Guest Booking (public, no account)

1. Guest opens `book.ontime.am/[slug]` (from Instagram bio, WhatsApp share,
   or a QR code)
2. Sees: photo, name, bio, portfolio images, service list, working hours
3. Taps "Book"
4. Selects a service
5. Selects a date (calendar shows only days the specialist works)
6. Selects a time (only genuinely open slots are shown — never a slot that
   would double-book)
7. Enters name and phone number (email optional)
8. Confirms booking
9. Sees on-screen confirmation with appointment details
10. Receives confirmation via email (and WhatsApp/Telegram if that channel
    is enabled — see 02_PRD.md Section 9)
11. Receives a reminder before the appointment

**Failure/edge handling required:**
- If two guests attempt to book the same slot near-simultaneously, the
  second one must be told the slot is no longer available and prompted to
  pick another — this cannot silently create a double booking (see
  05_Database.md for the enforcement mechanism)
- If the guest closes the tab mid-booking, no partial/broken appointment
  should be created
- If notification delivery fails, the booking itself must still stand —
  the specialist's calendar is the source of truth, not the notification

## Flow 3: Specialist Manages Their Day

1. Specialist logs into `app.ontime.am`
2. Dashboard shows today's appointments first
3. Specialist can:
   - Mark an appointment as completed / no-show (for their own records —
     no automated penalty in v1, see 02_PRD.md Section 12)
   - Manually add a walk-in or phone booking
   - Reschedule or cancel an existing appointment
   - Block off time (e.g., lunch, a personal errand)
4. Any change updates the guest-facing available slots immediately

## Flow 4: Reschedule / Cancel — Specialist-Initiated

1. Specialist opens an existing appointment from the calendar
2. Selects "Reschedule" or "Cancel"
3. If reschedule: specialist picks a new available slot; guest receives an
   updated notification
4. If cancel: guest receives a cancellation notification; the slot becomes
   available again immediately

## Flow 4b: Reschedule / Cancel — Guest-Initiated (self-service)

1. Guest's confirmation message (email/WhatsApp/Telegram) includes a
   private "manage your booking" link built from the appointment's
   `booking_token` (see 05_Database.md)
2. Guest opens the link — no login required
3. Guest sees their appointment details and two options: "Cancel" or
   "Reschedule"
4. If reschedule: guest is shown the specialist's real available slots
   (same slot-generation logic as the original booking flow — earliest
   available slot shown first, no advance-booking limit) and picks a new
   one
5. If cancel: guest confirms the cancellation
6. Either way, the specialist is notified immediately, and the calendar
   updates in real time
7. Once cancelled, the `booking_token` link should no longer allow further
   changes (show an "already cancelled" state, not an error)

## Flow 5: Trial → Paid Conversion

1. Specialist starts on 30-day full trial automatically at signup
2. System tracks bookings received and referrals sent
3. At 10 bookings: trial extended +14 days (once)
4. At every 5 successful referrals: trial extended +7 days
5. At 5 bookings received: in-app prompt introduces paid plans
   (non-blocking — informational, not a paywall yet)
6. At trial expiry: specialist is moved to Basic (Free) plan automatically
   — never locked out entirely — with an upgrade prompt to Starter/Pro
