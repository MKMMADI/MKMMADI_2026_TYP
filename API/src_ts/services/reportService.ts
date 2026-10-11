import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';

function parsePeriod(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) throw createHttpError('Start date and end date are required', 400);
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw createHttpError('Invalid date format', 400);
  }
  if (end <= start) throw createHttpError('End date must be after start date', 400);
  return { start, end };
}

const activeRooms = () => prisma.room.findMany({
  where: { isActive: true },
  include: { amenities: { include: { amenity: true } } },
});

const round1 = (value: number) => Math.round(value * 10) / 10;

export async function getAvailabilityReport(startDate?: string, endDate?: string) {
  const { start, end } = parsePeriod(startDate, endDate);
  const [rooms, bookings] = await Promise.all([
    activeRooms(),
    prisma.booking.findMany({
      where: {
        status: { notIn: ['CANCELLED', 'RESCHEDULE_REQUIRED'] },
        OR: [
          { startAt: { gte: start, lte: end } },
          { endAt: { gte: start, lte: end } },
          { AND: [{ startAt: { lt: start } }, { endAt: { gt: end } }] },
        ],
      },
      include: { rooms: { include: { room: true } } },
    }),
  ]);
  const totalRooms = rooms.length;
  const roomBookingCounts = rooms.map((room) => {
    const count = bookings.filter((booking) => booking.rooms.some((link) => link.roomId === room.id)).length;
    return { roomId: room.id, roomName: room.name, bookings: count, utilizationRate: totalRooms ? count / totalRooms * 100 : 0 };
  });
  const daysBetween = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  const dailyBreakdown = [];
  for (let i = 0; i <= daysBetween; i += 1) {
    const currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + i);
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const daily = bookings.filter((booking) => booking.startAt >= currentDate && booking.startAt < nextDate);
    const booked = new Set(daily.flatMap((booking) => booking.rooms.map((link) => link.roomId)));
    dailyBreakdown.push({
      date: currentDate.toISOString().split('T')[0],
      bookings: daily.length,
      roomsBooked: booked.size,
      roomsAvailable: totalRooms - booked.size,
    });
  }
  const availableRooms = rooms.filter((room) => room.status === 'AVAILABLE').length;
  return {
    summary: {
      totalRooms: rooms.length,
      availableRooms,
      maintenanceRooms: rooms.filter((room) => room.status === 'MAINTENANCE').length,
      outOfServiceRooms: rooms.filter((room) => room.status === 'OUT_OF_SERVICE').length,
      availabilityRate: totalRooms ? availableRooms / totalRooms * 100 : 0,
      totalBookingsInPeriod: bookings.length,
    },
    roomBreakdown: roomBookingCounts,
    dailyBreakdown,
    period: { startDate: start.toISOString(), endDate: end.toISOString() },
  };
}

export async function getUsageReport(startDate?: string, endDate?: string) {
  const { start, end } = parsePeriod(startDate, endDate);
  const [bookings, rooms] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: { in: ['COMPLETED', 'CONFIRMED', 'READY', 'PREPARING'] },
        startAt: { gte: start, lte: end },
      },
      include: { rooms: { include: { room: true } }, employee: { select: { id: true, name: true, department: true } } },
    }),
    activeRooms(),
  ]);
  const durationHours = (booking: any) => (new Date(booking.endAt).getTime() - new Date(booking.startAt).getTime()) / 3600000;
  const roomUsage = rooms.map((room) => {
    const roomBookings = bookings.filter((booking) => booking.rooms.some((link: any) => link.roomId === room.id));
    const totalHours = roomBookings.reduce((sum, booking) => sum + durationHours(booking), 0);
    return {
      roomId: room.id, roomName: room.name, capacity: room.capacity, bookings: roomBookings.length,
      totalHours: round1(totalHours), uniqueEmployees: new Set(roomBookings.map((booking) => booking.employeeId)).size,
      averageDuration: roomBookings.length ? round1(totalHours / roomBookings.length) : 0,
      amenities: room.amenities.map((link) => link.amenity.name),
    };
  });
  const departmentUsage: Record<string, { bookings: number; totalHours: number; employees: Set<number> }> = {};
  for (const booking of bookings) {
    const department = booking.employee.department || 'Unknown';
    departmentUsage[department] ??= { bookings: 0, totalHours: 0, employees: new Set<number>() };
    departmentUsage[department].bookings += 1;
    departmentUsage[department].totalHours += durationHours(booking);
    departmentUsage[department].employees.add(booking.employeeId);
  }
  const daysBetween = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  const dailyTrend = [];
  for (let i = 0; i <= daysBetween; i += 1) {
    const currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + i);
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const daily = bookings.filter((booking) => booking.startAt >= currentDate && booking.startAt < nextDate);
    dailyTrend.push({
      date: currentDate.toISOString().split('T')[0], bookings: daily.length,
      totalHours: round1(daily.reduce((sum, booking) => sum + durationHours(booking), 0)),
    });
  }
  return {
    summary: {
      totalBookings: bookings.length,
      totalRoomsUsed: new Set(bookings.flatMap((booking) => booking.rooms.map((link: any) => link.roomId))).size,
      totalHoursBooked: round1(bookings.reduce((sum, booking) => sum + durationHours(booking), 0)),
      uniqueEmployees: new Set(bookings.map((booking) => booking.employeeId)).size,
    },
    roomUsage,
    departmentUsage: Object.entries(departmentUsage).map(([department, data]) => ({
      department, bookings: data.bookings, totalHours: round1(data.totalHours), uniqueEmployees: data.employees.size,
    })),
    dailyTrend,
    period: { startDate: start.toISOString(), endDate: end.toISOString() },
  };
}

