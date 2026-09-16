#!/usr/bin/env bash
set -euo pipefail
SRC="${1:?Usage: $0 /path/to/ui-fix-book-overlay}"
ROOT="$(pwd)"
[ -d "$ROOT/mobile-app/src" ] || { echo "Run from repo root"; exit 1; }
cp -v "$SRC/mobile-app/src/components/RoomCard.tsx" "$ROOT/mobile-app/src/components/RoomCard.tsx"
cp -v "$SRC/mobile-app/src/screens/RoomDetailScreen.tsx" "$ROOT/mobile-app/src/screens/RoomDetailScreen.tsx"
cp -v "$SRC/mobile-app/src/screens/BookingScreen.tsx" "$ROOT/mobile-app/src/screens/BookingScreen.tsx"
cp -v "$SRC/mobile-app/src/tabs/MyBookingsTabScreen.tsx" "$ROOT/mobile-app/src/tabs/MyBookingsTabScreen.tsx"
cp -v "$SRC/mobile-app/src/navigation/EmployeeTabNavigator.tsx" "$ROOT/mobile-app/src/navigation/EmployeeTabNavigator.tsx"
echo "Done. Reload Expo."
