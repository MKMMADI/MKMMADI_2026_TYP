# Test-driven delivery sprints

Each sprint starts with focused failing tests, then implements the smallest
complete behavior needed to make those tests pass. Run the relevant API or
frontend suite before moving on to the next sprint.

## Sprint 1 — Employee identity and booking-user profiles

**Status: complete**

- Keep account permissions (`EMPLOYEE`, `CLERK`, `MANAGER`) separate from an
  employee's optional high-ranking official title.
- Add a unique generated `EMP-ID-` identifier to every user. Its random suffix
  is 1–9 uppercase alphanumeric characters.
- Include employee ID, name, department, contact number, and official title in
  profiles and booking employee summaries. Users cannot assign themselves an
  official title through profile updates.
- Seed at least 50 employees (including all nine official titles) and 20 clerks.

**Acceptance tests:** profile integration tests verify employee ID format and
uniqueness, department/contact fields, the null default official title, and
that self-promotion is ignored. Profile-controller tests and manager booking
UI tests cover profile fields and booking-user details. Seed output reports
role counts. Apply the schema migration and run the integration tests after
the local migration history has been reconciled. The schema migration has now
been applied to the development and test databases, and the focused tests pass.

## Sprint 2 — Priority booking and displaced-booking recovery

- **Status: complete**
- Add API tests for ordinary conflicts, official overrides, official-to-official
  conflicts, and alternative-time proposals.
- Allow bookings by employees and managers; official bookings confirm
  immediately.
- When an official booking overrides lower-priority bookings, preserve the
  displaced booking and propose a future available time of equal duration.
- Let the displaced booker accept the proposal or choose another available
  start date/time from their mobile bookings list; notify them through their
  authenticated Socket.IO user room.
- Exclude displaced reservations from room occupancy and availability reports.

**Acceptance tests:** API tests prove lower-priority bookings stop blocking the
room, official bookings do not silently displace peers, and only the owner can
accept or reschedule an offer. Realtime tests verify the displaced owner gets
the update; mobile tests verify both response choices. API, mobile, manager-web,
and production-build checks pass.

## Sprint 3 — Manager booking and notification center

- **Status: complete**
- Test manager notification counts, low-stock alerts, booking changes, and
  message previews before implementing the page.
- Add a manager notifications page combining pending/reschedule-required
  bookings, low-stock consumables, and unread conversations.
- Add a top-bar count and message preview, with refresh on focus and once per
  minute, plus direct navigation to notifications and “New booking”.
- Add a manager booking form for purpose, time, capacity, room, and optional
  amenities; report API validation and availability errors to the manager.

**Acceptance tests:** frontend tests cover loading, unread counts, previews,
low-stock content, navigation, empty states, and API errors.

## Sprint 4 — Mobile notifications and refresh

- **Status: complete**
- Test notification navigation and refresh behavior on employee and clerk
  mobile experiences.
- Add employee and clerk Notifications tabs with a badge derived from the
  signed-in user's confirmed/displaced bookings and unread conversations.
- Refresh the feed on tab focus, pull-to-refresh, and authenticated realtime
  booking/message events; refresh the badge when the app resumes and once per
  minute.
- Emit a realtime booking update to an owner when a manager approves their
  booking; continue using the displacement event for priority-driven changes.

**Acceptance tests:** mobile tests cover the notification screen, refresh
control, badge state, and booking/message notifications.

## Sprint 5 — Dark mode across frontends

- **Status: complete**
- Add accessible theme controls with persisted preferences: manager web uses
  `localStorage`, and mobile uses Expo SecureStore.
- Apply theme-aware colors to manager web and employee/clerk mobile navigation,
  bookings, messages, notifications, and profile surfaces.

**Acceptance tests:** manager theme tests (4) and mobile theme/navigation tests
pass; the mobile TypeScript check and manager production build pass. Browser
verification confirms the manager toggle applies the dark document palette and
persists its selection. The full mobile suite reports 29 passing tests and 2
failures in the pre-existing rescheduling tests, whose fixed date fixtures are
in the past; these failures are unrelated to theming.

## Manager UI refinement backlog — risk-first order

The next work is split into reviewable tasks and ordered from highest to lowest
implementation risk. Complete and review each task before moving to the next.

1. **Notification read-state contract — highest risk**
   - **Status: complete — decision:** omit Read/Unread tabs and “Mark all as
     read.” Keep notifications live-derived and actionable; retain category,
     search, and date filters.
   - No notification-read schema/API change is needed. Message unread counts
     may still be shown as message information, not as a read filter.
   - **Acceptance:** notification types, state model, and actions are agreed.

2. **Rebuild manager notifications from the supplied blueprint — high risk**
   - **Status: complete**
   - Adapt the blueprint's notification summary, search, category and date
     filters, categorized cards, timestamps, actions, and loading/error/empty
     states to bookings, low-stock consumables, and messages.
   - Per the approved task 1 decision, omit read-state tabs/actions and keep
     notifications live-derived and actionable.
   - Default the notification timestamp range to the previous seven days
     through today. Let managers open the exact booking selected from its
     notification in an in-place review modal, inspect its request and booker
     details, and approve or reject pending requests without losing their
     place in the notification feed.
   - **Acceptance:** tests cover filters, counts, card actions, loading/errors,
     empty results, absence of read-state controls, the default date window,
     and exact-booking modal actions. Manager can reach the correct booking,
     inventory, and message workflows. Nine notification tests pass and the
     production web build succeeds.

3. **Align manager page styling — medium risk**
   - **Status: complete**
   - Bring Notifications and New Booking typography, headings, summaries,
     spacing, cards, controls, and responsive behavior in line with the
     existing manager pages and shared navy/steel tokens.
   - Reuse the existing manager booking and operations page classes for
     notification headings/summaries and the new-booking header/form/controls;
     retain responsive rules for notification cards and filters.
   - **Acceptance:** focused page tests (8 passing) and production web build
     pass; page tests verify shared heading, summary, and form styling classes.

4. **Fix New Booking capacity-field overflow — low risk**
   - **Status: complete**
   - Correct the form grid and field sizing so Capacity and other controls stay
     inside the card at desktop, tablet, and mobile widths.
   - Style the All bookings link, field labels/inputs, and rounded Rooms and
     Amenities groups to match the manager palette and typography.
   - Use a constrained three-column desktop grid, two-column tablet layout,
     and single-column mobile layout; size controls within their grid cells.
   - **Acceptance:** focused New Booking tests (2 passing) verify page
     structure/styling hooks and submission; browser measurements at 1440px,
     1024px, 768px, and 375px confirmed the form, grid row, and document have
     no horizontal overflow. The production web build passes.

5. **Complete cross-frontend dark mode — complete**
   - Add an accessible persisted theme preference spanning manager web and
     mobile screens, including bookings, messages, notifications, and profile.
   - **Acceptance:** focused theme tests, mobile type-check, and manager
     production build pass. The manager toggle was also verified in-browser.
     The full mobile suite has 2 unrelated failures in past-date rescheduling
     fixtures (29 passing, 2 failing).
