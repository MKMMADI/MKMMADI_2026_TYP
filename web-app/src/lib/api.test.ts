import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, logout } from "./api";

describe("logout", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("revokes the current session and clears browser tokens", async () => {
    localStorage.setItem("accessToken", "access-token");
    localStorage.setItem("refreshToken", "refresh-token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await logout();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/auth/logout",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
        body: JSON.stringify({ refreshToken: "refresh-token" }),
      }),
    );
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
  });

  it("clears local and session tokens when the logout request fails", async () => {
    sessionStorage.setItem("accessToken", "session-access");
    sessionStorage.setItem("refreshToken", "session-refresh");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network unavailable")));

    await expect(logout()).rejects.toThrow("Network unavailable");
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(sessionStorage.getItem("accessToken")).toBeNull();
    expect(sessionStorage.getItem("refreshToken")).toBeNull();
  });
});

describe("apiFetch token refresh", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("shares a rotating refresh token across concurrent 401 retries", async () => {
    localStorage.setItem("accessToken", "expired-access");
    localStorage.setItem("refreshToken", "single-use-refresh");
    let initialRequests = 0;
    let refreshRequests = 0;
    let resolveRefresh!: (response: unknown) => void;
    const refreshResponse = new Promise<unknown>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        refreshRequests += 1;
        return refreshResponse;
      }
      const authorization = new Headers(init?.headers).get("Authorization");
      if (authorization === "Bearer expired-access") {
        initialRequests += 1;
        return { ok: false, status: 401, json: async () => ({ message: "Invalid token" }) };
      }
      return { ok: true, status: 200, json: async () => ({ authorization }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const firstRequest = apiFetch<{ authorization: string }>("/reports/usage");
    const secondRequest = apiFetch<{ authorization: string }>("/reports/availability");
    await vi.waitFor(() => {
      expect(initialRequests).toBe(2);
      expect(refreshRequests).toBe(1);
    });
    resolveRefresh({
      ok: true,
      status: 200,
      json: async () => ({ accessToken: "fresh-access", refreshToken: "rotated-refresh" }),
    });

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      { authorization: "Bearer fresh-access" },
      { authorization: "Bearer fresh-access" },
    ]);
    expect(refreshRequests).toBe(1);
    expect(localStorage.getItem("accessToken")).toBe("fresh-access");
    expect(localStorage.getItem("refreshToken")).toBe("rotated-refresh");
  });

  it("uses the store containing the access token when the other store only has a refresh token", async () => {
    localStorage.setItem("refreshToken", "stale-refresh");
    sessionStorage.setItem("accessToken", "session-access");
    sessionStorage.setItem("refreshToken", "session-refresh");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/me");

    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization"))
      .toBe("Bearer session-access");
  });

  it("preserves caller headers while overriding authorization with the refreshed token", async () => {
    sessionStorage.setItem("accessToken", "expired-session-access");
    sessionStorage.setItem("refreshToken", "session-refresh");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Invalid token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accessToken: "new-session-access", refreshToken: "new-session-refresh" }),
      })
      .mockImplementationOnce(async (_url: string, init?: RequestInit) => ({
        ok: true,
        status: 200,
        json: async () => ({
          authorization: new Headers(init?.headers).get("Authorization"),
          customHeader: new Headers(init?.headers).get("X-Request-Id"),
        }),
      }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/reports/usage", {
      headers: { "X-Request-Id": "request-123" },
    })).resolves.toEqual({
      authorization: "Bearer new-session-access",
      customHeader: "request-123",
    });
  });
});