import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ManagerQueue from "./ManagerQueue";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/components/ManagerLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockedApiFetch = vi.mocked(apiFetch);

function booking(id: number, purpose: string, status: string, startAt: Date, roomCount: number) {
  return {
    id,
    purpose,
    status,
    startAt: startAt.toISOString(),
    endAt: new Date(startAt.getTime() + 60 * 60 * 1000).toISOString(),
    employee: { id: id + 100, name: `Employee ${id}`, email: `employee${id}@example.com` },
    rooms: Array.from({ length: roomCount }, (_, index) => ({
      room: { id: index + 1, name: `Room ${id}-${index + 1}`, capacity: 8 },
    })),
    amenities: [],
  };
}

describe("ManagerQueue", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows only present/future preparing bookings and counts their rooms", async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const laterToday = new Date(today.getTime() + 13 * 60 * 60 * 1000);
    mockedApiFetch.mockResolvedValue([
      booking(1, "Today preparing", "PREPARING", today, 2),
      booking(2, "Future preparing", "PREPARING", tomorrow, 1),
      booking(3, "Past preparing", "PREPARING", yesterday, 3),
      booking(4, "Confirmed booking", "CONFIRMED", laterToday, 1),
      booking(5, "Ready booking", "READY", laterToday, 1),
    ]);

    const { container } = render(<ManagerQueue />);
    await screen.findByText("Today preparing");

    expect(container.querySelector(".mq-summary-card--preparing strong")?.textContent).toBe("3");

    fireEvent.click(screen.getByRole("button", { name: /In progress/ }));
    expect(screen.getByText("Today preparing")).toBeTruthy();
    expect(screen.getByText("Future preparing")).toBeTruthy();
    expect(screen.queryByText("Past preparing")).toBeNull();
    expect(screen.queryByText("Confirmed booking")).toBeNull();
    expect(screen.queryByText("Ready booking")).toBeNull();
    expect(container.querySelectorAll(".mq-card")).toHaveLength(2);
  });

  it("reloads queue data when returning to the page", async () => {
    mockedApiFetch.mockResolvedValue([]);
    render(<ManagerQueue />);
    await screen.findByText("No bookings in this part of the queue.");

    window.dispatchEvent(new Event("focus"));
    await waitFor(() => expect(mockedApiFetch.mock.calls.length).toBeGreaterThan(1));
  });
});