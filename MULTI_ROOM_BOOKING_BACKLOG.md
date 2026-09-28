# Multi-room booking backlog

## Current baseline

The following work is already implemented and should be treated as the starting point:

- `POST /api/v1/bookings` accepts `roomIds: number[]`.
- One booking can create multiple `BookingRoom` records.
- Selected-room conflicts are checked inside the booking transaction.
- Combined room capacity is validated.
- The employee home screen can select multiple rooms.
- The booking screen submits `roomIds` and combined capacity.
- Booking controller tests and booking route integration tests pass in focused runs.
- API and mobile TypeScript checks pass.

## Sprint 1: Finish API validation rules

**Goal:** make the multi-room contract explicit and robust.

- [x] Decide whether duplicate room IDs should be rejected or silently deduplicated; document the decision.
- [x] Add explicit validation for non-array `roomIds`, invalid IDs, and an empty array.
- [x] Validate capacity is a positive number.
- [x] Validate the requested amenity IDs are supported by every selected room.
- [x] Return room-specific availability and capacity errors where possible.
- [x] Confirm a failed multi-room request leaves no booking or `BookingRoom` records through the transaction boundary.
- [x] Add API request examples using `roomIds`.

**Definition of done:** every invalid multi-room request returns a predictable `400` response and cannot create partial data.

## Sprint 2: Complete API and controller test coverage

**Goal:** prove the new contract and protect existing role workflows.

- [x] Update controller tests for the `roomIds` payload.
- [x] Add controller coverage for duplicate IDs.
- [x] Add controller coverage for invalid IDs and non-array input.
- [x] Add service/integration coverage for insufficient combined capacity.
- [x] Add integration coverage where one selected room conflicts while another is free.
- [x] Assert both `BookingRoom` records are persisted for a two-room booking.
- [x] Test missing amenities on one selected room.
- [x] Test multi-room approval and rejection by a manager.
- [x] Test multi-room preparation status transitions by a clerk.
- [x] Test employee, manager, and clerk authorization boundaries.

**Definition of done:** controller and route suites cover valid, invalid, conflict, authorization, and lifecycle cases for multi-room bookings.

## Sprint 3: Complete employee selection UX

**Goal:** make room selection clear and reversible.

- [x] Add frontend tests for selecting and deselecting rooms.
- [x] Keep the Continue action hidden or disabled when no room is selected.
- [x] Show selected-room count and combined capacity consistently on small screens.
- [x] Prevent selecting rooms already marked unavailable or operationally out of service.
- [x] Preserve room details and favorite actions while selection controls are visible.
- [x] Add a way to return from booking to room selection without losing the selection.

**Definition of done:** an employee can select, deselect, review, and retain one or more valid rooms on mobile.

## Sprint 4: Complete booking review and result screens

**Goal:** make the entire employee workflow multi-room aware.

- [x] Allow individual selected rooms to be removed on `BookingScreen`.
- [x] Show all selected rooms in the booking summary before submission.
- [x] Submit `roomIds` and attendee count consistently.
- [x] Update booking confirmation to list every selected room.
- [x] Update booking history to list every selected room.
- [x] Update booking detail to list every selected room and room status.
- [x] Surface room-specific API availability errors in the booking form.
- [x] Add loading, retry, and empty states for multi-room booking responses.

**Definition of done:** an employee can understand exactly which rooms were requested after submission, from confirmation through history and detail views.

## Sprint 5: Operations, documentation, and release verification

**Goal:** close the release-readiness gaps.

- [x] Verify manager approval/rejection applies to the parent booking containing multiple rooms.
- [x] Verify clerk preparation status exposes all rooms in the operational queue.
- [x] Update root, API, and mobile README examples from `roomId` to `roomIds` and define capacity as attendee count.
- [x] Run all API controller and route tests without relying only on focused suites.
- [x] Run API TypeScript compilation and mobile TypeScript compilation.
- [x] Test one room, multiple rooms, duplicate IDs, one conflicting room, insufficient capacity, and missing amenities.
- [x] Verify a failed conflicting multi-room request leaves no booking behind.
- [x] Remove the pg `client.query()` concurrent-query deprecation warning from booking status mutations.
- [ ] Diagnose and resolve the deferred Jest/DB open-handle warning.
- [x] Record the final API contract and acceptance criteria for assessment/demo use.

