import { describe, expect, it } from "vitest";
import {
  countPresentPreparingRooms,
  getPresentPreparingBookings,
  getRecentBookings,
} from "./managerBookingRules";

describe("manager booking rules", () => {
  it("counts rooms for present and future preparing bookings only", () => {
    const now = new Date(2026, 8, 28, 12, 0, 0);
    const bookings = [
      {
        id: 1,
        status: "PREPARING",
        startAt: new Date(2026, 8, 28, 0, 0, 0).toISOString(),
        rooms: [{}, {}],
      },
      {
        id: 2,
        status: "PREPARING",
        startAt: new Date(2026, 8, 29, 9, 0, 0).toISOString(),
        rooms: [{}],
      },
      {
        id: 3,
        status: "PREPARING",
        startAt: new Date(2026, 8, 27, 23, 59, 59).toISOString(),
        rooms: [{}, {}, {}],
      },
      {
        id: 4,
        status: "CONFIRMED",
        startAt: new Date(2026, 8, 28, 13, 0, 0).toISOString(),
        rooms: [{}],
      },
      {
        id: 5,
        status: "READY",
        startAt: new Date(2026, 8, 28, 14, 0, 0).toISOString(),
        rooms: [{}],
      },
    ];

    expect(getPresentPreparingBookings(bookings, now).map(({ id }) => id)).toEqual([1, 2]);
    expect(countPresentPreparingRooms(bookings, now)).toBe(3);
  });

  it("sorts newest-created bookings first and uses descending IDs for timestamp ties", () => {
    const bookings = [
      { id: 1, createdAt: "2026-09-27T09:00:00.000Z", startAt: "2026-10-01T09:00:00.000Z" },
      { id: 3, createdAt: "2026-09-28T09:00:00.000Z", startAt: "2026-09-28T09:00:00.000Z" },
      { id: 2, createdAt: "2026-09-28T09:00:00.000Z", startAt: "2026-09-25T09:00:00.000Z" },
      { id: 4, createdAt: "2026-09-26T09:00:00.000Z", startAt: "2026-10-03T09:00:00.000Z" },
      { id: 5, createdAt: "2026-09-25T09:00:00.000Z", startAt: "2026-09-20T09:00:00.000Z" },
    ];

    expect(getRecentBookings(bookings).map(({ id }) => id)).toEqual([3, 2, 1, 4]);
  });
});