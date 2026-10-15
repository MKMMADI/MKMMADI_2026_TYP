# MKMMADI_2026_TYP
2026 Third Year Project

## Create a booking

`POST /api/v1/bookings` requires an authenticated employee and accepts one or
more room IDs in the `roomIds` array:

```json
{
  "roomIds": [12, 15],
  "purpose": "Department workshop",
  "startAt": "2026-10-01T09:00:00.000Z",
  "endAt": "2026-10-01T11:00:00.000Z",
  "capacity": 15,
  "amenityIds": [3]
}
```

`capacity` is the expected attendee count, not the selected rooms' summed
capacity. Repeated room IDs are silently deduplicated. The request is rejected
when the room list is empty or invalid, capacity is not a positive whole
number, a selected room is unavailable, the combined room capacity is
insufficient, or a requested amenity is missing from any selected room.

## Room photos

Rooms have an optional `imageUrl` for externally hosted demo photos and an
`imageKey` for objects uploaded to private S3 storage. Room read responses
return `imageUrl`: legacy URLs are passed through and S3 objects receive a
15-minute presigned download URL. Manager-only `POST /api/v1/rooms` and
`PATCH /api/v1/rooms/:id` still accept HTTPS URLs for seeded/demo photos.

### Manager S3 upload API

Configure `AWS_REGION` and `ROOM_IMAGE_S3_BUCKET`. The API uses the standard
AWS SDK credential chain, so prefer an IAM role for deployed environments or
the AWS shared credentials profile locally. Never put AWS access keys in
source control. The IAM principal needs `s3:PutObject`, `s3:GetObject`, and
`s3:DeleteObject` on the room-image bucket's `rooms/*` prefix.

1. Request a short-lived upload URL:

   ```http
   POST /api/v1/rooms/:id/image-upload
   Authorization: Bearer <manager-token>
   Content-Type: application/json

   { "contentType": "image/jpeg", "contentLength": 123456 }
   ```

   The response includes `uploadUrl`, `objectKey`, `expiresIn`, and the
   `Content-Type` request header. The room and expected-size metadata are
   included in the presigned URL and should not be resent as request headers.
2. `PUT` the raw image bytes to `uploadUrl` with the returned headers. Supported
   types are JPEG, PNG, and WebP; maximum size is 5 MiB.
3. Confirm the upload:

   ```http
   POST /api/v1/rooms/:id/image
   Authorization: Bearer <manager-token>
   Content-Type: application/json

   { "objectKey": "rooms/123/<generated-id>.jpg" }
   ```

   The API checks that the object exists, belongs to that room, is within the
   size limit, and has a supported image signature before attaching it. A
   replaced S3 object is deleted after the room points at the new image.
4. Remove a photo with manager-only `DELETE /api/v1/rooms/:id/image`.

The bucket should remain private. For browser uploads, configure its S3 CORS
policy to allow `PUT` from the deployed web-app origin and the `Content-Type`
header. The room ID and expected size are signed into the upload URL as query
parameters. The manager API endpoints are available to the web upload controls.

Add an S3 lifecycle rule to expire objects under `pending-room-images/` after
one day. Confirmed images are copied to `rooms/`; abandoned upload attempts are
therefore cleaned up without expiring active room photos.

The seed data still uses the supplied Unsplash HTTPS URLs; it does not upload
those assets to S3. The manager upload flow stores S3 object keys in `imageKey`
and room read APIs resolve those keys to temporary display URLs.

## Synthetic report history

The regular demo seed creates only a small number of recent bookings. To
populate the manager reports with trends, run the separate additive report
history seeder against a development database:

```sh
npm run seed:reports -- --confirm-development
```

It creates deterministic weekday bookings across the previous 180 days using
the existing active employees and available rooms. Each purpose is labeled
`[BOOKSPACE REPORT DEMO V1]`; completed, cancelled, and displaced bookings are
included to make report status filters meaningful. Re-running the command
replaces only bookings with that exact marker and leaves other bookings,
employees, rooms, images, and amenities unchanged.

