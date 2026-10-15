import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ManagerLayout from "./ManagerLayout";
import { apiFetch, logout } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn(), logout: vi.fn() }));

const mockedApiFetch = vi.mocked(apiFetch);
const mockedLogout = vi.mocked(logout);

describe("ManagerLayout navigation", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });
  beforeEach(() => vi.clearAllMocks());

  it("toggles and persists the manager color theme", async () => {
    window.localStorage.setItem("bookspace-theme", "dark");
    mockedApiFetch.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={["/manager/dashboard"]}>
        <Routes>
          <Route path="/manager/dashboard" element={<ManagerLayout><div>Overview content</div></ManagerLayout>} />
        </Routes>
      </MemoryRouter>,
    );

    const toggle = screen.getByRole("button", { name: "Switch to light mode" });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.dataset.theme).toBe("dark");

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Switch to dark mode" }).getAttribute("aria-pressed")).toBe("false");
    await waitFor(() => expect(window.localStorage.getItem("bookspace-theme")).toBe("light"));
  });

  it("defaults to dark mode and respects a saved light preference", async () => {
    mockedApiFetch.mockResolvedValue([]);

    const { unmount } = render(
      <MemoryRouter initialEntries={["/manager/dashboard"]}>
        <Routes>
          <Route path="/manager/dashboard" element={<ManagerLayout><div>Overview content</div></ManagerLayout>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Switch to light mode" }).getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.dataset.theme).toBe("dark");
    unmount();

    window.localStorage.setItem("bookspace-theme", "light");
    render(
      <MemoryRouter initialEntries={["/manager/dashboard"]}>
        <Routes>
          <Route path="/manager/dashboard" element={<ManagerLayout><div>Overview content</div></ManagerLayout>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Switch to dark mode" }).getAttribute("aria-pressed")).toBe("false");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("shows a direct Dashboard link and a live badge based on eligible rooms", async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    mockedApiFetch.mockResolvedValue([
      { id: 1, status: "PREPARING", startAt: today, rooms: [{ room: { id: 1 } }, { room: { id: 2 } }] },
      { id: 2, status: "PREPARING", startAt: yesterday, rooms: [{ room: { id: 3 } }] },
      { id: 3, status: "READY", startAt: today, rooms: [{ room: { id: 4 } }] },
    ]);

    render(
      <MemoryRouter initialEntries={["/manager/queue"]}>
        <Routes>
          <Route path="/manager/dashboard" element={<ManagerLayout><div>Overview content</div></ManagerLayout>} />
          <Route path="/manager/queue" element={<ManagerLayout><div>Queue content</div></ManagerLayout>} />
        </Routes>
      </MemoryRouter>,
    );

    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboardLink.getAttribute("href")).toBe("/manager/dashboard");
    expect(dashboardLink.className).not.toContain("active");
    expect(screen.queryByRole("button", { name: /Dashboard/ })).toBeNull();
    await waitFor(() => expect(screen.getByLabelText("2 rooms in progress")).toBeTruthy());
    expect(mockedApiFetch).toHaveBeenCalledWith("/bookings?status=PREPARING");

    fireEvent.click(dashboardLink);
    expect(screen.getByText("Overview content")).toBeTruthy();
    expect(dashboardLink.className).toContain("active");
  });

  it("logs out from the persistent top bar and returns to sign-in", async () => {
    mockedApiFetch.mockResolvedValue([]);
    mockedLogout.mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={["/manager/dashboard"]}>
        <Routes>
          <Route path="/manager/dashboard" element={<ManagerLayout><div>Overview content</div></ManagerLayout>} />
          <Route path="/login" element={<div>Sign-in page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const newBookingButton = screen.getByRole("link", { name: /New booking/ });
    const logoutButton = screen.getByRole("button", { name: "Log out" });
    const topBarControls = Array.from(newBookingButton.parentElement!.children);
    const newBookingIndex = topBarControls.findIndex((control) => control === newBookingButton);
    const logoutIndex = topBarControls.findIndex((control) => control === logoutButton);
    expect(newBookingIndex).toBeGreaterThanOrEqual(0);
    expect(logoutIndex).toBeGreaterThan(newBookingIndex);

    fireEvent.click(logoutButton);

    await waitFor(() => expect(mockedLogout).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Sign-in page")).toBeTruthy();
  });

  it("shows a count and unread-message previews in the top-bar notification menu", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/bookings?status=PREPARING") return [];
      if (path === "/bookings") {
        return [
          { id: 1, status: "PENDING" },
          { id: 2, status: "RESCHEDULE_REQUIRED" },
          { id: 3, status: "CONFIRMED" },
        ] as never;
      }
      if (path === "/consumables/low-stock") return [{ id: 1 }, { id: 2 }] as never;
      if (path === "/conversations") {
        return [
          {
            id: 7,
            participant: { name: "Jordan Employee" },
            unreadCount: 3,
            lastMessage: { body: "Please confirm the booking" },
          },
          {
            id: 8,
            participant: { name: "Casey Clerk" },
            unreadCount: 0,
            lastMessage: null,
          },
        ] as never;
      }
      return [] as never;
    });

    render(
      <MemoryRouter initialEntries={["/manager/dashboard"]}>
        <Routes>
          <Route path="/manager/dashboard" element={<ManagerLayout><div>Overview content</div></ManagerLayout>} />
          <Route path="/manager/notifications" element={<div>Notifications page</div>} />
          <Route path="/manager/messages" element={<div>Messages page</div>} />
          <Route path="/manager/bookings/new" element={<div>Booking page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const notificationButton = await screen.findByRole("button", { name: "Notifications 7" });
    fireEvent.click(notificationButton);
    expect(await screen.findByText("Please confirm the booking")).toBeTruthy();
    expect(screen.getByRole("link", { name: "View all notifications" }).getAttribute("href")).toBe("/manager/notifications");
    expect(screen.getByRole("link", { name: /Jordan Employee.*3 unread.*Please confirm the booking/ }).getAttribute("href")).toBe("/manager/messages");
    expect(screen.getByRole("link", { name: /New booking/ }).getAttribute("href")).toBe("/manager/bookings/new");
  });
});