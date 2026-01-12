import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "auth_accessToken";
const REFRESH_TOKEN_KEY = "auth_refreshToken";

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string | null) {
  if (!token) return SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  return SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string | null) {
  if (!token) return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
