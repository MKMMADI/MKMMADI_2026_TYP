import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import {
  buildReportXlsx,
  buildReportPdfDocument,
  buildReportCsv,
  buildReportExport,
  reportFileName,
} from "./reportExports";

describe("report exports", () => {
  it("exports the full selected usage report with its date range and details", () => {
    const report = buildReportExport("usage", {
      usage: {
        summary: { totalBookings: 8, totalHoursBooked: 12.5, totalRoomsUsed: 2, uniqueEmployees: 5 },
        roomUsage: [{
          roomName: 'Boardroom, "Atlas"',
          bookings: 4,
          totalHours: 7.5,
          averageDuration: 1.9,
          uniqueEmployees: 3,
          amenities: ["Display", "Wi-Fi"],
        }],
        departmentUsage: [{ department: "Finance", bookings: 4, totalHours: 7.5, uniqueEmployees: 2 }],
        dailyTrend: [{ date: "2026-10-12", bookings: 4, totalHours: 7.5 }],
      },
      availability: null,
      popularity: null,
    }, "2026-10-01", "2026-10-12");

    expect(report?.dateRange).toBe("2026-10-01 to 2026-10-12");
    expect(report?.sections).toHaveLength(3);
    expect(report?.sections[0].rows[0]).toContain('Boardroom, "Atlas"');
    expect(report && buildReportCsv(report)).toContain('"Boardroom, ""Atlas"""');
    expect(report && buildReportCsv(report)).toContain('"2026-10-12","4","7.5"');
  });

  it("exports availability and popularity as separate selected reports", () => {
    const availability = buildReportExport("availability", {
      usage: null,
      availability: {
        summary: { totalRooms: 4, availableRooms: 3, maintenanceRooms: 1, totalBookingsInPeriod: 8 },
        roomBreakdown: [{ roomName: "Atlas", bookings: 8, utilizationRate: 200 }],
        dailyBreakdown: [{ date: "2026-10-12", bookings: 2, roomsBooked: 2, roomsAvailable: 2 }],
      },
      popularity: null,
    }, "2026-10-01", "2026-10-12");
    const popularity = buildReportExport("popularity", {
      usage: null,
      availability: null,
      popularity: {
        summary: { totalBookings: 8, totalRoomsUsed: 2, uniqueEmployees: 5, averageBookingsPerRoom: 4 },
        topRooms: [{
          rank: 1,
          roomName: "=HYPERLINK(\"unsafe\")",
          popularityScore: 1,
          totalBookings: 8,
          totalHours: 12,
          uniqueUsers: 5,
          averageBookingDuration: 90,
          trend: "rising",
          trendPercentage: 10,
          amenities: [],
        }],
      },
    }, "2026-10-01", "2026-10-12");

    expect(availability?.sections[1].rows[0]).toEqual(["2026-10-12", 2, 2, 2]);
    expect(popularity && buildReportCsv(popularity)).toContain("'=HYPERLINK");
  });

  it("creates a valid Excel workbook with escaped, non-formula text cells", () => {
    const report = buildReportExport("popularity", {
      usage: null,
      availability: null,
      popularity: {
        summary: { totalBookings: 8, totalRoomsUsed: 2, uniqueEmployees: 5, averageBookingsPerRoom: 4 },
        topRooms: [{
          rank: 1,
          roomName: '=HYPERLINK("unsafe") & Atlas',
          popularityScore: 1,
          totalBookings: 8,
          totalHours: 12,
          uniqueUsers: 5,
          averageBookingDuration: 90,
          trend: "rising",
          trendPercentage: 10,
          amenities: [],
        }],
      },
    }, "2026-10-01", "2026-10-12");
    if (!report) throw new Error("Expected a popularity report to export");

    const workbook = unzipSync(buildReportXlsx(report));
    const workbookXml = strFromU8(workbook["xl/workbook.xml"]);
    const worksheet = strFromU8(workbook["xl/worksheets/sheet1.xml"]);
    const parser = new DOMParser();

    expect(workbook["[Content_Types].xml"]).toBeDefined();
    expect(parser.parseFromString(workbookXml, "application/xml").querySelector("parsererror")).toBeNull();
    expect(parser.parseFromString(worksheet, "application/xml").querySelector("parsererror")).toBeNull();
    expect(workbookXml).toContain("Room Popularity Report");
    expect(worksheet).toContain("t=\"inlineStr\"");
    expect(worksheet).toContain("&amp; Atlas");
    expect(worksheet).toContain("=HYPERLINK(&quot;unsafe&quot;)");
    expect(worksheet).not.toContain("<f>");
    expect(reportFileName("popularity", "2026-10-01", "2026-10-12", "xlsx"))
      .toBe("bookspace-popularity-report-2026-10-01-to-2026-10-12.xlsx");
  });

  it("uses descriptive date-bounded filenames and returns no export before data loads", () => {
    expect(reportFileName("availability", "2026-10-01", "2026-10-12", "pdf"))
      .toBe("bookspace-availability-report-2026-10-01-to-2026-10-12.pdf");
    expect(buildReportExport("usage", {
      usage: null,
      availability: null,
      popularity: null,
    }, "2026-10-01", "2026-10-12")).toBeNull();
  });

  it("generates a valid PDF document for the selected report", async () => {
    const report = buildReportExport("availability", {
      usage: null,
      availability: {
        summary: { totalRooms: 4, availableRooms: 3 },
        roomBreakdown: [{ roomName: "Atlas", bookings: 8, utilizationRate: 200 }],
        dailyBreakdown: [],
      },
      popularity: null,
    }, "2026-10-01", "2026-10-12");
    if (!report) throw new Error("Expected an availability report to export");
    const pdf = await buildReportPdfDocument(report);
    expect(pdf.output()).toContain("%PDF-");
    expect(pdf.getNumberOfPages()).toBeGreaterThan(0);
  });
});