For safety, the command refuses `NODE_ENV=production` and non-local database
hosts by default. For a verified remote development database only, set
`REPORT_SEED_ALLOW_REMOTE_DEV=true` and keep the explicit
`--confirm-development` argument. Check `DATABASE_URL` points to the intended
development database before running it. The generated history is synthetic
and should not be presented as real business activity.

### Seed the live demo database

The production runner is compiled into the API image and is intended for a
one-off ECS task using the API task definition's existing database secret and
network settings. Build and push an image containing this change, then run it
as a separate task with the container command overridden; do not update the
API service or run the ordinary full demo seed.

First, run the task with this container command override. It prints the
non-secret database host and database name from `DATABASE_URL` without
connecting to the database:

```json
["node", "dist-seed/prisma/seed-report-history.js", "--show-production-target"]
```

Use the exact `host:port/database` target printed above in this read-only
preflight command override:

```json
[
  "node", "dist-seed/prisma/seed-report-history.js",
  "--confirm-production-target=replace-with-host:port/database", "--dry-run"
]
```

Review the planned insert, conflict-skip, and replacement counts in the ECS
task logs. Only after confirming the target is the live demo database and the
counts are expected, run the same override with the exact target and without
`--dry-run`:

```json
[
  "node", "dist-seed/prisma/seed-report-history.js",
  "--confirm-production-target=replace-with-host:port/database"
]
```

The runner refuses production writes unless the exact target matches the
runtime `DATABASE_URL`. It uses the API image's RDS CA bundle, and its
transaction replaces only `[BOOKSPACE REPORT DEMO V1]` bookings while
preserving other booking and room data. The synthetic report history should
not be presented as real business activity.

## Assign a booking to a clerk

Managers can list active clerks with `GET /api/v1/bookings/assignable-clerks`
and assign or change a booking's clerk with `PATCH /api/v1/bookings/:id/assignment`:

```json
{ "clerkId": 42 }
```

Send `{ "clerkId": null }` to clear the assignment. Assignment is allowed while
a booking is pending, confirmed, preparing, or ready; cancelled and completed
bookings are closed to assignment changes. `assignedClerk` is the manager's
planning pin and is separate from `preparedBy`, which records the clerk who
actually starts preparation. Clerks can still claim any eligible booking from
the preparation queue, regardless of its assigned clerk.

## Priority bookings and displaced bookings

Employees and managers can create bookings with `POST /api/v1/bookings`.
Bookings owned by users with a high-ranking `officialRole` are confirmed
immediately. If such a booking overlaps ordinary bookings, those bookings are
preserved with status `RESCHEDULE_REQUIRED`; the response includes each
displaced booking and its proposed replacement start/end time. A conflict with
another official booking or the official's own booking is rejected rather than
silently displacing it.

The displaced booker can accept the proposal:

```json
{ "acceptSuggestion": true }
```

Or choose a different future start time (the original duration is retained):

```json
{ "startAt": "2026-10-08T09:00:00.000Z" }
```

Both options use `PATCH /api/v1/bookings/:id/reschedule`. Only the booking owner
may accept or reschedule it. Replacement times are checked again when accepted;
if another booking has taken the slot, the API returns `409` and the booker can
choose another time. When a booking is displaced, the API emits a
`booking:displaced` Socket.IO event to that booker's authenticated user room.

## Messaging

Messaging is authenticated and one-to-one. Allowed pairs are:
manager\u2194manager, manager\u2194employee, manager\u2194clerk, and employee\u2194clerk.
Employee\u2194employee and clerk\u2194clerk conversations are rejected.
Conversations are unique per participant pair, regardless of who starts them.
`GET /api/v1/conversations/contacts` returns only the users the current role may message.

- `GET /api/v1/conversations` lists the authenticated user's conversations,
  counterpart, latest message, and unread count.
- `POST /api/v1/conversations` with `{ "participantId": 42 }` creates or returns
  the existing conversation with that user.
- `GET /api/v1/conversations/:id/messages?limit=50&beforeId=123` returns messages
  in chronological order, with a cursor for older history. `limit` is 1\u2013100.
- `POST /api/v1/conversations/:id/messages` with `{ "body": "Hello" }` stores
  and returns a message. Empty messages and bodies over 4000 characters are
  rejected.
- `PATCH /api/v1/conversations/:id/read` marks messages addressed to the current
  user as read and returns the number updated.

