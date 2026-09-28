import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ManagerLayout from "./ManagerLayout";
import { apiFetch, logout } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn(), logout: vi.fn() }));

const mockedApiFetch = vi.mocked(apiFetch);
const mockedLogout = vi.mocked(logout);

describe("ManagerLayout navigation", () => {
  afterEach(() => cleanup());
  beforeEach(() => vi.clearAllMocks());

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

    const newBookingButton = screen.getByRole("button", { name: /New booking/ });
    const logoutButton = screen.getByRole("button", { name: "Log out" });
    const topBarButtons = Array.from(newBookingButton.parentElement!.querySelectorAll("button"));
    const newBookingIndex = topBarButtons.findIndex((button) => button === newBookingButton);
    const logoutIndex = topBarButtons.findIndex((button) => button === logoutButton);
    expect(newBookingIndex).toBeGreaterThanOrEqual(0);
    expect(logoutIndex).toBeGreaterThan(newBookingIndex);

    fireEvent.click(logoutButton);

    await waitFor(() => expect(mockedLogout).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Sign-in page")).toBeTruthy();
  });
});