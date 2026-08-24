const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

function getAccessToken(): string | null {
  return localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}
