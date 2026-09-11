# mobile-app — Employee conference room booking (Expo)

Expo Router client for **employees**. Visual language uses `src/theme/tokens.ts` (navy primary `#16324F`, soft surfaces — same brand as auth/web field UI).

## Source of truth

Styling and screen structure originate on branch **`agents/mobile-structure-employee-interfaces`**. This branch wires those screens to the live **API**.

## Features (API-backed)

- Sign in / register → `POST /api/v1/auth/login|register`, `GET /api/v1/me`
- Home room list → `GET /api/v1/rooms` (mapped to card UI)
- Create booking → `POST /api/v1/bookings` (numeric room/amenity ids)
- Booking history → `GET /api/v1/bookings` (employee-scoped on server)
- Token refresh via `POST /api/v1/auth/refresh` + SecureStore

## Quick start

```bash
# Terminal 1 — API
cd API && npm run dev   # typically :4000

# Terminal 2 — mobile
cd mobile-app
cp .env.example .env    # set EXPO_PUBLIC_API_URL to your machine IP
npm install
npx expo start -c
```

Demo employee (after seed): `thandi.mokoena@bookspace.co.za` / `Password123!`

### API URL tips

| Environment | Example |
|-------------|---------|
| Phone on Wi‑Fi | `http://192.168.x.x:4000` |
| Android emulator | `http://10.0.2.2:4000` |
| iOS simulator | `http://localhost:4000` |

Ensure the API allows CORS from the Expo origin if you use web.

## Structure

```
mobile-app/
  app/                 # Expo Router (auth) + (app)
  src/
    api.ts             # HTTP client + refresh
    lib/mapApi.ts      # API JSON → UI models
    screens/           # Presentational screens (tokens)
    theme/tokens.ts    # Design tokens
```
