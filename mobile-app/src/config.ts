import Constants from 'expo-constants';

export const AUTH_TOKEN_KEY = 'auth_access_token';
export const REFRESH_TOKEN_KEY = 'auth_refresh_token';

/**
 * Resolve the API base URL in order of preference:
 * 1. EXPO_PUBLIC_API_URL from mobile-app/.env (injected by Expo at runtime)
 * 2. app.config.js extra.apiUrl (also sourced from EXPO_PUBLIC_API_URL)
 *
 * Example .env:
 *   EXPO_PUBLIC_API_URL=http://172.30.128.1:4000
 *
 * Paths in src/api.ts already include `/api/v1/...`, so this value should be
 * the host only (no trailing `/api/v1`). A trailing `/api/v1` is stripped for sockets.
 */
function resolveApiUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' && typeof process.env?.EXPO_PUBLIC_API_URL === 'string'
      ? process.env.EXPO_PUBLIC_API_URL.trim()
      : '';

  const fromExtra = Constants.expoConfig?.extra?.apiUrl;
  const fromExtraString = typeof fromExtra === 'string' ? fromExtra.trim() : '';

  const resolved = fromEnv || fromExtraString;

  if (!resolved) {
    throw new Error(
      'API URL is not configured. Create mobile-app/.env with EXPO_PUBLIC_API_URL ' +
        '(e.g. EXPO_PUBLIC_API_URL=http://172.30.128.1:4000) and restart Expo with a clear cache: npx expo start -c',
    );
  }

  return resolved.replace(/\/+$/, '');
}

export const API_BASE_URL = resolveApiUrl();

/** Socket.IO origin: strip a trailing /api/v1 if present so the client hits the API host. */
export const API_SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
