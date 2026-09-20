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

The mobile app reads its API URL from `mobile-app/.env`. Start the API first:

```bash
cd API
npm run dev
```

Then copy `mobile-app/.env.example` to `mobile-app/.env` and set the URL to the computer running the API. The API defaults to port `4000`:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.35:4000
```

Restart Expo after changing `.env`:

```bash
npm start -- --clear
```

When using a physical phone, do not use `localhost`: use the computer's Wi-Fi IPv4 address, ensure the phone and computer are on the same network, and allow inbound TCP port `4000` through the Windows firewall if prompted.

### Where API configuration conflicts occur

| Setting | Location | Required value |
| --- | --- | --- |
| Mobile API URL | `mobile-app/.env` | The computer's LAN IP with `:4000` |
| Shareable mobile template | `mobile-app/.env.example` | Same format; update it if the development LAN changes |
| API server port | `API/src_ts/config/index.ts` | Defaults to `4000`, unless overridden by `API/.env` `PORT` |
| API URL validation | `mobile-app/app.config.js` and `mobile-app/src/config.ts` | Requires `EXPO_PUBLIC_API_URL`; both use the same configured value |

The app deliberately stops with a clear message when the mobile URL is missing, instead of silently falling back to a different port.

Replace mock data in `constants/mockData.ts` with real endpoints:

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