**Definition of done:** implementation, documentation, automated tests, and release checks all describe and verify the same multi-room behavior.

## Follow-on sprints

These sprints cover the clerk and manager workflow improvements and manager/employee messaging requested after the multi-room booking work. Items are planned, not yet implemented. Run the listed automated checks for each sprint and record manual results before marking its definition of done complete.

## Sprint 6: Clerk workflow visibility and room checklist

**Goal:** make sign-out easy to find and make each queue checklist reflect the actual amenities of its booked room.

- [x] Move or expose the Clerk app's Sign Out action in a persistently visible, clearly labelled location without removing the confirmation step.
- [x] Load the room's actual amenity list for each queued booking and show it with that room's checklist; do not infer requested room amenities from a generic booking-level list.
- [x] Keep checklist items distinct for each room when a booking contains multiple rooms.
- [x] Show loading, empty, and API-error/retry states for room amenity data; do not silently show a misleading generic checklist when room data fails.
- [x] Add or extend mobile tests for Clerk tab visibility and sign-out confirmation/action.
- [x] Add or extend mobile queue tests for actual room amenity rendering, multi-room separation, and loading/error/empty behavior.

**Tests to conduct:**

- Automated: `cd mobile-app && npm test -- --runInBand` and `cd mobile-app && npx tsc --noEmit`.
- Automated results: mobile tests pass (5 suites, 11 tests); mobile TypeScript check passes; API `npm run build` passes (15 suites, 235 tests).
- Manual on a clerk account: confirm Sign Out is visible from the normal Clerk workflow, cancel the confirmation without signing out, then confirm sign-out returns to authentication.
- Manual with seeded rooms that have different amenities: check one-room and multi-room queue entries; verify each room's checklist contains only its own amenities and remains readable on a narrow device.
- Manual/API failure: verify the queue displays a retryable error and never presents generic items as actual room amenities.

**Definition of done:** a clerk can reach sign-out from the normal workflow and reliably check the real amenity setup for every room in a queued booking.

**Status:** implementation and automated verification complete. Manual clerk-device checks above remain pending before the sprint can be declared fully verified.

## Sprint 7: Manager queue, recent bookings, and navigation

**Goal:** make manager overview values accurate and remove the redundant Dashboard dropdown interaction.

- [ ] Replace the hard-coded Preparation Queue badge/value with a dynamic value derived from current booking data.
- [ ] Show/count only `PREPARING` bookings whose start date is today or later in the manager's local timezone; ensure past bookings do not inflate the value. Keep the queue list and its summary consistent with this rule.
- [ ] Refresh or revalidate queue data when returning to the page and provide a retry path so the displayed value does not remain stale after a clerk changes status.
- [ ] Define Recent Bookings as the latest-created bookings, sort by `createdAt` descending (with a stable tie-break), and show the latest four; do not sort by scheduled `startAt`.
- [ ] Replace the expandable Dashboard category with one direct Dashboard navigation item that opens Overview; preserve active-route styling and direct navigation to other sections.
- [ ] Add a web test runner and component tests for the queue, recent-booking ordering, and Dashboard navigation behavior.

**Tests to conduct:**

- Automated: run the new focused web component tests, `cd web-app && npm run build`, and `cd web-app && npm run lint`.
- Automated queue cases: include `PREPARING` today/future, `PREPARING` in the past, and `CONFIRMED`/`READY` today/future; assert only eligible in-progress entries contribute to the value/list. Include a day-boundary/timezone case.
- Automated overview cases: supply bookings whose creation order differs from their meeting start order and assert the latest four by `createdAt` are shown in descending order.
- Automated navigation cases: Dashboard is a direct link with no expand/collapse control; it routes to Overview and reflects active state.
- Manual: change a booking from `PREPARING` to `READY` as a clerk and confirm the manager value updates after refresh or page focus; inspect Overview against the API's newest booking records.

**Definition of done:** manager queue count and entries match the agreed present/future `PREPARING` rule, Overview shows the newest-created bookings, and Dashboard is a single direct navigation item.

