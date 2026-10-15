import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ManagerNotifications from "./ManagerNotifications";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/components/ManagerLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockedApiFetch = vi.mocked(apiFetch);
const bookings = [
  {
    id: 15,
    purpose: "Quarterly planning",
    status: "PENDING",
    startAt: "2026-10-08T09:00:00.000Z",
    endAt: "2026-10-08T10:00:00.000Z",
    createdAt: "2026-10-06T08:00:00.000Z",
    updatedAt: "2026-10-06T08:00:00.000Z",
    employee: { id: 15, employeeId: "EMP-ID-15", name: "Jordan Lee", email: "jordan@example.com", role: "EMPLOYEE", officialRole: null, department: "Planning", contactNumber: "+27 81 000 0015" },
    rooms: [{ room: { id: 1, name: "Boardroom", capacity: 12 } }],
    amenities: [],
  },
  {
    id: 16,
    purpose: "Board review",
    status: "RESCHEDULE_REQUIRED",
    startAt: "2026-10-09T09:00:00.000Z",
    createdAt: "2026-10-07T08:00:00.000Z",
    employee: { name: "Casey Smith" },
    rooms: [{ room: { name: "Conference Room" } }],
  },
  {
    id: 17,
    purpose: "Historical planning",
    status: "PENDING",
    startAt: "2026-09-22T09:00:00.000Z",
    createdAt: "2026-09-20T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    endAt: "2026-09-22T10:00:00.000Z",
    employee: { name: "Morgan Lee", employeeId: "EMP-ID-OLD", department: "Finance", contactNumber: "+27 82 000 0000", officialRole: null, role: "EMPLOYEE", email: "morgan@example.com" },
    rooms: [{ room: { name: "Small Room", capacity: 4 } }],
    amenities: [],
  },
];
const lowStockItems = [
  { id: 2, name: "Printer paper", unit: "reams", quantityOnHand: 1, reorderLevel: 5, updatedAt: "2026-10-07T07:00:00.000Z" },
];
const conversations = [{
  id: 4,
  participant: { id: 8, name: "Taylor Employee", role: "EMPLOYEE" },
  unreadCount: 2,
  lastMessage: { id: 33, body: "Please confirm the room setup", createdAt: "2026-10-06T10:00:00.000Z" },
}];

