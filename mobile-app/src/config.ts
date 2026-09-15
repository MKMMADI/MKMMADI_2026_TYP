import Constants from 'expo-constants';

export const AUTH_TOKEN_KEY = 'auth_access_token';
export const REFRESH_TOKEN_KEY = 'auth_refresh_token';

const apiUrl = Constants.expoConfig?.extra?.apiUrl;

if (typeof apiUrl !== 'string' || !apiUrl) {
  throw new Error(
    'API URL is not configured. Set EXPO_PUBLIC_API_URL in mobile-app/.env and restart Expo.'
  );
}

export const API_BASE_URL = apiUrl.replace(/\/+$/, '');
