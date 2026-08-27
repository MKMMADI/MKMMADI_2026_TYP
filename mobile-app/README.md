# mobile-app — Employee Conference Room Booking (Airbnb-inspired)

React Native + Expo client for **employees**. Visual language follows Airbnb DESIGN.md: warm white canvas, Rausch `#FF385C` primary, soft rounded photo-first room cards, and a pill search bar.

## Features

- Home with Airbnb-style search bar (date · time · capacity · amenities)
- Photo-first room cards (capacity, floor, amenities, rating, favourite)
- Mock data ready to swap for the real API (`/rooms/availability`, `POST /bookings`, `/me`)
- Design tokens in `src/theme/tokens.ts`

## Quick start

```bash
cd mobile-app
npm install
npx expo start
```

Scan the QR with Expo Go, or press `a` / `i` for an emulator.

## Project layout

```
mobile-app/
  src/
    App.js                 # Entry → HomeScreen
    theme/tokens.ts        # Airbnb design tokens
    types/index.ts
    constants/mockData.ts
    components/
      Button.tsx
      RoomCard.tsx
      SearchBar.tsx
    screens/
      HomeScreen.tsx
  app.json
  package.json
  assets/
```

## Connecting to the API

Point requests at the Express API in the `API/` folder. Replace mock data in `src/constants/mockData.ts` with real calls:

- `POST /auth/login` / `POST /auth/register`
- `GET /rooms/availability?startAt=&endAt=&capacity=&amenityIds=`
- `POST /bookings`
- `GET /me` and `GET /me/bookings`

## Design notes

- Primary: `#FF385C` (Rausch)
- Canvas: `#FFFFFF`
- Ink: `#222222`
- Soft radii (8–14px cards, full pill search)
- Photo-first listing cards with “Guest favorite” badge and heart
