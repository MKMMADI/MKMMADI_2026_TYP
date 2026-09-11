export const AUTH_TOKEN_KEY = 'auth_access_token';
export const REFRESH_TOKEN_KEY = 'auth_refresh_token';

/**
 * Base URL of the Express API (no trailing slash).
 * - Physical device: your machine LAN IP, e.g. http://192.168.0.35:4000
 * - Android emulator: http://10.0.2.2:4000
 * - iOS simulator: http://localhost:4000
 * Set via EXPO_PUBLIC_API_URL in .env or app.config.js extra.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.35:4000';
