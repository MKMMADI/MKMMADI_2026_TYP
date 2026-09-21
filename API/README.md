# MKMMADI_2026_TYP
2026 Third Year Project

## Build and run the Web and API images

The repository's `main` branch is the source of truth for this setup. The API
image uses the existing `npm run build` command. Its `prebuild` hook runs the
Jest tests before TypeScript compilation, so a failing test stops the Docker
build and no API image is produced.

### Build the API image first

From the repository root:

```sh
docker build --target production -t mkmmadi-api:main ./API
```

The API build runs:

1. `npm ci`
2. `npm test` through the existing `prebuild` hook
3. `tsc`
4. production dependency pruning

If step 2 fails, Docker stops immediately and the API is not compiled or
started.

Run the API image directly by providing the same database and secret settings
that the application requires:

```sh
docker run --rm --name mkmmadi-api \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/typ \
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
JWT_SECRET=replace-with-a-long-random-secret
```

Build the API first, then the Web image, and start Postgres and both services:

```sh
docker compose build api
docker compose build web
docker compose up
```

The API waits for the Postgres health check. The API is available at
`http://localhost:4000` and the web application at `http://localhost:8080`.
Stop the stack with `Ctrl+C`, or use `docker compose down`. Add `-v` to
`docker compose down` only when the local Postgres volume should also be
deleted.