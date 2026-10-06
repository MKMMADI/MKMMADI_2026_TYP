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

- Test manager notification counts, low-stock alerts, booking changes, and
  message previews before implementing the page.
- Add a manager notifications page, top-bar unread count and message preview,
  and a direct “New booking” entry point.

**Acceptance tests:** frontend tests cover loading, unread counts, previews,
low-stock content, navigation, empty states, and API errors.

## Sprint 4 — Mobile notifications and refresh

- Test notification navigation and refresh behavior on employee and clerk
  mobile experiences.
- Show booking confirmations, message updates, and priority-driven schedule
  changes in a notification screen, with a badge on the notification icon.

**Acceptance tests:** mobile tests cover the notification screen, refresh
control, badge state, and booking/message notifications.

## Sprint 5 — Dark mode across frontends

- Add theme preference tests for persistence and applying the same preference
  across manager web and mobile screens.
- Provide an accessible theme control and verify the primary navigation,
  bookings, messages, notifications, and profile surfaces in both themes.

**Acceptance tests:** frontend tests verify persisted preference and theme
tokens/styles in representative screens; builds pass for each client.
