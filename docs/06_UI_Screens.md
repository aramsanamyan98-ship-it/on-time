# 06 — UI Screens

This lists required screens for v1. Visual styling must follow
09_Brand_Guidelines.md. All screens must support Armenian, Russian, and
English (see 02_PRD.md Section 2).

## App (`app.ontime.am`) — Specialist-Facing

1. **Register** — email, password
2. **Email verification pending / confirmed**
3. **Login**
4. **Forgot password / reset password**
5. **Onboarding wizard** (see 04_User_Flows.md Flow 1):
   - Profile photo upload
   - First service entry
   - Working hours setup
   - "Here's your link" confirmation screen
6. **Dashboard (home)** — today's appointments, upcoming appointments,
   profile-completion progress, quick actions
7. **Calendar** — day / week / month toggle, create/edit/cancel/reschedule
   appointment, block time
8. **Services** — list, add, edit, activate/deactivate
9. **Profile settings** — photo, cover image, bio, phone, address, working
   hours, Instagram link, language preference
10. **Portfolio** — photo upload/reorder/delete
11. **Clients** — list of guests who've booked, with history and notes
    (see 02_PRD.md Section 10)
12. **Subscription / plan** — current plan, trial status, upgrade options

## Public Booking Page (`book.ontime.am/[slug]`) — Guest-Facing

1. **Specialist profile view** — photo, bio, portfolio grid, service list,
   working hours, "Book" button
2. **Service selection**
3. **Date + time selection** — only real available slots shown
4. **Guest details form** — name, phone, email (optional)
5. **Confirmation screen** — appointment summary, "add to calendar" option
   if feasible
6. **(If booking token implemented) Manage booking** — view/cancel via a
   link from the confirmation message

## Screen-Level Requirements That Apply Everywhere

- Mobile-first — most specialists and virtually all guests will be on
  phones
- Loading and empty states designed intentionally (e.g., "No appointments
  today" should feel calm, not broken)
- Every destructive action (cancel appointment, delete photo, deactivate
  service) requires a confirmation step
- Language toggle accessible from every screen, not buried in settings
  only

## Explicitly Not Needed in v1

- Employee/staff management screens
- Payment/checkout screens
- Customer login/account screens
- Marketplace search/browse screen (specialist pages are only reached via
  direct link/slug in v1, not discovered through an on-platform search —
  see 02_PRD.md Section 15)