## Sprint 8: Messaging persistence and authorization

**Goal:** establish durable, server-authorized one-to-one conversations before adding realtime delivery.

- [ ] Finalize and document the allowed participant pairs: manager-manager, manager-employee, and manager-clerk. Employees and clerks may message managers only; employee-employee, employee-clerk, and clerk-clerk messaging is forbidden.
- [ ] Add a migration and Prisma models for conversations and messages, including participant/sender/recipient relations, message body, created timestamp, read timestamp (if read receipts are supported), cascade behavior, and indexes for conversation history and unread lookup.
- [ ] Add authenticated APIs to list permitted conversations, fetch paginated message history, start/find an allowed conversation, and send a persisted message.
- [ ] Enforce participant membership and role-pair rules in the API for every read and write; never rely on UI filtering for authorization.
- [ ] Validate message length and empty content, normalize ordering, and return consistent authorization/not-found responses without leaking other users' conversations.
- [ ] Add controller/route integration tests and migration/schema validation for permitted and forbidden role combinations, participant isolation, persistence, pagination/order, and unread/read state if included.

**Tests to conduct:**

- Automated: validate the Prisma schema and migration on a clean test database; run the API test suite and `cd API && npm run build`.
- Automated authorization matrix: prove manager↔manager, manager↔employee, and manager↔clerk are permitted in either direction; prove employee↔employee, employee↔clerk, and clerk↔clerk are rejected.
- Automated isolation: a user who is not a conversation participant cannot list, fetch, mark read, or send to that conversation, even by guessing its ID.
- Automated data behavior: valid messages persist with sender/recipient and timestamps, history is ordered and paginated, invalid/empty/over-limit bodies are rejected, and deletion behavior follows the migration's foreign-key policy.
- Manual: use separate manager, employee, and clerk accounts to verify the same allowed/denied pairs through the API or UI before socket work begins.

**Definition of done:** persisted messaging APIs and database constraints support the agreed participant rules, and role/participant isolation is covered by automated tests.

## Sprint 9: Realtime messaging and end-to-end verification

**Goal:** deliver authorized manager/employee/clerk messages in realtime across the web and mobile clients.

- [ ] Add authenticated WebSocket transport (or an equivalent maintained realtime library) using the existing API session identity; reject expired, revoked, inactive, and unauthenticated sessions.
- [ ] Authorize room/channel subscription and every send against the same conversation membership and role rules as the REST API.
- [ ] Persist each accepted message before broadcasting; support reconnect/history catch-up so transient disconnects do not lose messages.
- [ ] Add the manager web messaging UI and the Clerk/Employee mobile messaging UI, including conversation list, message history, send state, unread indicator/read state if supported, empty/loading/error states, and reconnect behavior.
- [ ] Prevent clients from subscribing to arbitrary user IDs or conversation channels they do not participate in; avoid broadcasting message bodies to unrelated roles/users.
- [ ] Add websocket integration tests and cross-client end-to-end coverage, including authentication expiry, disconnect/reconnect, duplicate delivery handling, and denied subscriptions/sends.
- [ ] Document local setup/configuration, production origin/security requirements, and operational behavior for websocket connections.

**Tests to conduct:**

- Automated API/socket tests: connected authenticated participants receive a new persisted message; nonparticipants and forbidden role pairs receive no message and cannot subscribe/send; revoked/expired sessions are disconnected or rejected.
- Automated resilience: reconnect and fetch missed history, verify message ordering and no duplicate visible messages, and verify a failed persistence operation is never broadcast as successful.
- End-to-end: manager web ↔ employee mobile, manager web ↔ clerk mobile, and manager ↔ manager; confirm employee ↔ employee, employee ↔ clerk, and clerk ↔ clerk are blocked from both UI and server.
- Manual network checks: temporarily disconnect one client, send a message from the other, reconnect, and verify the missed message appears once; confirm unread/read behavior if implemented.
- Release checks: run API tests/build, mobile tests/typecheck, web tests/build/lint, and migration validation against a clean database; verify websocket transport uses TLS in the deployed environment.

**Definition of done:** managers and employees/clerks can exchange durable realtime messages with managers and fellow managers can communicate, while all prohibited participant pairs remain blocked server-side.
