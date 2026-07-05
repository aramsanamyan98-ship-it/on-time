# 02 — Product Requirements Document (PRD)

Status: v1 scope only. Anything not listed here is explicitly out of scope
until this document is updated.

## 1. Product Structure (three surfaces)

| Surface | Domain | Built With | Purpose |
|---|---|---|---|
| Marketing site | `ontime.am` | Webflow | SEO, pricing, sign-up funnel |
| App (specialist dashboard) | `app.ontime.am` | Next.js | Where specialists manage their business |
| Public booking pages | `book.ontime.am/[slug]` | Next.js (same app, public routes) | Where guests book appointments |

The marketing site and the app are **fully separate codebases**. They share
no database. They are connected only by links (e.g. "Sign Up" on Webflow
links to `app.ontime.am/register`) and by consistent branding.

## 2. Languages

All user-facing text (app, booking pages, and notification content) must
support Armenian, Russian, and English from v1. Language is:
- Auto-detected from browser locale on first visit where possible
- Manually switchable via a language toggle, always visible
- Stored per specialist (their dashboard language) and per booking (the
  guest's language, remembered via a cookie/local choice)

Do not hardcode any user-facing string. All copy goes through a translation
key system from day one — retrofitting this later is expensive.

## 3. Authentication (Specialist side only)

- Register (email + password)
- Email verification required before dashboard access
- Login
- Forgot password / reset flow
- No customer-facing login in v1 (see Section 8)

## 4. Specialist Profile

Specialist can set:
- Business/display name
- Profile photo / logo
- Cover image
- Bio / short description
- Phone number (public, for guests who prefer calling)
- Address (optional — some work from home)
- Working hours (per day of week, with support for days off)
- Time zone (default Armenia, but store explicitly — don't assume)
- Instagram / social links (optional)
- Public slug (auto-generated from name, editable once)

## 5. Services

Each specialist defines their own service list. Each service has:
- Name
- Duration (in minutes)
- Price (AMD)
- Description (optional)
- Active/inactive toggle (inactive services don't show on booking page but
  keep history intact)

No shared/global service catalog in v1 — each specialist's list is fully
their own.

## 6. Calendar (Specialist Side)

- Day, week, and month views
- Manual appointment creation (for phone/walk-in bookings the specialist
  wants to log themselves)
- Move / reschedule an appointment
- Cancel an appointment
- Block off unavailable time (e.g. lunch, personal time) without deleting
  working hours
- **Hard rule: no double bookings.** Two appointments must never overlap for
  the same specialist. This must be enforced at the database level (see
  05_Database.md), not just in the UI.

## 7. Public Booking Page (`book.ontime.am/[slug]`)

Guest flow, in order:
1. Guest lands on specialist's public page — sees photo, bio, portfolio
   images, services, working hours
2. Guest selects a service
3. Guest selects an available date
4. Guest selects an available time slot (only real, non-conflicting slots
   are shown — never an already-booked slot)
5. Guest enters name and phone number (email optional)
6. Guest confirms
7. Guest sees on-screen confirmation
8. Guest receives confirmation via their chosen channel (see Section 9),
   including a private link to manage (cancel/reschedule) that specific
   booking without needing an account (see Section 8a)
9. Specialist's calendar updates immediately and specialist is notified

No account creation required at any point in this flow (see Section 8).

## 8. Customer Accounts — v1 Decision

**Guest-only booking for v1.** No customer registration, login, or saved
history in v1. The system should still store customer name/phone/email
against each booking (for the specialist's own client records — see
Section 10), but the *guest* does not need to log in to create, view, or
manage that data.

Design the database so that customer accounts can be added later without a
schema rewrite (see 05_Database.md) — but do not build the login/account UI
now.

### 8a. Guest Self-Service (Cancel / Reschedule)

Although guests don't have accounts, they can still manage their own
booking via a private, unguessable link included in their confirmation
message (see 05_Database.md `booking_token` and 04_User_Flows.md Flow 4b).
From that link a guest can:
- View their appointment details
- Cancel it
- Reschedule it to any other genuinely available slot

This must go through the exact same availability/double-booking logic as
a new booking (Section 6) — a reschedule is not a special case that
bypasses conflict checking.

## 9. Notifications

v1 scope:
- Booking confirmation sent to guest immediately after booking
- Reminder sent before the appointment
- New booking notification sent to specialist

Channel: start with email confirmations as the reliable baseline. Given the
target market's actual behavior (WhatsApp/Telegram usage is very high in
Armenia), evaluate adding WhatsApp/Telegram notification delivery as an
early v1.x addition — but do not block v1 launch on it. SMS is lower
priority than WhatsApp/Telegram for this market.

All notifications must be queued (not sent synchronously during the booking
request) and logged, so a failed send never blocks or corrupts the booking
itself. The booking is saved to the database first; notification delivery
is a separate, retryable step (see 10_Risks.md).

## 10. Customer Records (Specialist Side)

Specialist can see, per customer:
- Name, phone, email (as provided at booking)
- Appointment history with that specialist
- Manual notes field

This is not a full CRM in v1 — no tagging, segmentation, or marketing
tools yet. Just a client list and history.

## 11. Payments — v1 Decision

**In-shop payment only.** On-Time does not process any payment in v1. No
Idram/Telcell/card integration. Price is shown for informational purposes
only. This significantly simplifies v1 — no PCI/payment compliance surface
at all.

## 12. Deposits / Anti-No-Show — v1 Decision

**Not in v1.** No deposit collection, no charge-on-no-show. The only
anti-no-show mechanism in v1 is the reminder notification (Section 9).
Deposits are explicitly deferred to a future version and should not
influence v1 architecture beyond leaving room for it later.

## 13. Dashboard (Specialist Home Screen)

- Today's appointments
- Upcoming appointments (next 7 days)
- Quick actions: add appointment, block time, edit services

Revenue reporting and analytics are v1.x/v2, not launch-blocking.

## 14. Subscription / Billing Tiers

Per the original pricing model:

| Plan | Price | Includes |
|---|---|---|
| Basic (Free) | 0 | Profile page, booking link, limited bookings (~30/month), basic availability |
| Starter | 6,000 AMD/month | Unlimited bookings, notifications, calendar sync, basic analytics, reviews |
| Pro (later) | 12,000 AMD/month | Everything in Starter + CRM-lite, daily reports |

Trial logic:
- 30-day full access on signup
- +14 days if specialist reaches 10 bookings
- +7 days per 5 invited clients (referral)
- Push a subscription prompt once a specialist has received 5 bookings
  through the app

Billing itself (charging the specialist for Starter/Pro) is separate from
Section 11 (guest payments) — this is On-Time charging the specialist, not
the specialist charging their client. Payment method for this can be a
simple card/manual invoice process initially; it does not need to be
automated in the very first version if it slows launch.

## 15. Explicitly Out of Scope for v1

- Customer accounts/login
- Online payments or deposits
- Multi-location businesses
- Staff/employee management (single specialist per account in v1 — teams
  are a later phase)
- Marketplace search/discovery browsing (the public slug page exists, but
  a searchable directory of all specialists is a later phase)
- SMS notifications (evaluate WhatsApp/Telegram instead, per Section 9)
