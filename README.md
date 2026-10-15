# BookSpace - Conference Room Booking and Operations

BookSpace is a conference-room booking and operations system developed as a 2026 third-year university project. It is designed to make it easier for employees to find suitable meeting spaces and for office teams to manage bookings, room readiness, supplies, and usage reporting.

The repository contains a TypeScript REST API, a React web operations portal, and a React Native/Expo mobile app. The API and web portal are connected to the application backend. The mobile app currently demonstrates the employee experience with local mock data and is not yet wired to the live API.

## The problem it addresses

Room bookings involve more than selecting a date and time. Employees need to find rooms that fit their meeting, while managers and clerks need to review requests, prepare spaces, track supplies, and communicate changes. BookSpace models these roles and workflows in one system, including bookings that span multiple rooms when one room cannot meet the requested attendee capacity.

## Features

### Booking and room discovery

- Search room availability for a requested time and attendee count, with room and amenity information.
- Request a booking with a purpose, time range, selected rooms, attendee capacity, and optional amenities.
- Book multiple rooms as a single booking. The API checks the combined seating capacity of the selected rooms against the requested attendee count.
- Track booking status across review and preparation, including pending, confirmed, preparing, ready, completed, cancelled, and reschedule-required states.
- Support booking approval, rejection with a reason, clerk assignment, cancellation, and rescheduling through role-protected API operations.

### Management and operations

- Role-based workflows for employees, clerks, and managers.
- Manager web portal for booking oversight, a preparation queue, room and amenity administration, consumable inventory, reports, profile management, messages, and notifications.
- Clerk dashboard for operational booking work and preparation status updates.
- Consumable stock tracking, low-stock visibility, and adjustment history.
- Availability, room-usage, and popularity reports, with report export functionality in the web app.
- Room photo management through an S3-compatible object storage integration when configured.

### Communication

- Conversation and message endpoints with read receipts.
- Authenticated Socket.IO connections for real-time messages, read receipts, booking status updates, and booking displacement notifications.
- In-app manager messaging and notification views in the web portal.

### Mobile experience

- Expo/React Native app prototype with sign-in and registration screens, room discovery and detail, booking flow, confirmation, booking history, employee profile, and a clerk dashboard.
- Airbnb-inspired, photo-led room browsing and a mobile-focused navigation experience.
- Current limitation: these screens use local sample data. The mobile app needs API integration before its displayed bookings and room information represent live system data.

## Functional requirements

| Area | Functional capability |
| --- | --- |
| Identity and access | Sign in, register manager accounts, refresh and revoke sessions, and authorize API operations by user role. |
| Rooms and amenities | Browse rooms and amenities, search availability, create and update rooms, archive rooms, and manage room photos. |
| Bookings | Create single- or multi-room requests, check combined capacity, list and view bookings, approve or reject requests, assign a clerk, update preparation status, cancel, or reschedule. |
| Inventory | Maintain consumable items, inspect low stock and adjustment history, and record stock changes. |
| Reporting | Retrieve availability, usage, and popularity reports for a date range and export reports from the web interface. |
| Messaging | Start conversations, view contacts and messages, send messages, and mark conversations as read. |
| Profiles | View and update a profile and deactivate an account through the API. |

## Non-functional qualities and engineering practices

- **Type safety:** TypeScript is used across the API and both user interfaces.
- **Layered backend:** Express routes, controllers, domain services, middleware, and Prisma persistence are separated to keep HTTP handling and business rules distinct.
- **Relational data model:** PostgreSQL and Prisma represent users, role-specific booking actions, rooms, amenities, bookings, inventory, conversations, and sessions with explicit relations and indexes.
- **Access control:** Authentication middleware and role checks protect API operations. Passwords are stored as hashes; access and refresh session data support token renewal and revocation.
- **Input and abuse safeguards:** Request validation, authentication rate limits, API rate limiting, production CORS origin configuration, centralized error handling, and request logging are implemented in the API.
- **Safer image uploads:** Room image uploads use short-lived presigned URLs when object storage is configured, and the API checks uploaded file signatures before attaching images.
- **Real-time updates:** Socket.IO authenticates connections and scopes notifications to the relevant users.
- **Testability:** The API has Jest unit and integration tests, the web app has Vitest tests, and the mobile app has Jest configured. API integration tests use a separately configured test database.
- **Deployability:** Dockerfiles build the API and web app independently. The web container serves the production Vite build through Nginx; Docker Compose can run both services against PostgreSQL.

## Architecture and technology

