const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

function getTokenStorage(): Storage | null {
  if (localStorage.getItem("accessToken") || localStorage.getItem("refreshToken")) {
    return localStorage;
  }
  if (sessionStorage.getItem("accessToken") || sessionStorage.getItem("refreshToken")) {
    return sessionStorage;
  }
  return null;
}

function clearStoredTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("refreshToken");
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
