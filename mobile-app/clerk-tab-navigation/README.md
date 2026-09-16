# Clerk Tab Navigation — Files

This package contains the Clerk tab screens and navigator, plus the patched
`api.ts`, laid out to match your repo's folder structure. Copy the
`mobile-app/` folder contents into your branch (or copy individual files).

## Files included

- `mobile-app/src/api.ts` — your existing api.ts with `updateRoomStatus` added
- `mobile-app/src/navigation/ClerkTabNavigator.tsx`
- `mobile-app/src/tabs/DashboardTabScreen.tsx`
- `mobile-app/src/tabs/QueueTabScreen.tsx`
- `mobile-app/src/tabs/RoomsTabScreen.tsx`
- `mobile-app/src/tabs/ClerkProfileTabScreen.tsx`

## Not included — check before use

- `mobile-app/src/theme/tokens.ts` (`colors`, `spacing`, `typography`, `radii`)
  is imported by every screen here but wasn't confirmed to exist in your repo.
  If you don't have it yet, you'll need to create it or swap these imports for
  your actual style source.
- Backend support for `PATCH /api/v1/rooms/{roomId}/status` is unconfirmed —
  verify it exists before shipping `RoomsTabScreen`.

## Manual edit still needed: `App.tsx`

This wasn't regenerated as a full file since I don't have your current
`App.tsx` — apply this diff by hand:

1. Add the import:
   ```tsx
   import { ClerkTabNavigator } from './navigation/ClerkTabNavigator';
   ```

2. Replace the Clerk branch of your role-based screen switch:
   ```tsx
   {user.role === 'CLERK' ? (
     <AppStack.Screen name="ClerkTabs">
       {() => <ClerkTabNavigator user={user} />}
     </AppStack.Screen>
   ) : (
     <AppStack.Screen name="EmployeeTabs">
       {({ navigation }) => (
         <EmployeeTabNavigator
           user={user}
           onOpenRoom={(room: Room) => navigation.navigate('RoomDetail', { room })}
           onOpenBookingDetail={(booking: Booking) => navigation.navigate('History')}
         />
       )}
     </AppStack.Screen>
   )}
   ```

## Suggested commit flow

```bash
git checkout mobile-app-tab-navigation-design-18cd3
git checkout -b feature/clerk-tab-navigation
# copy in the files from this package
git add .
git commit -m "feat: Add Clerk tab navigation and screens"
git push origin feature/clerk-tab-navigation
```
