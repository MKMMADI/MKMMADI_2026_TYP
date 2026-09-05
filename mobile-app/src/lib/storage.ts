import * as SecureStore from 'expo-secure-store';
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../config';

export async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getToken() {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
