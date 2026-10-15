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

- [x] Finalize and document the allowed participant pairs: manager-manager, manager-employee, manager-clerk, and employee-clerk. Employee-employee and clerk-clerk messaging is forbidden.
- [x] Add a migration and Prisma models for conversations and messages, including participant/sender/recipient relations, message body, created/read timestamps, cascade behavior, and indexes for conversation history and unread lookup.
- [x] Add authenticated APIs to list permitted conversations, fetch paginated message history, start/find an allowed conversation, send persisted messages, and mark received messages as read.
- [x] Enforce participant membership and role-pair rules in the API for every read and write; never rely on UI filtering for authorization.
- [x] Validate message length and empty content, normalize ordering, and return consistent authorization/not-found responses without leaking other users' conversations. Redact conversation request bodies from error logs.
- [x] Add controller/route integration tests and migration/schema validation for permitted and forbidden role combinations, participant isolation, persistence, pagination/order, and unread/read state.

**Tests to conduct:**

- Automated results: Prisma schema validates; the messaging migration applied to `typ_test_1`; `npm run build` passes (16 suites, 240 tests) and TypeScript compilation passes. The existing Jest open-handle warning remains.
- Automated authorization matrix: manager\u2194manager, manager\u2194employee, manager\u2194clerk, and employee\u2194clerk are permitted from either side; employee\u2194employee and clerk\u2194clerk are rejected from either side.
- Automated isolation: a nonparticipant cannot list, fetch, mark read, or send to a conversation by guessing its ID.
- Automated data behavior: messages persist with sender/recipient and timestamps, history is ordered and paginated, invalid/empty/over-limit bodies are rejected, read state updates, and cascading deletion follows the migration's foreign-key policy.
- Manual: use separate manager, employee, and clerk accounts to verify the same allowed/denied pairs through the API or UI before socket work begins.

**Definition of done:** persisted messaging APIs and database constraints support the agreed participant rules, and role/participant isolation is covered by automated tests.

**Manual verification:** automated authorization matrix covers the agreed allowed pairs and same-role restrictions; non-participant isolation is covered. Optional live account walkthrough still recommended for demos.

## Sprint 9: Realtime messaging and end-to-end verification

**Goal:** deliver authorized, durable realtime messages across manager web and employee/clerk mobile clients.

**Status:** in progress. Client restoration, role-matrix alignment, focused socket security/resilience tests, automated package release checks, and isolated-schema migration validation are complete. Cross-client device walkthroughs and deployed TLS/origin verification remain.

### Sprint 9.1: Restore and stabilize messaging clients

- [x] Restore the manager Messages page from the last intact repository revision.
- [x] Show permitted contacts persistently on the manager web Messages page with one-tap conversation start.
- [x] Update the web component test to cover visible contacts and live message rendering.
- [x] Make the shared employee/clerk Messages tab inbox-first: show permitted contacts and existing conversations, then open a focused chat on selection with back navigation.
- [x] Keep the chat composer above the floating tab bar and hide the bar while the keyboard is open for both roles.
- [x] Add a clerk queue action that starts or reuses a conversation with that booking's employee owner and opens the thread directly.
- [x] Remove the Clerk Sign Out tab and put the confirmed sign-out action at the top of Profile.
- [x] Test contact-to-chat flow for employees and clerks, queue-owner navigation, return-to-inbox behavior, sign-out confirmation, and composer clearance.

**Verification:** focused web Messages test passes (2 tests); focused mobile Messages, Queue, and Clerk navigation suites pass (11 tests).

### Sprint 9.2: Align role authorization and contact lists

- [x] Document the agreed matrix consistently: any pair involving a manager and employee\u2194clerk are allowed; employee\u2194employee and clerk\u2194clerk are denied.
- [x] Cover employee\u2194clerk start in both directions and role-filtered contacts in the API integration tests.
- [x] Keep authorization enforced by the API rather than relying on filtered client lists.

**Verification:** focused conversation and realtime API suites pass.

### Sprint 9.3: Prove socket authentication and resilience

- [x] Test that expired, revoked, inactive, and unauthenticated sessions cannot connect; verify revocation disconnects an already-connected user.
- [x] Test disconnect/reconnect history catch-up, stable ordering, and exactly-once visible messages in web and mobile clients.
- [x] Test that persistence failures never emit a successful realtime message.
- [x] Test that forbidden pairs and nonparticipants cannot receive message bodies or use unauthorized conversation operations.

### Sprint 9.4: Cross-client and release verification

- [ ] Verify manager web \u2194 employee mobile, manager web \u2194 clerk mobile, and manager \u2194 manager with separate accounts.
- [ ] Verify employee \u2194 employee and clerk \u2194 clerk are denied; verify employee \u2194 clerk is allowed, matching the agreed matrix.
- [ ] Disconnect one client, send from the other, reconnect, and confirm the missed message appears once and read/unread state is correct.
- [x] Run API tests/build, mobile tests/typecheck, and web tests/build/lint.
- [x] Validate the Prisma schema and confirm migrations are up to date on the configured database.
- [x] Apply migrations to a clean disposable PostgreSQL schema and verify the resulting schema.
- [ ] Verify deployed Socket.IO uses TLS and exact allowed production origins.

**Automated release results:** API build passes (18 suites, 255 tests); mobile tests and typecheck pass (6 suites, 18 tests); web tests and build pass (7 files, 13 tests); Prisma schema validates, configured development/test databases are migrated, and all migrations apply successfully to a fresh isolated schema. Oxlint emits one React hook dependency warning in the preview component. Jest continues to report the existing open-handle warning.

**Definition of done:** all Sprint 9.3 and 9.4 checks pass, clients exchange durable realtime messages for every allowed pair, prohibited pairs remain server-denied, and release requirements are verified.

## Sprint 10: Manager-assigned booking clerks

**Goal:** let managers pin a booking to a clerk before approval or change the assignment after confirmation, without taking away clerks' ability to claim any available booking for preparation.

**Status:** implementation and automated verification complete; manual manager walkthrough remains useful for demo sign-off.

- [x] Add a nullable `assignedClerkId` relation, separate from `preparedById`, with a migration.
- [x] Add manager-only endpoints to list active clerks and assign, reassign, or unassign a booking.
- [x] Allow assignment for pending, confirmed, preparing, and ready bookings; prevent changes to cancelled or completed bookings.
- [x] Add an assignment selector to Manager All Bookings and show existing assignment after approval.
- [x] Preserve clerk preparation behavior: clerks may claim any eligible booking, and `preparedBy` records the clerk who actually starts preparation independently of the manager's assignment.
- [x] Cover assignment before approval, reassignment after confirmation, unassignment, role validation, and clerk claiming by another clerk.

**Verification:** API booking integration suite passes (37 tests); full API build passes (18 suites, 255 tests); focused Manager Bookings UI tests pass (2 tests); full web tests/build pass (7 files, 13 tests). The additive migration is applied to local development and test databases.

**Manual verification:** in Manager All Bookings, assign a clerk on a pending request, approve it, change the clerk on the confirmed booking, and verify a clerk other than the assigned one can still claim preparation from the clerk queue.
