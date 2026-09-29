import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import ManagerBookings from "./ManagerBookings";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/components/ManagerLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockedApiFetch = vi.mocked(apiFetch);
const availableClerks = [
  { id: 12, name: "Casey Clerk", email: "casey@example.com" },
  { id: 13, name: "Jordan Clerk", email: "jordan@example.com" },
];

interface BookingFixture {
  id: number;
  purpose: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED";
  assignedClerkId?: number | null;
  assignedClerk?: (typeof availableClerks)[number] | null;
  employee: { id: number; name: string; email: string };
  rooms: { room: { id: number; name: string; capacity: number } }[];
  amenities: never[];
}

function makeBooking(status: "PENDING" | "CONFIRMED"): BookingFixture {
  return {
    id: 7,
    purpose: "Facilities review",
    startAt: "2026-09-29T09:00:00.000Z",
    endAt: "2026-09-29T10:00:00.000Z",
    status,
    employee: { id: 3, name: "Taylor Employee", email: "taylor@example.com" },
    rooms: [{ room: { id: 1, name: "Boardroom", capacity: 10 } }],
    amenities: [],
  };
}

let bookings: BookingFixture[];

describe("ManagerBookings clerk assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookings = [makeBooking("PENDING")];
    mockedApiFetch.mockImplementation(async (path: string, options?: RequestInit) => {
      if (path === "/bookings") return bookings as never;
      if (path === "/bookings/assignable-clerks") return availableClerks as never;
      if (path === "/bookings/rejection-reasons") return [] as never;
      if (path === "/bookings/7/assignment") {
        const { clerkId } = JSON.parse(String(options?.body)) as { clerkId: number | null };
        const assignedClerk = availableClerks.find((clerk) => clerk.id === clerkId) ?? null;
        return { ...bookings[0], assignedClerkId: clerkId, assignedClerk } as never;
      }
      return {} as never;
    });
  });

  afterEach(() => cleanup());

  it("allows a manager to assign a clerk before approving a booking", async () => {
    render(<ManagerBookings />);

    const assignment = await screen.findByRole("combobox", { name: "Assign clerk for Facilities review" });
    fireEvent.change(assignment, { target: { value: "12" } });

    await waitFor(() => expect(mockedApiFetch).toHaveBeenCalledWith(
      "/bookings/7/assignment",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ clerkId: 12 }) }),
    ));
    expect(await screen.findByText("Casey Clerk assigned to booking.")).toBeTruthy();
    expect((screen.getByRole("combobox", { name: "Assign clerk for Facilities review" }) as HTMLSelectElement).value).toBe("12");
  });

  it("allows reassignment or unassignment after a booking is confirmed", async () => {
    bookings = [{ ...makeBooking("CONFIRMED"), assignedClerkId: 12, assignedClerk: availableClerks[0] }];
    render(<ManagerBookings />);

    fireEvent.click(screen.getByRole("button", { name: "Confirmed" }));
    const assignment = await screen.findByRole("combobox", { name: "Assign clerk for Facilities review" });
    expect((assignment as HTMLSelectElement).value).toBe("12");

    fireEvent.change(assignment, { target: { value: "13" } });
    await waitFor(() => expect(mockedApiFetch).toHaveBeenCalledWith(
      "/bookings/7/assignment",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ clerkId: 13 }) }),
    ));

    fireEvent.change(screen.getByRole("combobox", { name: "Assign clerk for Facilities review" }), { target: { value: "" } });
    await waitFor(() => expect(mockedApiFetch).toHaveBeenCalledWith(
      "/bookings/7/assignment",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ clerkId: null }) }),
    ));
  });
});