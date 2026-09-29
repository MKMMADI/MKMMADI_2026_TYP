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

Create a `.env` file in the repository root (it is ignored by Git):

```dotenv
POSTGRES_PASSWORD=replace-with-a-url-safe-password
JWT_SECRET=replace-with-a-long-random-secret
```

Use only URL-safe characters in `POSTGRES_PASSWORD`, since Compose embeds it in
the API database URL.

Build the API first, then the Web image, and start Postgres and both services:

```sh
docker compose -f docker-compose.yml build api
docker compose -f docker-compose.yml build web
docker compose -f docker-compose.yml up
```

The API waits for the Postgres health check. The API is available at
`http://localhost:4000` and the web application at `http://localhost:8080`.
Stop the stack with `Ctrl+C`, or use `docker compose down`. Add `-v` to
`docker compose down` only when the local Postgres volume should also be
deleted.