describe("ManagerNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/consumables/low-stock") return lowStockItems as never;
      if (path === "/bookings") return bookings as never;
      if (path === "/conversations") return conversations as never;
      if (path === "/bookings/15/approve") return { ...bookings[0], status: "CONFIRMED" } as never;
      if (path === "/bookings/rejection-reasons") return [
        { code: "ROOM_UNAVAILABLE", label: "Room unavailable / double-booked" },
        { code: "OTHER", label: "Other" },
      ] as never;
      if (path === "/bookings/15/reject") return { ...bookings[0], status: "CANCELLED" } as never;
      throw new Error(`Unexpected request: ${path}`);
    });
  });

  afterEach(() => cleanup());

  it("shows a summary and categorized actionable alerts from all notification sources", async () => {
    render(<MemoryRouter><ManagerNotifications /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Notifications" }).closest(".mb-header")).toBeTruthy();
    expect(screen.getByLabelText("Notification totals by category").className).toContain("mb-summary");
    expect(await screen.findByText("5 notifications", { selector: ".manager-notification-total" })).toBeTruthy();
    expect(screen.getByText("Quarterly planning")).toBeTruthy();
    expect(screen.getByText("Board review")).toBeTruthy();
    expect(screen.queryByText("Historical planning")).toBeNull();
    expect(screen.getByText("Printer paper")).toBeTruthy();
    expect(screen.getByText("Please confirm the room setup")).toBeTruthy();
    expect(screen.getByText("2 unread")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Review booking" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "View inventory" }).getAttribute("href")).toBe("/manager/inventory");
    expect(screen.getByRole("link", { name: "Open messages" }).getAttribute("href")).toBe("/manager/messages");
    expect(screen.queryByRole("button", { name: /mark all as read/i })).toBeNull();
    expect(screen.queryByRole("tab", { name: /read|unread/i })).toBeNull();
  });

  it("filters notifications by category and search term", async () => {
    render(<MemoryRouter><ManagerNotifications /></MemoryRouter>);
    await screen.findByText("Quarterly planning");

    fireEvent.change(screen.getByLabelText("Filter by category"), { target: { value: "inventory" } });
    expect(screen.getByText("Printer paper")).toBeTruthy();
    expect(screen.queryByText("Quarterly planning")).toBeNull();

    fireEvent.change(screen.getByLabelText("Filter notifications"), { target: { value: "paper" } });
    expect(screen.getByText("Printer paper")).toBeTruthy();
    expect(screen.getByText("1 notification")).toBeTruthy();
  });

  it("filters notifications by inclusive date range", async () => {
    render(<MemoryRouter><ManagerNotifications /></MemoryRouter>);
    await screen.findByText("Quarterly planning");

    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-10-07" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-10-07" } });

    expect(screen.getByText("Board review")).toBeTruthy();
    expect(screen.getByText("Printer paper")).toBeTruthy();
    expect(screen.queryByText("Quarterly planning")).toBeNull();
    expect(screen.queryByText("Please confirm the room setup")).toBeNull();
  });

  it("defaults to the past seven days and today, and resets filters to that range", async () => {
    render(<MemoryRouter><ManagerNotifications /></MemoryRouter>);
    await screen.findByText("Quarterly planning");

    const today = new Date();
    const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoValue = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, "0")}-${String(weekAgo.getDate()).padStart(2, "0")}`;

    expect((screen.getByLabelText("Start date") as HTMLInputElement).value).toBe(weekAgoValue);
    expect((screen.getByLabelText("End date") as HTMLInputElement).value).toBe(todayValue);
    expect(screen.queryByText("Historical planning")).toBeNull();

    fireEvent.change(screen.getByLabelText("Filter notifications"), { target: { value: "board" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect((screen.getByLabelText("Start date") as HTMLInputElement).value).toBe(weekAgoValue);
    expect((screen.getByLabelText("End date") as HTMLInputElement).value).toBe(todayValue);
    expect((screen.getByLabelText("Filter notifications") as HTMLInputElement).value).toBe("");
  });

  it("opens the selected booking in a modal and approves that exact booking", async () => {
    render(<MemoryRouter><ManagerNotifications /></MemoryRouter>);
    await screen.findByText("Quarterly planning");

    const bookingCard = screen.getByRole("heading", { name: "Quarterly planning" }).closest("article");
    if (!bookingCard) throw new Error("Quarterly planning notification card was not rendered");
    fireEvent.click(within(bookingCard).getByRole("button", { name: "Review booking" }));
    const dialog = screen.getByRole("dialog", { name: "Review booking" });
    expect(within(dialog).getByText(/Jordan Lee/)).toBeTruthy();
    expect(within(dialog).getByText("Boardroom")).toBeTruthy();
    expect(within(dialog).getByText("EMP-ID-15")).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Approve booking" }));
    await waitFor(() => expect(mockedApiFetch).toHaveBeenCalledWith(
      "/bookings/15/approve",
      expect.objectContaining({ method: "PATCH" }),
    ));
    expect(await screen.findByText("Booking approved. Jordan Lee will be notified.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("supports rejecting the selected booking from its review modal", async () => {
    render(<MemoryRouter><ManagerNotifications /></MemoryRouter>);
    await screen.findByText("Quarterly planning");

    const bookingCard = screen.getByRole("heading", { name: "Quarterly planning" }).closest("article");
    if (!bookingCard) throw new Error("Quarterly planning notification card was not rendered");
    fireEvent.click(within(bookingCard).getByRole("button", { name: "Review booking" }));
    const dialog = screen.getByRole("dialog", { name: "Review booking" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject booking" }));
    fireEvent.change(within(dialog).getByLabelText("Reason *"), { target: { value: "ROOM_UNAVAILABLE" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm rejection" }));

    await waitFor(() => expect(mockedApiFetch).toHaveBeenCalledWith(
      "/bookings/15/reject",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ reasonCode: "ROOM_UNAVAILABLE", note: undefined }),
      }),
    ));
    expect(await screen.findByText("Booking rejected. Jordan Lee will be notified.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("reports source loading errors", async () => {
    mockedApiFetch.mockRejectedValue(new Error("Inventory unavailable"));
    render(<MemoryRouter><ManagerNotifications /></MemoryRouter>);

    expect(await screen.findByText("Inventory: Inventory unavailable")).toBeTruthy();
  });

  it("shows an empty state when there are no notifications", async () => {
    mockedApiFetch.mockResolvedValue([] as never);
    render(<MemoryRouter><ManagerNotifications /></MemoryRouter>);

    expect(await screen.findByText("No notifications to show.")).toBeTruthy();
  });

  it("shows a filter-specific empty state when nothing matches", async () => {
    render(<MemoryRouter><ManagerNotifications /></MemoryRouter>);
    await screen.findByText("Quarterly planning");
    fireEvent.change(screen.getByLabelText("Filter notifications"), { target: { value: "missing alert" } });
    expect(screen.getByText("No matching notifications found.")).toBeTruthy();
  });
});
