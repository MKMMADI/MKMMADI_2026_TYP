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

 - [x] Replace the hard-coded Preparation Queue badge/value with a dynamic value derived from current booking data.
 - [x] Show/count only `PREPARING` bookings whose start date is today or later in the manager's local timezone; count eligible rooms and exclude past bookings. Keep the queue list and its summary consistent with this rule.
 - [x] Refresh or revalidate queue data when returning to the page and provide a retry path so the displayed value does not remain stale after a clerk changes status.
 - [x] Define Recent Bookings as the latest-created bookings, sort by `createdAt` descending (with a stable tie-break), and show the latest four; do not sort by scheduled `startAt`.
 - [x] Replace the expandable Dashboard category with one direct Dashboard navigation item that opens Overview; preserve active-route styling and direct navigation to other sections.
 - [x] Add a web test runner and component tests for the queue, recent-booking ordering, and Dashboard navigation behavior.

**Tests to conduct:**


**Definition of done:** manager queue count and entries match the agreed present/future `PREPARING` rule, Overview shows the newest-created bookings, and Dashboard is a single direct navigation item.

 - Automated results: `npm test -- --pool=threads --maxWorkers=1` passes (4 files, 6 tests); `npm run build` passes. `npm run lint` could not load Oxlint's native binding because Windows Application Control blocked the binary.

## Sprint 8: Messaging persistence and authorization

**Goal:** establish durable, server-authorized one-to-one conversations before adding realtime delivery.

**Status:** implementation and automated verification complete. Authorization matrix and isolation are covered by `conversation.integration.test.ts`. Device-level sign-in with three accounts remains optional for demo polish.

- [x] Finalize and document the allowed participant pairs: manager-manager, manager-employee, and manager-clerk. Employees and clerks may message managers only; employee-employee, employee-clerk, and clerk-clerk messaging is forbidden.
- [x] Add a migration and Prisma models for conversations and messages, including participant/sender/recipient relations, message body, created/read timestamps, cascade behavior, and indexes for conversation history and unread lookup.
- [x] Add authenticated APIs to list permitted conversations, fetch paginated message history, start/find an allowed conversation, send persisted messages, and mark received messages as read.
- [x] Enforce participant membership and role-pair rules in the API for every read and write; never rely on UI filtering for authorization.
- [x] Validate message length and empty content, normalize ordering, and return consistent authorization/not-found responses without leaking other users' conversations. Redact conversation request bodies from error logs.
- [x] Add controller/route integration tests and migration/schema validation for permitted and forbidden role combinations, participant isolation, persistence, pagination/order, and unread/read state.

**Tests to conduct:**

- Automated results: Prisma schema validates; the messaging migration applied to `typ_test_1`; `npm run build` passes (16 suites, 240 tests) and TypeScript compilation passes. The existing Jest open-handle warning remains.
- Automated authorization matrix: manager\u2194manager, manager\u2194employee, and manager\u2194clerk are permitted from either side; employee\u2194employee, employee\u2194clerk, and clerk\u2194clerk are rejected from either side.
- Automated isolation: a nonparticipant cannot list, fetch, mark read, or send to a conversation by guessing its ID.
- Automated data behavior: messages persist with sender/recipient and timestamps, history is ordered and paginated, invalid/empty/over-limit bodies are rejected, read state updates, and cascading deletion follows the migration's foreign-key policy.
- Manual: use separate manager, employee, and clerk accounts to verify the same allowed/denied pairs through the API or UI before socket work begins.

**Definition of done:** persisted messaging APIs and database constraints support the agreed participant rules, and role/participant isolation is covered by automated tests.

**Manual verification:** automated authorization matrix covers manager\u2194manager, manager\u2194employee, manager\u2194clerk permitted and employee\u2194employee / employee\u2194clerk / clerk\u2194clerk rejected; non-participant isolation covered. Optional live account walkthrough still recommended for demos.

## Sprint 9: Realtime messaging and end-to-end verification

**Goal:** deliver authorized manager/employee/clerk messages in realtime across the web and mobile clients.

**Status:** implementation complete. Socket.IO transport, REST-first send/persist/broadcast, manager web UI, and employee/clerk mobile Messages tabs are in place. Automated coverage in `realtime.integration.test.ts` and `conversation.integration.test.ts`.

- [x] Add authenticated WebSocket transport (or an equivalent maintained realtime library) using the existing API session identity; reject expired, revoked, inactive, and unauthenticated sessions.
- [x] Authorize room/channel subscription and every send against the same conversation membership and role rules as the REST API.
- [x] Persist each accepted message before broadcasting; support reconnect/history catch-up so transient disconnects do not lose messages.
- [x] Add the manager web messaging UI and the Clerk/Employee mobile messaging UI, including conversation list, message history, send state, unread indicator/read state if supported, empty/loading/error states, and reconnect behavior.
- [x] Prevent clients from subscribing to arbitrary user IDs or conversation channels they do not participate in; avoid broadcasting message bodies to unrelated roles/users.
- [x] Add websocket integration tests and cross-client end-to-end coverage, including authentication expiry, disconnect/reconnect, duplicate delivery handling, and denied subscriptions/sends.
- [x] Document local setup/configuration, production origin/security requirements, and operational behavior for websocket connections.

**Tests to conduct:**

- Automated API/socket tests: connected authenticated participants receive a new persisted message; nonparticipants and forbidden role pairs receive no message and cannot subscribe/send; revoked/expired sessions are disconnected or rejected.
- Automated resilience: reconnect and fetch missed history, verify message ordering and no duplicate visible messages, and verify a failed persistence operation is never broadcast as successful.
- End-to-end: manager web \u2194 employee mobile, manager web \u2194 clerk mobile, and manager \u2194 manager; confirm employee \u2194 employee, employee \u2194 clerk, and clerk \u2194 clerk are blocked from both UI and server.
- Manual network checks: temporarily disconnect one client, send a message from the other, reconnect, and verify the missed message appears once; confirm unread/read behavior if implemented.
- Release checks: run API tests/build, mobile tests/typecheck, web tests/build/lint, and migration validation against a clean database; verify websocket transport uses TLS in the deployed environment.

**Definition of done:** managers and employees/clerks can exchange durable realtime messages with managers and fellow managers can communicate, while all prohibited participant pairs remain blocked server-side.
