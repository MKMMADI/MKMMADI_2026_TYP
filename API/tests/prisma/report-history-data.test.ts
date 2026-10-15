/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Verifies database behavior for report history data.
 */

import { BookingStatus } from "@prisma/client";
import {
  buildReportHistory,
  REPORT_HISTORY_MARKER,
  withoutExistingRoomConflicts,
} from "../../prisma/report-history-data";

const rooms = [
  { id: 5, name: "Focus Pod" },
  { id: 2, name: "Atlas Boardroom" },
  { id: 9, name: "Studio" },
  { id: 12, name: "Horizon Room" },
  { id: 15, name: "Baobab" },
];
const employees = Array.from({ length: 12 }, (_, index) => ({ id: index + 1 }));
const now = new Date("2026-10-12T12:00:00.000Z");

describe("buildReportHistory", () => {
  it("creates deterministic, labeled bookings over the prior 180 days", () => {
    const bookings = buildReportHistory(rooms, employees, now);

    expect(bookings.length).toBeGreaterThan(400);
    expect(bookings).toEqual(buildReportHistory(rooms, employees, now));
    expect(bookings.every((booking) => booking.purpose.startsWith(REPORT_HISTORY_MARKER))).toBe(true);
    expect(bookings.every((booking) => booking.startAt < now && booking.endAt > booking.startAt)).toBe(true);
    expect(new Set(bookings.map((booking) => booking.roomId))).toEqual(new Set(rooms.map((room) => room.id)));
    expect(new Set(bookings.map((booking) => booking.employeeId))).toEqual(new Set(employees.map((employee) => employee.id)));
  });

  it("includes recent weekday activity and reportable booking-status variety", () => {
    const bookings = buildReportHistory(rooms, employees, now);
    const recentCutoff = new Date(now);
    recentCutoff.setUTCDate(recentCutoff.getUTCDate() - 14);
    const statuses = new Set(bookings.map((booking) => booking.status));

    expect(bookings.filter((booking) => booking.startAt >= recentCutoff).length).toBeGreaterThan(20);
    expect(statuses).toEqual(new Set([
      BookingStatus.COMPLETED,
      BookingStatus.CANCELLED,
      BookingStatus.RESCHEDULE_REQUIRED,
    ]));
    expect(bookings.every((booking) => booking.startAt.getUTCHours() >= 6 && booking.startAt.getUTCHours() <= 12)).toBe(true);
  });

  it("shows a stronger booking trend in the recent month than six months earlier", () => {
    const bookings = buildReportHistory(rooms, employees, now);
    const recentStart = new Date(now);
    recentStart.setUTCDate(recentStart.getUTCDate() - 30);
    const earlierStart = new Date(now);
    earlierStart.setUTCDate(earlierStart.getUTCDate() - 180);
    const earlierEnd = new Date(now);
    earlierEnd.setUTCDate(earlierEnd.getUTCDate() - 150);
    const recentBookings = bookings.filter((booking) => booking.startAt >= recentStart).length;
    const earlierBookings = bookings.filter(
      (booking) => booking.startAt >= earlierStart && booking.startAt < earlierEnd,
    ).length;

    expect(recentBookings).toBeGreaterThan(earlierBookings);
  });

  it("does not schedule overlapping sessions in the same room", () => {
    const bookings = buildReportHistory(rooms, employees, now);
    const byRoom = new Map<number, typeof bookings>();

    for (const booking of bookings) {
      const roomBookings = byRoom.get(booking.roomId) ?? [];
      roomBookings.push(booking);
      byRoom.set(booking.roomId, roomBookings);
    }

    for (const roomBookings of byRoom.values()) {
      roomBookings.sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
      for (let index = 1; index < roomBookings.length; index += 1) {
        expect(roomBookings[index].startAt.getTime()).toBeGreaterThanOrEqual(roomBookings[index - 1].endAt.getTime());
      }
    }
  });

  it("skips only generated sessions that overlap existing bookings in the same room", () => {
    const bookings = buildReportHistory(rooms, employees, now);
    const candidate = bookings[0];
    const kept = withoutExistingRoomConflicts(bookings, [{
      startAt: new Date(candidate.startAt.getTime() + 15 * 60 * 1000),
      endAt: new Date(candidate.endAt.getTime() + 15 * 60 * 1000),
      rooms: [{ roomId: candidate.roomId }],
    }]);

    expect(kept).toHaveLength(bookings.length - 1);
    expect(kept).not.toContain(candidate);
  });

  it("requires rooms and employees", () => {
    expect(() => buildReportHistory([], employees, now)).toThrow("At least one available room");
    expect(() => buildReportHistory(rooms, [], now)).toThrow("At least one available room");
  });
});
