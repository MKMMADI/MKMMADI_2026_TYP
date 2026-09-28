const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";
export const API_SOCKET_URL = new URL(API_URL).origin;

function getTokenStorage(): Storage | null {
  if (localStorage.getItem("accessToken") || localStorage.getItem("refreshToken")) {
    return localStorage;
  }
  if (sessionStorage.getItem("accessToken") || sessionStorage.getItem("refreshToken")) {
    return sessionStorage;
  }
  return null;
}

export function getStoredAccessToken() {
  return getTokenStorage()?.getItem("accessToken") || null;
}

export async function getSocketAccessToken() {
  await apiFetch("/me");
  const token = getStoredAccessToken();
  if (!token) throw new Error("No access token available for messaging");
  return token;
}

function clearStoredTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("refreshToken");
}

export async function logout(): Promise<void> {
  const accessToken = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

  try {
    if (accessToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    clearStoredTokens();
  }
}

async function refreshAccessToken(storage: Storage): Promise<string> {
  const refreshToken = storage.getItem("refreshToken");
  if (!refreshToken) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    accessToken?: string;
    refreshToken?: string;
  };

  if (!response.ok || !body.accessToken || !body.refreshToken) {
    throw new Error(body.message || "Your session has expired. Please sign in again.");
  }

  storage.setItem("accessToken", body.accessToken);
  storage.setItem("refreshToken", body.refreshToken);
  return body.accessToken;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const storage = getTokenStorage();
  let accessToken = storage?.getItem("accessToken") || null;
  let hasRetried = false;

  while (true) {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (accessToken) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status !== 401 || hasRetried || !storage || path === "/auth/refresh") {
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message || `Request failed (${response.status})`);
      }
      return response.json() as Promise<T>;
    }

    hasRetried = true;
    try {
      accessToken = await refreshAccessToken(storage);
    } catch (error) {
      clearStoredTokens();
      throw error;
    }
  }
}
