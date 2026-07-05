# 10 — Risks & Production Checklist

Classify every risk as: **Must solve before launch**, **Can solve after
first customers**, or **Future improvement**. Update this list whenever a
new risk is identified — don't let it live only in someone's memory.

## Must Solve Before Launch

| Risk | Mitigation |
|---|---|
| Double bookings | Database-level constraint preventing overlapping appointments per specialist (see 05_Database.md) |
| Database loss | Automatic daily backups, point-in-time recovery |
| Client books but specialist doesn't receive it | Booking saved to DB first; notification is a separate, retryable step (see `notifications_log`) |
| Specialist can't log in / register | Mature auth provider, email verification, monitored login failures |
| Leaked user data | Encrypted passwords, HTTPS everywhere, minimal stored personal data, restricted DB access |
| Cancelled booking still visible/bookable | Booking status kept in sync; calendar and available slots update immediately on any change |
| Calendar shows incorrect schedule | Automated tests for slot-generation logic; explicit timezone handling (see 05_Database.md) |
| Booking spam | Rate limiting on the public booking endpoint; consider lightweight bot protection |

## High Priority — Solve Early, Not Necessarily Day One

| Risk | Mitigation |
|---|---|
| No-shows | Reminder notifications (v1). Deposits deferred to v2 (see 02_PRD.md Section 12) |
| Notifications sent wrong/late | Queue with logged send attempts, UTC storage, retries on failure |
| Specialist account hacked | Strong password hashing, rate limiting on login, consider 2FA later |
| App crashes under heavy traffic | Cloud hosting with scaling (Vercel), basic load testing before any marketing push |
| Fake accounts | Email verification at minimum; phone verification if fake signups become a real problem |

## Medium Priority / Can Solve After First Customers

| Risk | Mitigation |
|---|---|
| Specialist deletes account, leaves clients with no notice | Soft delete + grace period + guest notification (open decision, see 07_Business_Rules.md) |
| Duplicate payments (once payments exist in a later version) | Idempotent payment requests, disable double-submit on the client |
| Browser refresh during booking creates duplicates | Idempotency key on the booking request |
| Third-party notification service outage | Queue + retry; don't let it block core booking function |
| Expired sessions losing in-progress work | Save draft state where reasonably easy to do |

## Additional Risks Identified (beyond original list)

- **Time zone handling** if a specialist or guest travels — store
  everything in UTC, display in the specialist's stated timezone (see
  05_Database.md)
- **Daylight Saving Time shifts** — Armenia does not currently observe DST,
  but do not hardcode this assumption if any expansion beyond Armenia is
  ever considered
- **Language mismatch** — a guest booking in Russian and a specialist
  reading their dashboard in Armenian must both see correct, complete
  translations, not a partially-translated UI

## Founder-Level Decisions (not solvable by code alone)

These require an explicit decision from the founder before the relevant
build phase — Claude Code should not infer an answer to these:

- Should guests be able to cancel/reschedule without an account? (see
  07_Business_Rules.md item 3)
- How many days in advance can a guest book? (item 1)
- Minimum notice window before an appointment? (item 2)
- Grace period after account deletion? (item 4)
- Reminder timing? (item 5)

## Working Principle

Most of these risks do not need to be solved on day one — only the "Must
Solve Before Launch" table is launch-blocking. Everything else can be
addressed once real specialists are using the product and the risk is
either observed in practice or clearly imminent. Do not delay launch by
solving problems that haven't happened yet.
