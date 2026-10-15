import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerReports from "./ManagerReports";
import { apiFetch } from "@/lib/api";
import * as reportExports from "@/lib/reportExports";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/components/ManagerLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockedApiFetch = vi.mocked(apiFetch);

describe("ManagerReports chart explanations", () => {
  beforeEach(() => {
    cleanup();
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

  it("exports the active report after loading and disables export for an unrefreshed range", async () => {
    const csvSpy = vi.spyOn(reportExports, "downloadCsv").mockImplementation(() => {});
    const excelSpy = vi.spyOn(reportExports, "downloadXlsx").mockImplementation(() => {});
    const pdfSpy = vi.spyOn(reportExports, "createReportPdf").mockResolvedValue();
    render(
      <MemoryRouter>
        <ManagerReports />
      </MemoryRouter>,
    );

    const csvButton = await screen.findByRole("button", { name: "Export CSV" });
    const excelButton = screen.getByRole("button", { name: "Export Excel" });
    const pdfButton = screen.getByRole("button", { name: "Export PDF" });
    expect(csvButton.hasAttribute("disabled")).toBe(false);
    expect(excelButton.hasAttribute("disabled")).toBe(false);
    expect(pdfButton.hasAttribute("disabled")).toBe(false);

    fireEvent.click(csvButton);
    fireEvent.click(excelButton);
    fireEvent.click(pdfButton);
    expect(csvSpy).toHaveBeenCalledWith(
      expect.stringContaining("Room usage"),
      expect.stringMatching(/bookspace-usage-report-.*\.csv/),
    );
    expect(excelSpy).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.stringMatching(/bookspace-usage-report-.*\.xlsx/),
    );
    expect(pdfSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Space Usage Report" }),
      expect.stringMatching(/bookspace-usage-report-.*\.pdf/),
    );

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-01-01" } });
    expect(csvButton.hasAttribute("disabled")).toBe(true);
    expect(excelButton.hasAttribute("disabled")).toBe(true);
    expect(pdfButton.hasAttribute("disabled")).toBe(true);
  });
});
