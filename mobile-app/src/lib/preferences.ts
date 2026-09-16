import * as SecureStore from 'expo-secure-store';

const FAVORITE_ROOM_IDS_KEY = 'mkmmadi_favorite_room_ids';
const RECENT_ROOM_IDS_KEY = 'mkmmadi_recent_room_ids';
const MAX_RECENT = 12;

async function readIdList(key: string): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String).filter(Boolean);
  } catch {
    return [];
  }
}

async function writeIdList(key: string, ids: string[]): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify(ids));
}

export async function getFavoriteRoomIds(): Promise<string[]> {
  return readIdList(FAVORITE_ROOM_IDS_KEY);
}

/** Toggle favorite. Returns true if the room is now favorited. */
export async function toggleFavoriteRoomId(roomId: string): Promise<boolean> {
  const id = String(roomId);
  const current = await getFavoriteRoomIds();
  const exists = current.includes(id);
  const next = exists ? current.filter((x) => x !== id) : [id, ...current];
  await writeIdList(FAVORITE_ROOM_IDS_KEY, next);
  return !exists;
}

export async function getRecentRoomIds(): Promise<string[]> {
  return readIdList(RECENT_ROOM_IDS_KEY);
}

export async function pushRecentRoomId(roomId: string): Promise<void> {
  const id = String(roomId);
  const current = await getRecentRoomIds();
  const next = [id, ...current.filter((x) => x !== id)].slice(0, MAX_RECENT);
  await writeIdList(RECENT_ROOM_IDS_KEY, next);
}

export function applyFavoriteFlags<T extends { id: string | number; isFavorite?: boolean }>(
  rooms: T[],
  favoriteIds: string[],
): T[] {
  const set = new Set(favoriteIds.map(String));
  return rooms.map((r) => ({ ...r, isFavorite: set.has(String(r.id)) }));
}
