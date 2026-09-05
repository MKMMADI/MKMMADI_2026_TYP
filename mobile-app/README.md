# mobile-app — Employee Conference Room Booking (Airbnb-inspired)

React Native + Expo mobile client for employees. Visual language follows the Airbnb DESIGN.md (warm white canvas, Rausch `#FF385C` primary, soft rounded cards, photo-first room listings, pill search bar).

## Features (employee role)

- Sign in / register
- Profile + booking history
- Airbnb-style search bar (date, time, capacity, amenities)
- Photo-first room cards with amenities, capacity, rating
- Multi-room booking flow with availability checks
- Booking confirmation and status

## Quick start

```bash
cd mobile-app
npm install
npx expo start
```

Scan the QR with Expo Go, or press `a` / `i` for emulator.

## Structure

```
mobile-app/
  app/                 # Expo Router screens (if using file-based routing)
  src/
    components/        # Button, RoomCard, SearchBar, ...
    theme/             # Airbnb design tokens
    constants/         # Mock data (swap for API later)
    types/
  package.json
  app.json
```

## Connecting to the API

Point the API base URL at the Express server from the `API/` folder (see web-app for the existing auth + fetch pattern). Replace mock data in `constants/mockData.ts` with real endpoints:

- `POST /auth/login`, `POST /auth/register`
- `GET /rooms/availability`
- `POST /bookings`
- `GET /me`, `GET /me/bookings`

## Design notes

- Primary: `#FF385C` (Rausch)
- Canvas: `#FFFFFF`
- Ink: `#222222`
- Soft radii (8–14px cards, full pill search)
- Typography inspired by Airbnb Cereal (system sans fallback)
