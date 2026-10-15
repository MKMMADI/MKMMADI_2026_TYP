import { strToU8, zipSync } from "fflate";

export type ReportTab = "usage" | "availability" | "popularity";
type PdfDocument = import("jspdf").jsPDF;
type ReportPayload = Record<string, any> | null;

type ReportSection = {
  title: string;
  columns: string[];
  rows: unknown[][];
};

export type ReportExport = {
  title: string;
  dateRange: string;
  summary: [string, unknown][];
  sections: ReportSection[];
};

function valueOrZero(value: unknown) {
  return value ?? 0;
}

export function buildReportExport(
  tab: ReportTab,
  reports: {
    usage: ReportPayload;
    availability: ReportPayload;
    popularity: ReportPayload;
  },
  startDate: string,
  endDate: string,
): ReportExport | null {
  const report = reports[tab];
  if (!report) return null;

  if (tab === "usage") {
    return {
      title: "Space Usage Report",
      dateRange: `${startDate} to ${endDate}`,
      summary: [
        ["Total bookings", valueOrZero(report.summary?.totalBookings)],
        ["Hours booked", valueOrZero(report.summary?.totalHoursBooked)],
        ["Rooms used", valueOrZero(report.summary?.totalRoomsUsed)],
        ["Unique employees", valueOrZero(report.summary?.uniqueEmployees)],
      ],
      sections: [
        {
          title: "Room usage",
          columns: ["Room", "Bookings", "Hours", "Average duration (hours)", "Unique employees", "Amenities"],
          rows: (report.roomUsage ?? []).map((room: any) => [
            room.roomName,
            room.bookings,
            room.totalHours,
            room.averageDuration,
            room.uniqueEmployees,
            (room.amenities ?? []).join("; "),
          ]),
        },
        {
          title: "Department usage",
          columns: ["Department", "Bookings", "Hours", "Unique employees"],
          rows: (report.departmentUsage ?? []).map((department: any) => [
            department.department,
            department.bookings,
            department.totalHours,
            department.uniqueEmployees,
          ]),
        },
        {
          title: "Daily trend",
          columns: ["Date", "Bookings", "Hours"],
          rows: (report.dailyTrend ?? []).map((day: any) => [day.date, day.bookings, day.totalHours ?? 0]),
        },
      ],
    };
  }

  if (tab === "availability") {
    return {
      title: "Room Availability Report",
      dateRange: `${startDate} to ${endDate}`,
      summary: [
        ["Total rooms", valueOrZero(report.summary?.totalRooms)],
        ["Available rooms", valueOrZero(report.summary?.availableRooms)],
        ["Maintenance rooms", valueOrZero(report.summary?.maintenanceRooms)],
        ["Out of service rooms", valueOrZero(report.summary?.outOfServiceRooms)],
        ["Availability rate (%)", valueOrZero(report.summary?.availabilityRate)],
        ["Bookings in period", valueOrZero(report.summary?.totalBookingsInPeriod)],
      ],
      sections: [
        {
          title: "Room bookings",
          columns: ["Room", "Bookings", "Utilization rate (%)"],
          rows: (report.roomBreakdown ?? []).map((room: any) => [
            room.roomName,
            room.bookings,
            room.utilizationRate,
          ]),
        },
        {
          title: "Daily availability",
          columns: ["Date", "Bookings", "Rooms booked", "Rooms available"],
          rows: (report.dailyBreakdown ?? []).map((day: any) => [
            day.date,
            day.bookings,
            day.roomsBooked,
            day.roomsAvailable,
          ]),
        },
      ],
    };
  }

  return {
    title: "Room Popularity Report",
    dateRange: `${startDate} to ${endDate}`,
    summary: [
      ["Total bookings", valueOrZero(report.summary?.totalBookings)],
      ["Rooms used", valueOrZero(report.summary?.totalRoomsUsed)],
      ["Unique employees", valueOrZero(report.summary?.uniqueEmployees)],
      ["Average bookings per room", valueOrZero(report.summary?.averageBookingsPerRoom)],
    ],
    sections: [
      {
        title: "Top rooms",
        columns: [
          "Rank",
          "Room",
          "Popularity score",
          "Bookings",
          "Hours",
          "Unique employees",
          "Average booking duration (minutes)",
          "Trend",
          "Trend change (%)",
          "Amenities",
        ],
        rows: (report.topRooms ?? []).map((room: any) => [
          room.rank,
          room.roomName,
          room.popularityScore,
          room.totalBookings,
          room.totalHours,
          room.uniqueUsers,
          room.averageBookingDuration,
          room.trend,
          room.trendPercentage,
          (room.amenities ?? []).join("; "),
        ]),
      },
    ],
  };
}

