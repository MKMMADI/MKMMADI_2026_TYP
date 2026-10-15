# MKMMADI_2026_TYP
2026 Third Year Project

## Multi-room booking API

An employee creates a booking with `POST /api/v1/bookings`. Send all selected
room IDs in `roomIds`; `capacity` is the expected attendee count, not the sum
of the selected rooms' capacities. The API checks that the selected rooms
provide enough seats and creates one booking linked to every room.

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

Run `cd API && npm test` separately in an environment with `TEST_DATABASE_URL`
configured.

Run the API image directly by providing the same database and secret settings
that the application requires:

```sh
docker run --rm --name mkmmadi-api \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/2026_TYP_Conference_Bookings_v1 \
  -e JWT_SECRET=replace-with-a-long-random-secret \
  -p 4000:4000 \
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
