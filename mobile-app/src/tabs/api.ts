import { API_BASE_URL } from './config';
import { clearTokens, getRefreshToken, getToken, saveTokens } from './lib/storage';

let accessToken: string | null = null;
let refreshToken: string | null = null;

type RequestOptions = RequestInit & { __retry?: boolean };

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setRefreshToken(token: string | null) {
  refreshToken = token;
}

export async function hydrateTokens() {
  const token = await getToken();
  const nextRefreshToken = await getRefreshToken();
  accessToken = token;
  refreshToken = nextRefreshToken;
  return { accessToken: token, refreshToken: nextRefreshToken };
}

export async function persistTokens(newAccessToken: string, newRefreshToken?: string) {
  const nextRefreshToken = newRefreshToken || refreshToken || '';
  await saveTokens(newAccessToken, nextRefreshToken);
  accessToken = newAccessToken;
  refreshToken = nextRefreshToken;
}

export async function signOut() {
  accessToken = null;
  refreshToken = null;
  await clearTokens();
}

function isAuthRoute(path: string) {
  return path.includes('/auth/login') || path.includes('/auth/register') || path.includes('/auth/refresh') || path.includes('/auth/register-manager');
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
}

export async function refreshAccessToken() {
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  const body = await parseJsonResponse(response);

  if (!response.ok) {
    await signOut();
    throw new Error(body?.message || 'Your session has expired. Please sign in again.');
  }

  if (body?.accessToken) {
    await persistTokens(body.accessToken, body.refreshToken || refreshToken);
  }

  return accessToken;
}

async function request(path: string, options: RequestOptions = {}) {
  const { __retry = false } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (accessToken && !isAuthRoute(path)) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !__retry && !isAuthRoute(path)) {
    try {
      await refreshAccessToken();
      return request(path, { ...options, __retry: true, headers: { ...headers, Authorization: `Bearer ${accessToken}` } });
    } catch (error) {
      throw error;
    }
  }

  const body = await parseJsonResponse(response);

  if (!response.ok) {
    const err = new Error(body?.message || `Request failed: ${response.status}`);
    (err as any).status = response.status;
    (err as any).body = body;
    throw err;
  }

  return body;
}

export async function login(email: string, password: string) {
  const body = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (body?.accessToken) {
    await persistTokens(body.accessToken, body.refreshToken || refreshToken || '');
  }

  return body;
}

export async function register(payload: {
  name: string;
  email: string;
  password: string;
  role?: string;
  department?: string;
  contactNumber?: string;
}) {
  const body = await request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (body?.accessToken) {
    await persistTokens(body.accessToken, body.refreshToken || refreshToken || '');
  }

  return body;
}

export async function getMe() {
  return request('/api/v1/me');
}

export async function getRooms() {
  return request('/api/v1/rooms');
}

export async function getBookings() {
  return request('/api/v1/bookings');
}

export async function updateBookingStatus(id: number | string, status: string) {
  return request(`/api/v1/bookings/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function createBooking(payload: any) {
  return request('/api/v1/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function toggleFavorite(roomId: string) {
  // No UserFavorite table in Prisma yet — persist on-device.
  const { toggleFavoriteRoomId } = await import('./lib/preferences');
  const isFavorite = await toggleFavoriteRoomId(String(roomId));
  return { roomId: String(roomId), isFavorite };
}



export async function getOccupancy(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const q = params.toString();
  return request(`/api/v1/bookings/occupancy${q ? `?${q}` : ''}`);
}

export async function searchAvailability(params: {
  startAt?: string;
  endAt?: string;
  capacity?: number;
  amenityIds?: string[];
}) {
  const qs = new URLSearchParams();
  if (params.startAt) qs.set('startAt', params.startAt);
  if (params.endAt) qs.set('endAt', params.endAt);
  if (params.capacity) qs.set('capacity', String(params.capacity));
  if (params.amenityIds?.length) qs.set('amenityIds', params.amenityIds.join(','));
  const q = qs.toString();
  return request(`/api/v1/rooms/availability${q ? `?${q}` : ''}`);
}

export async function cancelBooking(id: number | string) {
  return request(`/api/v1/bookings/${id}/cancel`, {
    method: 'PATCH',
  });
}

export async function updateRoomStatus(roomId: string, status: string) {
  return request(`/api/v1/rooms/${roomId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export default {
  setAccessToken,
  setRefreshToken,
  hydrateTokens,
  persistTokens,
  signOut,
  refreshAccessToken,
  login,
  register,
  getMe,
  getRooms,
  getBookings,
  updateBookingStatus,
  createBooking,
  toggleFavorite,
  updateRoomStatus,
  cancelBooking,
  getOccupancy,
  searchAvailability,
};