| Component | Technologies |
| --- | --- |
| API | Node.js, TypeScript, Express 5, Prisma, PostgreSQL, JWT, bcryptjs, Socket.IO |
| Web operations portal | React 19, TypeScript, Vite, React Router, Axios, Socket.IO client |
| Mobile app | React Native, Expo, TypeScript, React Navigation |
| Image storage | AWS S3 SDK with presigned uploads; compatible storage endpoint can be configured |
| Deployment | Docker, Docker Compose, Nginx |
| Testing | Jest and Supertest (API), Vitest and Testing Library (web), Jest (mobile) |

### High-level request flow

1. A web client sends an authenticated request to the versioned API under `/api/v1`.
2. Express middleware applies request parsing, logging, rate limiting, authentication, role authorization, and validation as appropriate.
3. Controllers hand application operations to domain services.
4. Services enforce booking, room, inventory, messaging, and reporting rules and persist application data through Prisma/PostgreSQL.
5. Socket.IO publishes selected updates to authenticated users; the web app can retrieve report data and export it for operational use.

## Repository layout

```text
API/          Express API, Prisma schema/migrations, seed data, and tests
web-app/      React manager/clerk operations portal
mobile-app/   Expo mobile app prototype
docker-compose.yml
```

## Run with Docker Compose

### Prerequisites

- Docker Desktop with Compose
- PostgreSQL available to the containers (the included Compose file does not start a database)
- A database URL and a strong, private JWT secret supplied through environment configuration

Copy the root `.env.example` to `.env` and configure the values for your local PostgreSQL instance. Do not commit `.env` files or real credentials. When using Docker Desktop to reach PostgreSQL on the Windows host, use `host.docker.internal` as the database host. URL-encode special characters in the database password.

Build and start the API and web services from the repository root:

```sh
docker compose -f docker-compose.yml build api
docker compose -f docker-compose.yml build web
docker compose -f docker-compose.yml up -d
```

The API is available at `http://localhost:4000`; the web portal is served at `http://localhost:8081`. Stop the services with:

```sh
docker compose -f docker-compose.yml down
```

This stops the application containers and does not delete the separately hosted PostgreSQL database.

## Development and tests

Install dependencies separately in each application directory with `npm ci`.

Run the API in development mode:

```sh
cd API
npm run dev
```

Set the API's database and secret configuration in `API/.env` before starting it. Run the API tests in an environment with a dedicated `TEST_DATABASE_URL`:

```sh
cd API
npm test
```

Run the web app:

```sh
cd web-app
npm run dev
```

Run web checks:

```sh
cd web-app
npm test
npm run build
```

Start the mobile app with Expo:

```sh
cd mobile-app
npm start
```

The mobile app requires `EXPO_PUBLIC_API_URL` to be set for API connectivity, but its current screens use mock data and are not yet integrated with the API.

## API overview

The API is versioned under `/api/v1`. Core resource groups include:

- `/auth` - login, registration, token refresh, and logout
- `/rooms` and `/amenities` - room search, availability, room data, amenity management, and room images
- `/bookings` - booking creation, listing, approval, rejection, assignment, status, cancellation, and rescheduling
- `/consumables` - supplies and stock adjustments
- `/reports` - availability, usage, and popularity reporting
- `/conversations` - contacts, messages, and read state
- `/profile` and `/me` - profile operations

Example multi-room request:

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

`capacity` is the requested attendee count, not the sum of the selected rooms' capacities. The API validates the selected rooms' combined capacity and creates one booking associated with each selected room.

## CV-ready project highlights

Use or adapt these points to describe the work you personally completed:

- Developed a full-stack room-booking and operations platform spanning a TypeScript/Express REST API, React web portal, and React Native/Expo mobile client.
- Implemented a relational booking domain with multi-room reservations, capacity validation, approval and rejection, clerk assignment, rescheduling, and preparation-status workflows.
- Built role-aware management workflows for rooms, amenities, inventory, booking queues, reporting, and internal messaging.
- Applied layered API design, Prisma/PostgreSQL data modeling, JWT-based session handling, input validation, rate limiting, and automated tests.
- Added authenticated real-time communication with Socket.IO and secure room-image upload flows using presigned object-storage URLs.
- Containerized API and web deployment with Docker, Compose, and Nginx, and documented environment-based setup.

For a CV, describe the mobile client accurately as a prototype using local mock data unless and until it is connected to the live API. Add measurable outcomes (such as test count, response-time improvement, or number of supported workflows) only when you have verified figures.

## Current scope notes

- The API and manager/clerk web portal have backend-backed workflows; the employee dashboard route in the web app is currently a placeholder.
- The mobile UI is a prototype backed by local mock data rather than live API data.
- Local deployment requires a separately running PostgreSQL database; Compose starts only the API and web services.

These notes distinguish implemented backend capabilities from client-side work that remains in progress and can be updated as the project evolves.
