# 08 — Development Roadmap

Build order matters. Do not skip ahead to later phases — each phase
assumes the previous one is solid and tested.

## Phase 0 — Blueprint (this folder)

Documentation only. No code. Status: **in progress / this is it.**

## Phase 1 — Foundation

- Project setup (Next.js, TypeScript, Tailwind, PostgreSQL)
- Authentication: register, login, email verification, password reset
- Basic dashboard layout (empty states are fine)
- Settings page skeleton
- i18n framework wired up for Armenian/Russian/English from the start —
  do not add this later (see 02_PRD.md Section 2)

**Exit criteria:** a specialist can register, verify their email, log in,
and see an empty dashboard, in any of the three languages.

## Phase 2 — Specialist Profile

- Profile photo/cover upload
- Bio, phone, address, Instagram link
- Working hours setup
- Services: add/edit/deactivate

**Exit criteria:** a specialist can fully set up their profile and
services. No booking exists yet.

## Phase 3 — Public Profile Page

- `book.ontime.am/[slug]` renders the specialist's public profile
- Portfolio photo display
- Services and working hours displayed
- "Book" button present but not yet functional

**Exit criteria:** anyone with the link can view a specialist's public
page, in their preferred language, on mobile.

## Phase 4 — Booking Engine (hardest phase — budget the most time/testing)

- Available slot calculation (working hours + existing appointments +
  blocked time + service duration)
- Guest booking flow end to end
- Double-booking prevention at the database level
- Cancellation / rescheduling (specialist-initiated at minimum)
- Resolve open business rules first (see 07_Business_Rules.md items 1–3)

**Exit criteria:** a guest can book a real appointment, it appears
correctly on the specialist's calendar, and a second guest cannot book the
same slot.

## Phase 5 — Specialist Dashboard Depth

- Today's/upcoming appointments view
- Manual appointment entry (walk-ins/phone bookings)
- Client list with history and notes

**Exit criteria:** a specialist can run their entire daily schedule from
the dashboard without needing any other tool.

## Phase 6 — Notifications

- Booking confirmation (email baseline)
- Reminder before appointment
- Evaluate WhatsApp/Telegram delivery given target market behavior (see
  02_PRD.md Section 9)
- Notification queue + logging (never blocks a booking on failure)

**Exit criteria:** guests reliably receive a confirmation and a reminder;
failures are logged and retryable, not silent.

## Phase 7 — Trial & Subscription Logic (COMPLETED, needed several
follow-up updates — see below)

- Flat, fixed-length trial countdown (no extensions)
- Plan/subscription display with commitment-length pricing
- A single trial-active-or-subscription-active access gate per
  02_PRD.md Section 14 — no tiered feature gating of any kind

**Exit criteria:** trial mechanics work automatically without manual
intervention.

Phase 7 was originally built against the old booking-count-based trial
model (30 days + booking/referral extensions, ~30 bookings/month Basic
cap). This has since been revised several times — see 02_PRD.md
Section 14 (Final). **The current (final) model has a single plan: every
paying specialist gets identical features, and price varies only by
commitment length (monthly / 3 / 6 / 12 months). There is no tiered plan
name (Basic/Starter/Pro) anywhere, and no referral-based trial
extension.** Follow-up work, in order:

1. ~~Update trial logic from 30-day + booking-extension model to a flat
   3-month trial (referral extensions stay, booking-count extensions
   removed).~~ Done.
2. ~~Update Basic plan enforcement: remove the ~30 booking/month cap; add
   a 5-photo portfolio cap instead.~~ Done.
3. ~~Add feature gating for reminder notifications (Basic = confirmation
   only, Starter+ = full reminders).~~ Done — gated in
   src/lib/notifications/queue.ts via the same hasFullAccess boundary
   used everywhere else (plan !== "basic", or an active trial).
4. ~~Add commitment-length pricing (monthly / 3-month / 12-month) to the
   plan/subscription page.~~ Superseded at the time by a flat
   per-tier monthly price (see item 6) — then reinstated for good in
   item 7 below, now as the single plan's only price variable.
5. ~~Do NOT enable real billing/payment collection for Starter until
   Reviews is either built or removed from the advertised feature
   list.~~ Resolved — Reviews is now built (Phase 9 below) and part of
   the baseline feature set.