Every conversation and message operation checks authenticated membership and
the current participant roles on the server. Nonparticipants receive a not-found
response; message bodies are redacted from application error logs.

### Realtime delivery

Socket.IO is served from the API origin. Clients connect with
`auth: { accessToken }`; the API verifies the JWT, session, expiry, revocation,
and active account before assigning a server-controlled user room. Clients
cannot join conversation rooms or publish messages over the socket.

Messages must be sent through `POST /api/v1/conversations/:id/messages`. The API
commits the message first, then emits `message:new` to the two participants.
`PATCH /api/v1/conversations/:id/read` emits `conversation:read` after read state
is updated. Clients reload REST history after reconnect to catch missed events.

When a manager approves a booking, its owner receives `booking:updated` with the
booking ID and new status. Priority bookings emit `booking:displaced` to each
displaced owner's authenticated user room, including the proposed replacement
time. Mobile notification feeds refresh from the booking and conversation APIs
when these events arrive and can also be refreshed manually.

In production, set `SOCKET_ALLOWED_ORIGINS` to a comma-separated list of exact
web origins, for example `https://bookspace.example.com`. Mobile native clients
may connect without a browser Origin header but still require a valid token.
Terminate TLS at the public API or reverse proxy and connect using `wss://`;
never expose an insecure WebSocket endpoint to production clients. Local web
development accepts localhost origins. Set the web build variable
`VITE_API_URL` to the browser-reachable API base including `/api/v1`; the web
client uses that URL's origin for Socket.IO as well as its REST API.

## Build and run the Web and API images

The API image generates Prisma Client and compiles TypeScript. Integration
tests run separately because they require `TEST_DATABASE_URL`, which is not
available inside the image build.

### Build the API image first

From the repository root:

```sh
docker build --target production -t mkmmadi-api:main ./API
```

The API image build runs:

1. `npm ci`
2. Prisma Client generation
3. TypeScript compilation
4. production dependency pruning

Run `npm test` separately with `TEST_DATABASE_URL` configured before deploying.

Run the API image directly by providing the same database and secret settings
that the application requires:

```sh
docker run --rm --name mkmmadi-api \\
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/2026_TYP_Conference_Bookings_v1 \\
  -e JWT_SECRET=replace-with-a-long-random-secret \\
  -p 4000:4000 \\
  mkmmadi-api:main
```

### Build the Web image

```sh
docker build -t mkmmadi-web:main ./web-app
```

Run it on port 8080:

```sh
docker run --rm --name mkmmadi-web -p 8080:80 mkmmadi-web:main
```

The web image serves the Vite production build with Nginx. Client-side routes
fall back to `index.html`.

### Run the complete stack with Compose

Compose reads `.env` from the repository root; it does not automatically read
`API/.env`. Copy `.env.example` to root `.env`, set `DATABASE_URL` to your
existing database at `host.docker.internal:5432/2026_TYP_Conference_Bookings_v1`,
and set `JWT_SECRET`. URL-encode special characters in the password portion.

Make sure PostgreSQL is running on the Windows host. Compose starts only the
API and Web services:

```sh
docker compose -f docker-compose.yml build api
docker compose -f docker-compose.yml build web
docker compose -f docker-compose.yml up -d --build
```

The API is available at `http://localhost:4000` and the web application at
`http://localhost:8081`. Stop the Compose services with
`docker compose -f docker-compose.yml down`; this does not delete the host
PostgreSQL database.

### Reseed the AWS demo database

From the repository root, run this in PowerShell when you want to replace the
AWS demo data:

```powershell
.\API\reseed-demo.ps1
```

The script uses the existing ECS seed-only task definition and the API service's
network configuration in `af-south-1`. It verifies the AWS account and seed task
definition, then requires you to type `RESEED DEMO DATABASE` before it starts
the task. The seed deletes existing application records before recreating the
demo data. Do not run it if any data needs to be retained.

The AWS CLI must be installed and authenticated to account `764678966746`.
The script waits for the task to stop and verifies its exit code and
`Seed complete.` CloudWatch log marker. If it times out, it does not stop the
task; inspect the task in ECS before retrying.
