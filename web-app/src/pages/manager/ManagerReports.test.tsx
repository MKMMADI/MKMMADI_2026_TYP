import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerReports from "./ManagerReports";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/components/ManagerLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockedApiFetch = vi.mocked(apiFetch);

describe("ManagerReports chart explanations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/reports/usage")) {
        return {
          summary: {},
          dailyTrend: [{ date: "2026-10-08", bookings: 2 }],
          roomUsage: [{ roomId: 1, roomName: "Boardroom", totalHours: 3 }],
          departmentUsage: [{ department: "Finance", bookings: 2 }],
        } as never;
      }
      if (path.startsWith("/reports/availability")) {
        return {
          summary: {},
          dailyBreakdown: [{ date: "2026-10-08", bookings: 2, roomsBooked: 1, roomsAvailable: 3 }],
        } as never;
      }
      return {
        summary: {},
        topRooms: [{ roomId: 1, roomName: "Boardroom", totalBookings: 2 }],
      } as never;
    });
  });

  it("explains each chart in the usage, availability, and popularity reports", async () => {
    render(
      <MemoryRouter>
        <ManagerReports />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/Each column shows the number of bookings on that date/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Total booked hours per room for this date range/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Compares booking counts across departments/),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Availability" }));
    expect(
      screen.getByText(/this chart counts bookings, not free rooms/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Compares the average number of booked and free rooms per day/),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Popularity" }));
    expect(
      screen.getByText(/Ranks rooms by their total bookings in this date range/),
    ).toBeTruthy();
  });
});
