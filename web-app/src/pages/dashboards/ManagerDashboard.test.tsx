import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerDashboard from "./ManagerDashboard";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/components/ManagerLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockedApiFetch = vi.mocked(apiFetch);

describe("ManagerDashboard recent bookings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the four latest-created bookings regardless of meeting start time", async () => {
    const bookings = [
      { id: 1, purpose: "Old request, late meeting", createdAt: "2026-09-24T09:00:00Z", startAt: "2026-10-20T09:00:00Z", endAt: "2026-10-20T10:00:00Z", status: "CONFIRMED", employee: { id: 1, name: "One", email: "one@example.com" }, rooms: [{ room: { id: 1, name: "Room One", capacity: 8 } }] },
      { id: 2, purpose: "Newest request, early meeting", createdAt: "2026-09-28T09:00:00Z", startAt: "2026-09-29T09:00:00Z", endAt: "2026-09-29T10:00:00Z", status: "CONFIRMED", employee: { id: 2, name: "Two", email: "two@example.com" }, rooms: [{ room: { id: 2, name: "Room Two", capacity: 8 } }] },
      { id: 3, purpose: "Second newest", createdAt: "2026-09-27T09:00:00Z", startAt: "2026-10-01T09:00:00Z", endAt: "2026-10-01T10:00:00Z", status: "PREPARING", employee: { id: 3, name: "Three", email: "three@example.com" }, rooms: [{ room: { id: 3, name: "Room Three", capacity: 8 } }] },
      { id: 4, purpose: "Third newest", createdAt: "2026-09-26T09:00:00Z", startAt: "2026-09-26T09:00:00Z", endAt: "2026-09-26T10:00:00Z", status: "READY", employee: { id: 4, name: "Four", email: "four@example.com" }, rooms: [{ room: { id: 4, name: "Room Four", capacity: 8 } }] },
      { id: 5, purpose: "Fourth newest", createdAt: "2026-09-25T09:00:00Z", startAt: "2026-10-03T09:00:00Z", endAt: "2026-10-03T10:00:00Z", status: "CONFIRMED", employee: { id: 5, name: "Five", email: "five@example.com" }, rooms: [{ room: { id: 5, name: "Room Five", capacity: 8 } }] },
      { id: 6, purpose: "Fifth newest", createdAt: "2026-09-24T10:00:00Z", startAt: "2026-09-25T09:00:00Z", endAt: "2026-09-25T10:00:00Z", status: "CONFIRMED", employee: { id: 6, name: "Six", email: "six@example.com" }, rooms: [{ room: { id: 6, name: "Room Six", capacity: 8 } }] },
    ];
    mockedApiFetch.mockImplementation(async (path: string) =>
      (path === "/bookings" ? bookings : []) as never,
    );

    render(
      <MemoryRouter>
        <ManagerDashboard />
      </MemoryRouter>,
    );

    const recentSection = (await screen.findByRole("heading", { name: "Recent Bookings" })).closest("section");
    const renderedPurposes = within(recentSection as HTMLElement)
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    expect(renderedPurposes).toEqual([
      "Newest request, early meeting",
      "Second newest",
      "Third newest",
      "Fourth newest",
    ]);
  });
});