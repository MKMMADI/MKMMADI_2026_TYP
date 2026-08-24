// API/src/controllers/reportController.ts
import { NextFunction, Response } from 'express';
import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';
import { AuthRequest } from '../middleware/auth';
// Import the enums from Prisma client
import { BookingStatus, RoomStatus } from '@prisma/client';

export async function getAvailabilityReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return next(createHttpError('Start date and end date are required', 400));
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(createHttpError('Invalid date format', 400));
    }

    if (end <= start) {
      return next(createHttpError('End date must be after start date', 400));
    }

    // Get all rooms
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      include: {
        amenities: {
          include: { amenity: true },
        },
      },
    });

    // Get bookings within date range
    const bookings = await prisma.booking.findMany({
      where: {
        status: { notIn: ['CANCELLED'] },
        OR: [
          { startAt: { gte: start, lte: end } },
          { endAt: { gte: start, lte: end } },
          { AND: [{ startAt: { lt: start } }, { endAt: { gt: end } }] },
        ],
      },
      include: {
        rooms: {
          include: { room: true },
        },
      },
    });

    // Calculate availability stats
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(r => r.status === 'AVAILABLE').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'MAINTENANCE').length;
    const outOfServiceRooms = rooms.filter(r => r.status === 'OUT_OF_SERVICE').length;

    // Room booking counts
    const roomBookingCounts = rooms.map(room => {
      const count = bookings.filter(b =>
        b.rooms.some(br => br.roomId === room.id)
      ).length;
      return {
        roomId: room.id,
        roomName: room.name,
        bookings: count,
        utilizationRate: totalRooms > 0 ? (count / totalRooms) * 100 : 0,
      };
    });

    // Daily breakdown
    const daysBetween = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const dailyData = [];
    for (let i = 0; i <= daysBetween; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + i);
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const dailyBookings = bookings.filter(b =>
        b.startAt >= currentDate && b.startAt < nextDate
      );

      const dailyBookedRooms = new Set();
      dailyBookings.forEach(b => {
        b.rooms.forEach(br => dailyBookedRooms.add(br.roomId));
      });

      dailyData.push({
        date: currentDate.toISOString().split('T')[0],
        bookings: dailyBookings.length,
        roomsBooked: dailyBookedRooms.size,
        roomsAvailable: totalRooms - dailyBookedRooms.size,
      });
    }

    res.json({
      summary: {
        totalRooms,
        availableRooms,
        maintenanceRooms,
        outOfServiceRooms,
        availabilityRate: totalRooms > 0 ? (availableRooms / totalRooms) * 100 : 0,
        totalBookingsInPeriod: bookings.length,
      },
      roomBreakdown: roomBookingCounts,
      dailyBreakdown: dailyData,
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUsageReport(req: AuthRequest, res: Response, next: NextFunction) {
  
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return next(createHttpError('Start date and end date are required', 400));
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(createHttpError('Invalid date format', 400));
    }

    if (end <= start) {
      return next(createHttpError('End date must be after start date', 400));
    }

    // Get all completed and confirmed bookings
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ['COMPLETED', 'CONFIRMED', 'READY', 'PREPARING'] },
        startAt: { gte: start, lte: end },
      },
      include: {
        rooms: {
          include: { room: true },
        },
        employee: {
          select: { id: true, name: true, department: true },
        },
      },
    });

    // Get all rooms
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      include: {
        amenities: {
          include: { amenity: true },
        },
      },
    });

    // Calculate room usage
    const roomUsage = rooms.map(room => {
      const roomBookings = bookings.filter(b =>
        b.rooms.some(br => br.roomId === room.id)
      );

      const totalHours = roomBookings.reduce((sum, b) => {
        const duration = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / (1000 * 60 * 60);
        return sum + duration;
      }, 0);

      const uniqueEmployees = new Set(roomBookings.map(b => b.employeeId));

      return {
        roomId: room.id,
        roomName: room.name,
        capacity: room.capacity,
        bookings: roomBookings.length,
        totalHours: Math.round(totalHours * 10) / 10,
        uniqueEmployees: uniqueEmployees.size,
        averageDuration: roomBookings.length > 0 ? Math.round((totalHours / roomBookings.length) * 10) / 10 : 0,
        amenities: room.amenities.map(a => a.amenity.name),
      };
    });

    // Department usage breakdown
    const departmentUsage = bookings.reduce((acc, b) => {
      const dept = b.employee.department || 'Unknown';
      if (!acc[dept]) {
        acc[dept] = {
          bookings: 0,
          totalHours: 0,
          employees: new Set(),
        };
      }
      acc[dept].bookings += 1;
      const duration = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / (1000 * 60 * 60);
      acc[dept].totalHours += duration;
      acc[dept].employees.add(b.employeeId);
      return acc;
    }, {} as Record<string, { bookings: number; totalHours: number; employees: Set<number> }>);

    // Daily usage trend
    const daysBetween = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const dailyTrend = [];
    for (let i = 0; i <= daysBetween; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + i);
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const dailyBookings = bookings.filter(b =>
        b.startAt >= currentDate && b.startAt < nextDate
      );

      const dailyHours = dailyBookings.reduce((sum, b) => {
        const duration = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / (1000 * 60 * 60);
        return sum + duration;
      }, 0);

      dailyTrend.push({
        date: currentDate.toISOString().split('T')[0],
        bookings: dailyBookings.length,
        totalHours: Math.round(dailyHours * 10) / 10,
      });
    }

    res.json({
      summary: {
        totalBookings: bookings.length,
        totalRoomsUsed: new Set(bookings.flatMap(b => b.rooms.map(r => r.roomId))).size,
        totalHoursBooked: Math.round(bookings.reduce((sum, b) => {
          const duration = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / (1000 * 60 * 60);
          return sum + duration;
        }, 0) * 10) / 10,
        uniqueEmployees: new Set(bookings.map(b => b.employeeId)).size,
      },
      roomUsage: roomUsage,
      departmentUsage: Object.entries(departmentUsage).map(([department, data]) => ({
        department,
        bookings: data.bookings,
        totalHours: Math.round(data.totalHours * 10) / 10,
        uniqueEmployees: data.employees.size,
      })),
      dailyTrend: dailyTrend,
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPopularityReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate, limit } = req.query;

    if (!startDate || !endDate) {
      return next(createHttpError('Start date and end date are required', 400));
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const limitCount = limit ? Number(limit) : 10;

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(createHttpError('Invalid date format', 400));
    }

    if (end <= start) {
      return next(createHttpError('End date must be after start date', 400));
    }

    // Get bookings with room information
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ['COMPLETED', 'CONFIRMED', 'READY', 'PREPARING'] },
        startAt: { gte: start, lte: end },
      },
      include: {
        rooms: {
          include: { room: true },
        },
      },
    });

    // Get all active rooms
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      include: {
        amenities: {
          include: { amenity: true },
        },
      },
    });

    // Calculate popularity metrics for each room
    const popularityMetrics = rooms.map(room => {
      const roomBookings = bookings.filter(b =>
        b.rooms.some(br => br.roomId === room.id)
      );

      const totalHours = roomBookings.reduce((sum, b) => {
        const duration = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / (1000 * 60 * 60);
        return sum + duration;
      }, 0);

      const totalMinutes = totalHours * 60;
      const capacityUtilization = roomBookings.length > 0 && room.capacity > 0
        ? (roomBookings.reduce((sum, b) => sum + room.capacity, 0) / (roomBookings.length * room.capacity)) * 100
        : 0;

      // Calculate popularity score
      const bookingWeight = 0.4;
      const hourWeight = 0.3;
      const uniqueUsersWeight = 0.3;

      const uniqueUsers = new Set(roomBookings.map(b => b.employeeId)).size;
      const maxBookings = Math.max(...rooms.map(r =>
        bookings.filter(b => b.rooms.some(br => br.roomId === r.id)).length
      ), 1);
      const maxHours = Math.max(...rooms.map(r =>
        bookings.filter(b => b.rooms.some(br => br.roomId === r.id)).reduce((sum, b) => {
          const duration = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / (1000 * 60 * 60);
          return sum + duration;
        }, 0)
      ), 1);
      const maxUsers = Math.max(...rooms.map(r =>
        new Set(bookings.filter(b => b.rooms.some(br => br.roomId === r.id)).map(b => b.employeeId)).size
      ), 1);

      const normalizedBookings = maxBookings > 0 ? roomBookings.length / maxBookings : 0;
      const normalizedHours = maxHours > 0 ? totalHours / maxHours : 0;
      const normalizedUsers = maxUsers > 0 ? uniqueUsers / maxUsers : 0;

      const popularityScore = (normalizedBookings * bookingWeight) +
        (normalizedHours * hourWeight) +
        (normalizedUsers * uniqueUsersWeight);

      // Determine trend
      const sortedBookings = [...roomBookings].sort((a, b) =>
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      );
      const midPoint = Math.floor(sortedBookings.length / 2);
      const firstHalf = sortedBookings.slice(0, midPoint);
      const secondHalf = sortedBookings.slice(midPoint);

      const firstHalfAvg = firstHalf.length > 0
        ? firstHalf.reduce((sum, b) => {
          const duration = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / (1000 * 60 * 60);
          return sum + duration;
        }, 0) / firstHalf.length
        : 0;

      const secondHalfAvg = secondHalf.length > 0
        ? secondHalf.reduce((sum, b) => {
          const duration = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / (1000 * 60 * 60);
          return sum + duration;
        }, 0) / secondHalf.length
        : 0;

      const trend = secondHalfAvg > firstHalfAvg ? 'rising' :
        secondHalfAvg < firstHalfAvg ? 'declining' : 'stable';

      const trendPercentage = firstHalfAvg > 0
        ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)
        : 0;

      return {
        rank: 0, // Will be calculated after sorting
        roomId: room.id,
        roomName: room.name,
        capacity: room.capacity,
        totalBookings: roomBookings.length,
        totalHours: Math.round(totalHours * 10) / 10,
        uniqueUsers,
        popularityScore: Math.round(popularityScore * 100) / 100,
        capacityUtilization: Math.round(capacityUtilization * 10) / 10,
        averageBookingDuration: roomBookings.length > 0
          ? Math.round((totalMinutes / roomBookings.length) * 10) / 10
          : 0,
        amenities: room.amenities.map(a => a.amenity.name),
        trend,
        trendPercentage,
      };
    });

    // Sort by popularity score and assign ranks
    const sorted = popularityMetrics
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limitCount);

    sorted.forEach((item, index) => {
      item.rank = index + 1;
    });

    // Summary statistics
    const totalBookings = bookings.length;
    const totalRoomsUsed = new Set(bookings.flatMap(b => b.rooms.map(r => r.roomId))).size;
    const uniqueEmployees = new Set(bookings.map(b => b.employeeId)).size;

    res.json({
      topRooms: sorted,
      summary: {
        totalBookings,
        totalRoomsUsed,
        uniqueEmployees,
        averageBookingsPerRoom: totalRoomsUsed > 0 ? Math.round((totalBookings / totalRoomsUsed) * 10) / 10 : 0,
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}