function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildReportCsv(report: ReportExport) {
  return `\uFEFF${buildReportRows(report).map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function buildReportRows(report: ReportExport): unknown[][] {
  const rows: unknown[][] = [
    [report.title],
    ["Date range", report.dateRange],
    ["Generated", new Date().toISOString()],
    [],
    ["Summary"],
    ["Metric", "Value"],
    ...report.summary,
    [],
  ];

  for (const section of report.sections) {
    rows.push([section.title], section.columns);
    rows.push(...section.rows, []);
  }

  return rows;
}

function escapeXml(value: string) {
  return Array.from(value)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint === 9 || codePoint === 10 || codePoint === 13 || codePoint >= 32;
    })
    .join("")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number) {
  let number = index + 1;
  let name = "";
  while (number > 0) {
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }
  return name;
}

export function buildReportXlsx(report: ReportExport) {
  const rows = buildReportRows(report);
  const worksheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
      if (typeof value === "number" && Number.isFinite(value)) {
        return `<c r="${reference}" t="n"><v>${value}</v></c>`;
      }
      const text = escapeXml(String(value ?? ""));
      return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  const sheetName = report.title.replace(/[\u005B\]:*?/\\]/g, "").slice(0, 31) || "Report";
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
  const rootRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const workbookRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${worksheetRows}</sheetData></worksheet>`;

  return zipSync({
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rootRelationships),
    "xl/workbook.xml": strToU8(workbook),
    "xl/_rels/workbook.xml.rels": strToU8(workbookRelationships),
    "xl/worksheets/sheet1.xml": strToU8(worksheet),
  });
}

function addPdfPageHeader(pdf: PdfDocument, report: ReportExport, continued = false) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text(`${report.title}${continued ? " (continued)" : ""}`, 14, 14);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Date range: ${report.dateRange}`, 14, 20);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 20, { align: "right" });
  pdf.setDrawColor(205, 216, 216);
  pdf.line(14, 24, pageWidth - 14, 24);
}

export async function buildReportPdfDocument(report: ReportExport): Promise<PdfDocument> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;
  let y = 31;

  const nextPage = () => {
    pdf.addPage();
    addPdfPageHeader(pdf, report, true);
    y = 31;
  };

  addPdfPageHeader(pdf, report);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  let summaryX = margin;
  let summaryY = y;
  const summaryGap = 8;
  const summaryColumnWidth = usableWidth / 4;
  for (const [index, [label, value]] of report.summary.entries()) {
    const col = index % 4;
    if (index > 0 && col === 0) summaryY += 11;
    summaryX = margin + col * summaryColumnWidth;
    pdf.setFont("helvetica", "bold");
    pdf.text(String(label), summaryX, summaryY);
    pdf.setFont("helvetica", "normal");
    pdf.text(String(value ?? 0), summaryX, summaryY + 5);
  }
  y = summaryY + summaryGap + 7;

  for (const section of report.sections) {
    if (y > pageHeight - 25) nextPage();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(section.title, margin, y);
    y += 7;

    const columnWidth = usableWidth / Math.max(section.columns.length, 1);
    const drawColumnHeader = () => {
      pdf.setFillColor(234, 243, 241);
      pdf.rect(margin, y - 4, usableWidth, 8, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      section.columns.forEach((column, index) => {
        const lines = pdf.splitTextToSize(column, columnWidth - 2);
        pdf.text(lines[0] ?? "", margin + index * columnWidth + 1, y + 1);
      });
      pdf.setFont("helvetica", "normal");
      y += 8;
    };
    drawColumnHeader();

    if (section.rows.length === 0) {
      pdf.setFontSize(8);
      pdf.text("No data for this period.", margin, y);
      y += 7;
      continue;
    }

    for (const row of section.rows) {
      const cellLines = section.columns.map((_, index) =>
        pdf.splitTextToSize(String(row[index] ?? ""), columnWidth - 2) as string[],
      );
      const rowHeight = Math.max(5, ...cellLines.map((lines) => lines.length * 3.5)) + 2;
      if (y + rowHeight > pageHeight - 14) {
        nextPage();
        drawColumnHeader();
      }
      cellLines.forEach((lines, index) => {
        pdf.text(lines, margin + index * columnWidth + 1, y, { maxWidth: columnWidth - 2 });
      });
      y += rowHeight;
      pdf.setDrawColor(228, 234, 234);
      pdf.line(margin, y - 1, margin + usableWidth, y - 1);
    }
    y += 7;
  }

  return pdf;
}

export async function createReportPdf(report: ReportExport, fileName: string) {
  const pdf = await buildReportPdfDocument(report);
  pdf.save(fileName);
}

export function reportFileName(tab: ReportTab, startDate: string, endDate: string, extension: string) {
  return `bookspace-${tab}-report-${startDate}-to-${endDate}.${extension}`;
}

export function downloadCsv(content: string, fileName: string) {
  downloadBlob(new Blob([content], { type: "text/csv;charset=utf-8" }), fileName);
}

export function downloadXlsx(content: Uint8Array, fileName: string) {
  const bytes = new Uint8Array(content.byteLength);
  bytes.set(content);
  downloadBlob(
    new Blob([bytes.buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName,
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
