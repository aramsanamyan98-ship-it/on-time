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

## Phase 7 — Trial & Subscription Logic (COMPLETED, needed a follow-up
update — see below)

- Trial countdown, extension logic (bookings + referrals)
- Plan display and upgrade prompts
- Basic/Starter/Pro gating of features per 02_PRD.md Section 14

**Exit criteria:** trial mechanics work automatically without manual
intervention.

Phase 7 was originally built against the old booking-count-based trial
model (30 days + booking/referral extensions, ~30 bookings/month Basic
cap). This has since been revised twice — see 02_PRD.md Section 14
(updated). The current (final) model drops the permanent free Basic tier
and the commitment-length discount pricing that a prior revision had
added: **Basic is now a paid tier (4,000 AMD/month), and all three plans
bill monthly only.** Follow-up work:

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
   plan/subscription page.~~ Superseded: the final model removed
   commitment-length pricing entirely in favor of a single monthly price
   per tier (Basic/Starter/Pro), shown side by side on the Plan page.
5. ~~Do NOT enable real billing/payment collection for Starter until
   Reviews is either built or removed from the advertised feature
   list.~~ Resolved — Reviews is now built (Phase 9 below) and back in
   the Starter feature list.

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
  review list below the portfolio/services section — Starter tier and
  above only (02_PRD.md Section 14); Basic still collects reviews, they
  just aren't displayed publicly yet
- Dashboard: specialists can view every review (average + full list,
  with full guest name for context) on any plan, with no delete/hide
  action anywhere — reviews can't be edited or removed once submitted,
  by design, to keep the system trustworthy
- Public-page reviewer identity is reduced to first name/"Anonymous" —
  never phone or full name

**Exit criteria:** a guest can leave one review per completed
appointment; it shows up correctly (right average, right list) on a
Starter+ specialist's public profile, and is visible to the specialist
on their dashboard regardless of plan.

## Later / Explicitly Deferred (v2+)

- Customer accounts and login
- Online payments and deposits
- Marketplace search/discovery (browsing all specialists, not just direct
  links)
- Multi-staff/multi-location support
- CRM-lite / advanced analytics (Pro plan features)
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
