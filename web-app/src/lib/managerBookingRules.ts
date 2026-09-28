export interface QueueBookingSummary {
  id: number;
  status: string;
  startAt: string;
  rooms: readonly unknown[];
}

export interface RecentBookingSummary {
  id: number;
  createdAt: string;
}

export function startOfLocalToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function getPresentPreparingBookings<T extends QueueBookingSummary>(
  bookings: readonly T[],
  now = new Date(),
): T[] {
  const today = startOfLocalToday(now).getTime();
  return bookings.filter((booking) => {
    const startAt = new Date(booking.startAt).getTime();
    return booking.status === "PREPARING" && Number.isFinite(startAt) && startAt >= today;
  });
}

export function countPresentPreparingRooms(
  bookings: readonly QueueBookingSummary[],
  now = new Date(),
) {
  return getPresentPreparingBookings(bookings, now).reduce(
    (total, booking) => total + booking.rooms.length,
    0,
  );
}

export function getRecentBookings<T extends RecentBookingSummary>(bookings: readonly T[], limit = 4) {
  return [...bookings]
    .sort((a, b) => {
      const createdAtDifference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return createdAtDifference || b.id - a.id;
    })
    .slice(0, limit);
}