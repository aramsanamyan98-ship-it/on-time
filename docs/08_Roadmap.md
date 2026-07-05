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

## Phase 7 — Trial & Subscription Logic

- Trial countdown, extension logic (bookings + referrals)
- Plan display and upgrade prompts
- Basic/Starter/Pro gating of features per 02_PRD.md Section 14

**Exit criteria:** trial mechanics work automatically without manual
intervention.

## Phase 8 — Marketing Site Connection

- Webflow site live on `ontime.am`
- Sign-up/CTA buttons correctly linking to `app.ontime.am/register`
- Consistent branding between Webflow and app (see 09_Brand_Guidelines.md)

## Later / Explicitly Deferred (v2+)

- Customer accounts and login
- Online payments and deposits
- Marketplace search/discovery (browsing all specialists, not just direct
  links)
- Multi-staff/multi-location support
- Reviews
- CRM-lite / advanced analytics (Pro plan features)
- SMS notifications (if WhatsApp/Telegram prove sufficient)

## Working Principle Throughout

Before asking Claude Code to build a feature, check: is it in this
roadmap's current phase, and does 02_PRD.md / 07_Business_Rules.md fully
specify it? If not, resolve the open question first rather than letting
the AI or a developer guess.
