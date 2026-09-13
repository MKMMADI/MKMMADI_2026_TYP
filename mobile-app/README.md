# mobile-app — BookSpace (Expo)

Full **mobile app** for **employees** and **clerks** (managers use the web app). Styling: `src/theme/tokens.ts` (navy `#16324F`).

## Roles in one app

| Role | Home after login | Main flows |
|------|------------------|------------|
| **EMPLOYEE** | Browse rooms | Search/list rooms, book, history, profile |
| **CLERK** | Preparation queue | Update prep status (incl. reverse), stock (placeholder), profile |

Login uses the same screen; routing is based on `user.role` from `GET /api/v1/me`.

## API

- Auth: login, refresh, me
- Employee: rooms, create booking, my bookings
- Clerk: queue bookings, `PATCH /bookings/:id/status`

## Run

```bash
cd API && npm run dev

cd mobile-app
cp .env.example .env   # EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:4000
npm install
npx expo start -c
```

| Account (seed) | Role |
|----------------|------|
| `thandi.mokoena@bookspace.co.za` | Employee |
| `sipho.dlamini@bookspace.co.za` (or your seed clerk) | Clerk |
| Password | `Password123!` |

## Layout

```
mobile-app/
  app/                 # Expo Router — role home in (app)/index
  src/
    screens/           # Home, Booking*, ClerkQueue, ClerkStock, Profile
    api.ts             # HTTP + status updates
    theme/tokens.ts    # Shared design tokens
```
