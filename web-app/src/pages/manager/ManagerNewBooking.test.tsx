import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ManagerNewBooking from "./ManagerNewBooking";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/components/ManagerLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockedApiFetch = vi.mocked(apiFetch);

describe("ManagerNewBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/rooms") return [{ id: 3, name: "Boardroom", capacity: 12, status: "AVAILABLE", amenities: [{ id: 9, name: "Projector" }] }] as never;
      if (path === "/amenities") return [{ id: 9, name: "Projector" }] as never;
      if (path === "/bookings" ) return { id: 22, status: "PENDING" } as never;
      throw new Error(`Unexpected request: ${path}`);
    });
  });

  afterEach(() => cleanup());

  it("submits a manager booking with the selected room, amenity, time, and capacity", async () => {
    render(<MemoryRouter><ManagerNewBooking /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "New booking" }).closest(".mo-header")).toBeTruthy();
    expect(screen.getByRole("link", { name: "All bookings" }).className).toContain("mo-back-link");
    const bookingForm = await screen.findByRole("form", { name: "New booking form" });
    expect(bookingForm.className).toContain("mo-form");
    expect(bookingForm.querySelector(".manager-booking-form-row")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Rooms" }).className).toContain("manager-booking-group");
    expect(screen.getByRole("group", { name: "Amenities (optional)" }).className).toContain("manager-booking-group");

    fireEvent.change(await screen.findByLabelText("Purpose"), { target: { value: "Quarterly planning" } });
    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2026-10-07T09:00" } });
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "2026-10-07T10:00" } });
    fireEvent.change(screen.getByLabelText("Capacity"), { target: { value: "8" } });
    fireEvent.click(screen.getByLabelText(/Boardroom/));
    fireEvent.click(screen.getByLabelText("Projector"));
    fireEvent.click(screen.getByRole("button", { name: "Create booking" }));

    await waitFor(() => expect(mockedApiFetch).toHaveBeenCalledWith(
      "/bookings",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          purpose: "Quarterly planning",
          startAt: new Date("2026-10-07T09:00").toISOString(),
          endAt: new Date("2026-10-07T10:00").toISOString(),
          roomIds: [3],
          amenityIds: [9],
          capacity: 8,
        }),
      }),
    ));
    expect(await screen.findByText("Booking created successfully.")).toBeTruthy();
  });

  it("shows API errors when a manager booking cannot be created", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/rooms") return [{ id: 3, name: "Boardroom", capacity: 12, status: "AVAILABLE", amenities: [] }] as never;
      if (path === "/amenities") return [] as never;
      if (path === "/bookings") throw new Error("Room is not available");
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<MemoryRouter><ManagerNewBooking /></MemoryRouter>);

    fireEvent.change(await screen.findByLabelText("Purpose"), { target: { value: "Quarterly planning" } });
    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2026-10-07T09:00" } });
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "2026-10-07T10:00" } });
    fireEvent.change(screen.getByLabelText("Capacity"), { target: { value: "8" } });
    fireEvent.click(screen.getByLabelText(/Boardroom/));
    fireEvent.click(screen.getByRole("button", { name: "Create booking" }));

    expect(await screen.findByText("Room is not available")).toBeTruthy();
  });
});
