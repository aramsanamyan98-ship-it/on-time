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

## 14. Subscription / Billing Tiers (Updated)

### Rationale for this update

The original model gated the free tier by booking volume (~30
bookings/month) and extended trials by booking count. In practice, the
real adoption risk for a new specialist isn't booking volume — it's
behavior change (getting clients to actually use the link instead of
calling/DMing). A volume cap can penalize a slow-starting specialist at
exactly the moment they need patience most. This update replaces the
booking-count model with a flat time-based trial and feature-based tier
gating instead — simpler to explain, and fairer to specialists who are
still promoting their link.

This also supersedes an earlier revision of this section that kept
Basic as a permanent free tier with commitment-length (monthly/3-month/
12-month) discount pricing on Starter/Pro. That approach is dropped:
**there is no free tier once the trial ends, and billing is monthly
only across all three paid plans** — see below.

This update was also informed by direct competitive analysis of InQ
(inq.am), the main local competitor — see 09_Brand_Guidelines.md's
"Naming & Positioning Notes" for the fuller comparison. Key takeaway
driving this pricing structure: InQ caps portfolio photos even on its
paid tiers (5/10/15/30 images depending on plan). On-Time should not
replicate this — uncapped photos on Starter/Pro is a deliberate,
statable differentiator.

### Free Trial (all new specialists)

- **3 months, flat, automatic, no card required** — replaces the old
  30-day + booking-based extension model.
- Full Starter-tier feature access during the trial.
- Referral extensions still apply on top of the trial: **+7 days for
  every 5 successful referrals** (unchanged from the original model —
  this still rewards active promotion during the trial period).
- No in-app upgrade paywall/prompt during the trial — let specialists
  use the full feature set to actually experience the product's value
  before being asked to pay.

### After the trial ends: no free tier — three paid plans, monthly billing only

Every specialist moves to one of the three plans below once their trial
ends. There is no permanent free option; all three are billed monthly
(no commitment-length discounts).

### Basic — 4,000 AMD/month

- Public profile page (`book.ontime.am/[slug]`)
- **Portfolio: limited to 5 photos**
- **Unlimited bookings** (no volume cap — this was the old model's
  restriction; removed)
- Booking confirmation notification only — **no reminder
  notifications**
- Dashboard: today's/upcoming appointments, manual appointment entry
- Client list (basic — appointment history visible, but **no notes
  field**)
- No analytics/reports
- No reviews shown on the public profile (guests can still leave one via
  the specialist's booking-token link — see "Reviews" note below — it's
  just not displayed until the specialist is on Starter or above)

### Starter — 6,000 AMD/month

Everything in Basic, plus:
- **Unlimited portfolio photos** (explicit differentiator vs. InQ's
  capped tiers)
- Full reminder notifications (booking confirmation + pre-appointment
  reminder)
- Client notes field
- Basic analytics (booking counts over time)
- Guest reviews displayed on the public profile (average rating +
  individual reviews — see "Reviews" note below)

### Pro — 12,000 AMD/month

Everything in Starter, plus:
- Daily reports and statistics
- Deeper client management (CRM-lite, per original PRD intent)
- (Future, once built) WhatsApp/Telegram notification delivery may be
  positioned as a Pro-tier feature if not made universal — decide at
  implementation time

### Reviews (08_Roadmap.md Phase 9)

Built: a guest who booked an appointment can leave a one-time,
non-editable 1–5 star rating + optional comment once the appointment's
time has passed, via the same private booking-token link used for
self-service cancel/reschedule (also sent proactively as a "how was
your appointment?" email once it's over). One review per appointment.

Reviews are collected regardless of the specialist's plan — a Basic
specialist still accumulates reviews, they just aren't shown on their
public profile until they're on Starter or above; this is a deliberate
upgrade incentive (their reviews are already visible to *them* on the
dashboard the moment they upgrade, nothing has to backfill). Specialists
can view every review from their dashboard but can never delete or hide
one — this is what makes the review system trustworthy.

The public profile shows an average rating prominently near the top and
the full list of individual reviews below the portfolio/services
section. Reviewer identity is reduced to a first name (or "Anonymous")
on the public page — never phone or full name — even though the
specialist's own dashboard view shows the full guest name for context
(they already have that guest's full details via Clients/Appointments).

### Marketing/positioning note (for landing page and pricing page copy)

This structure supports a direct, honest competitive claim against InQ:
On-Time's Starter tier (6,000 AMD) sits between InQ's Individual (3,000
AMD) and Basic (6,800 AMD) tiers, while including unlimited bookings,
unlimited photos, and full notifications — features InQ gates behind
its two most expensive tiers (12,200–15,500 AMD). This comparison can
be stated plainly on a pricing page once built: "More than InQ's
cheapest plan. Less than InQ's mid-tier plan. No caps on your growth,
either way."

Billing itself (charging the specialist for Basic/Starter/Pro) is separate
from Section 11 (guest payments) — this is On-Time charging the specialist,
not the specialist charging their client. Payment method for this can be a
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
