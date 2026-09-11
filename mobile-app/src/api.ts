import { API_BASE_URL } from './config';
import { clearTokens, getRefreshToken, getToken, saveTokens } from './lib/storage';
import { mapBooking, mapRoom, mapUser, toCreateBookingBody } from './lib/mapApi';
import type { Booking, Room, User } from './types';

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
  return (
    path.includes('/auth/login') ||
    path.includes('/auth/register') ||
    path.includes('/auth/refresh') ||
    path.includes('/auth/register-manager')
  );
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function refreshAccessToken() {
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !__retry && !isAuthRoute(path)) {
    await refreshAccessToken();
    return request(path, {
      ...options,
      __retry: true,
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
    });
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

export async function getMe(): Promise<User> {
  const raw = await request('/api/v1/me');
  return mapUser(raw);
}

export async function getRooms(): Promise<Room[]> {
  const raw = await request('/api/v1/rooms');
  const list = Array.isArray(raw) ? raw : [];
  return list.map(mapRoom).filter((r) => r.isActive);
}

export async function searchAvailability(params: {
  startAt: string;
  endAt: string;
  capacity?: number;
  amenityIds?: (string | number)[];
}): Promise<Room[]> {
  const q = new URLSearchParams();
  q.set('startAt', params.startAt);
  q.set('endAt', params.endAt);
  if (params.capacity) q.set('capacity', String(params.capacity));
  if (params.amenityIds?.length) {
    q.set('amenityIds', params.amenityIds.map(String).join(','));
  }
  const raw = await request(`/api/v1/rooms/availability?${q.toString()}`);
  const list = Array.isArray(raw) ? raw : [];
  return list.map(mapRoom);
}

export async function getAmenities() {
  const raw = await request('/api/v1/amenities');
  return Array.isArray(raw) ? raw : [];
}

export async function getBookings(): Promise<Booking[]> {
  const raw = await request('/api/v1/bookings');
  const list = Array.isArray(raw) ? raw : [];
  return list.map(mapBooking);
}

export async function createBooking(payload: {
  purpose: string;
  startAt: string;
  endAt: string;
  roomIds: string[] | number[];
  amenityIds: string[] | number[];
  capacity: number;
}): Promise<Booking> {
  const body = toCreateBookingBody(payload);
  const raw = await request('/api/v1/bookings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapBooking(raw);
}

export async function cancelBooking(id: string | number): Promise<Booking> {
  const raw = await request(`/api/v1/bookings/${id}/cancel`, { method: 'PATCH' });
  return mapBooking(raw);
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
  searchAvailability,
  getAmenities,
  getBookings,
  createBooking,
  cancelBooking,
};