6. ~~Finalize tier naming and structure: collapse Basic/Starter/Pro into
   two paid tiers, Starter and Pro.~~ Done at the time — see item 7
   below for the final collapse to a single plan. Basic was retired
   entirely (its former feature set — profile, unlimited bookings/
   photos, reminders, reviews, basic analytics — became the Starter
   baseline). The free trial granted full **Pro-level** access
   (previously Starter-level) — the only two Pro-exclusive features were
   client notes and full analytics (daily breakdown, repeat-client rate,
   rating trend). `hasFullAccess` in src/lib/subscription/trial.ts was
   renamed to `hasProAccess` to reflect this; reminders/reviews/basic
   analytics were no longer plan-gated at all since every paid plan got
   them.
7. ~~Collapse Starter/Pro into a single plan; replace tier-based feature
   gating with one `hasActiveAccess` check (trial-active OR
   subscription-active); replace flat per-tier monthly pricing with
   commitment-length pricing (monthly / 3 / 6 / 12 months, 2,900 → 2,030
   AMD/month, price only — no feature difference).~~ Done — see
   02_PRD.md Section 14 (Final). `plan` (the `Starter`/`Pro` enum),
   `referralCode`, and `referralExtensionsGranted` are dropped from the
   schema; `subscriptionCommitmentMonths` + `subscriptionActiveUntil`
   replace them. `hasProAccess` was renamed again, to `hasActiveAccess`.
8. ~~Remove the referral trial-extension mechanic (+7 days per 5
   referrals) and everything that only existed to support it — the
   `referrals` table, the referral link/invite-by-email UI, the `?ref=`
   query param through the booking flow.~~ Done — the trial is now a
   flat, non-extendable 3 months with no growth mechanic attached to it.
9. ~~Block the dashboard and booking-management entirely once the trial
   ends with no active subscription (previously a specialist just read
   at Starter-level access forever, never locked out).~~ Done — a clear
   "subscribe to continue" state replaces the dashboard; the public
   profile page stays reachable to guests regardless, but attempting to
   book shows a message instead of completing.

## Phase 8 — Marketing Site Connection

- Webflow site live on `ontime.am`
- Sign-up/CTA buttons correctly linking to `app.ontime.am/register`
- Consistent branding between Webflow and app (see 09_Brand_Guidelines.md)

## Phase 9 — Reviews (COMPLETED)

- `Review` model: one per completed appointment, guest-authored, 1–5
  star rating + optional comment, never editable after submission (see
  prisma/schema.prisma, src/lib/reviews)
- Guest submission via the existing booking-token page
  (`/booking/[token]`), enabled once the appointment's `endAt` has
  passed and it wasn't cancelled — plus a proactive "how was your
  appointment?" email pointing at that same link
  (`review_request` notification type)
- Public profile (`book/[slug]`): average rating near the top, full
  review list below the portfolio/services section — shown for every
  paying specialist (02_PRD.md Section 14), not gated by commitment
  length
- Dashboard: specialists can view every review (average + full list,
  with full guest name for context), with no delete/hide action
  anywhere — reviews can't be edited or removed once submitted, by
  design, to keep the system trustworthy
- Public-page reviewer identity is reduced to first name/"Anonymous" —
  never phone or full name

**Exit criteria:** a guest can leave one review per completed
appointment; it shows up correctly (right average, right list) on the
specialist's public profile, and is visible to the specialist on their
dashboard.

## Later / Explicitly Deferred (v2+)

- Customer accounts and login
- Online payments and deposits
- Marketplace search/discovery (browsing all specialists, not just direct
  links)
- Multi-staff/multi-location support
- CRM-lite / advanced analytics beyond what's already built
- SMS notifications (if WhatsApp/Telegram prove sufficient)

### New item — Pricing page comparison table

Once ready to build the public pricing page (part of Phase 8 / Webflow,
or an in-app page), include a direct feature/price comparison against
InQ, per the marketing note in 02_PRD.md Section 14. This was identified
as a legitimate, honest differentiator worth stating plainly rather than
a hidden competitive angle.

## Working Principle Throughout

Before asking Claude Code to build a feature, check: is it in this
roadmap's current phase, and does 02_PRD.md / 07_Business_Rules.md fully
specify it? If not, resolve the open question first rather than letting
the AI or a developer guess.