export async function getPopularityReport(startDate?: string, endDate?: string, limit?: number) {
  const { start, end } = parsePeriod(startDate, endDate);
  const limitCount = limit ? Number(limit) : 10;
  const [bookings, rooms] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: { in: ['COMPLETED', 'CONFIRMED', 'READY', 'PREPARING'] },
        startAt: { gte: start, lte: end },
      },
      include: { rooms: { include: { room: true } } },
    }),
    activeRooms(),
  ]);
  const roomBookings = rooms.map((room) => ({
    room,
    bookings: bookings.filter((booking) => booking.rooms.some((link: any) => link.roomId === room.id)),
  }));
  const durations = (items: any[]) => items.reduce((sum, booking) =>
    sum + (new Date(booking.endAt).getTime() - new Date(booking.startAt).getTime()) / 3600000, 0);
  const maxBookings = Math.max(...roomBookings.map((item) => item.bookings.length), 1);
  const maxHours = Math.max(...roomBookings.map((item) => durations(item.bookings)), 1);
  const maxUsers = Math.max(...roomBookings.map((item) => new Set(item.bookings.map((booking) => booking.employeeId)).size), 1);
  const popularityMetrics = roomBookings.map(({ room, bookings: roomBookingList }) => {
    const totalHours = durations(roomBookingList);
    const totalMinutes = totalHours * 60;
    const uniqueUsers = new Set(roomBookingList.map((booking) => booking.employeeId)).size;
    const score = roomBookingList.length / maxBookings * 0.4 + totalHours / maxHours * 0.3 + uniqueUsers / maxUsers * 0.3;
    const sorted = [...roomBookingList].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const midpoint = Math.floor(sorted.length / 2);
    const average = (items: any[]) => items.length ? durations(items) / items.length : 0;
    const firstAvg = average(sorted.slice(0, midpoint));
    const secondAvg = average(sorted.slice(midpoint));
    return {
      rank: 0, roomId: room.id, roomName: room.name, capacity: room.capacity,
      totalBookings: roomBookingList.length, totalHours: round1(totalHours), uniqueUsers,
      popularityScore: Math.round(score * 100) / 100,
      capacityUtilization: roomBookingList.length && room.capacity > 0 ? 100 : 0,
      averageBookingDuration: roomBookingList.length ? round1(totalMinutes / roomBookingList.length) : 0,
      amenities: room.amenities.map((link) => link.amenity.name),
      trend: secondAvg > firstAvg ? 'rising' : secondAvg < firstAvg ? 'declining' : 'stable',
      trendPercentage: firstAvg > 0 ? Math.round((secondAvg - firstAvg) / firstAvg * 100) : 0,
    };
  });
  const topRooms = popularityMetrics.sort((a, b) => b.popularityScore - a.popularityScore).slice(0, limitCount);
  topRooms.forEach((item, index) => { item.rank = index + 1; });
  const totalRoomsUsed = new Set(bookings.flatMap((booking) => booking.rooms.map((link: any) => link.roomId))).size;
  return {
    topRooms,
    summary: {
      totalBookings: bookings.length, totalRoomsUsed,
      uniqueEmployees: new Set(bookings.map((booking) => booking.employeeId)).size,
      averageBookingsPerRoom: totalRoomsUsed ? round1(bookings.length / totalRoomsUsed) : 0,
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
    },
  };
}
