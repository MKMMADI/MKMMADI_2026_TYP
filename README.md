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
