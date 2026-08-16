const API_URL = import.meta.env.VITE_API_URL;

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    accessToken?: string;
    refreshToken?: string;
  };

  if (!response.ok || !body.accessToken || !body.refreshToken) {
    throw new Error(body.message ?? "Unable to sign in. Please try again.");
  }

  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
  };
}

export async function getCurrentUser(accessToken: string) {
  const response = await fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error("Could not retrieve your profile.");
  return response.json() as Promise<{
    id: number;
    name: string;
    email: string;
    role: "EMPLOYEE" | "CLERK" | "MANAGER";
  }>;
}