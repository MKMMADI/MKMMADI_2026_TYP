import {
  createBookingHandler,
  listBookings,
  getBooking,
  approveBooking,
  rejectBooking,
  updateBookingStatus,
  cancelBooking,
  listRejectionReasons,
  listOccupancy,
} from '../../src_ts/controllers/bookingController';
import prisma from '../../src_ts/prisma';
import * as bookingService from '../../src_ts/services/bookingService';

jest.mock('../../src_ts/prisma', () => ({
  __esModule: true,
  default: {
    booking: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../src_ts/services/bookingService', () => ({
  createBooking: jest.fn(),
  listAvailableRooms: jest.fn(),
}));

const mockUser = { id: 1, email: 'test@example.com', role: 'EMPLOYEE' };
const mockManagerUser = { id: 2, email: 'manager@example.com', role: 'MANAGER' };
const mockClerkUser = { id: 3, email: 'clerk@example.com', role: 'CLERK' };

const mockBooking = {
  id: 1,
  employeeId: 1,
  status: 'PENDING',
  purpose: 'Team meeting',
  startAt: new Date('2025-01-15T10:00:00Z'),
  endAt: new Date('2025-01-15T11:00:00Z'),
  rooms: [],
  amenities: [],
};

describe('bookingController - createBookingHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a booking successfully', async () => {
    const createdBooking = { ...mockBooking, id: 1 };
    (bookingService.createBooking as jest.Mock).mockResolvedValue(createdBooking);

    const req = {
      body: { roomId: 1, amenityIds: [1, 2], purpose: 'Meeting', capacity: 5 },
      user: mockUser,
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    await createBookingHandler(req, res, next);

    expect(bookingService.createBooking).toHaveBeenCalledWith({
      employeeId: 1,
      purpose: 'Meeting',
      roomId: 1,
      amenityIds: [1, 2],
      capacity: 5,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(createdBooking);
  });

  it('passes errors to the error handler', async () => {
    const error = new Error('Booking creation failed');
    (bookingService.createBooking as jest.Mock).mockRejectedValue(error);

    const req = { body: {}, user: mockUser } as any;
    const res = {} as any;
    const next = jest.fn();

    await createBookingHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('bookingController - listBookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all bookings for an employee when role is EMPLOYEE', async () => {
    const bookings = [mockBooking];
    (prisma.booking.findMany as jest.Mock).mockResolvedValue(bookings);

    const req = { user: mockUser, query: {} } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await listBookings(req, res, next);

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: { employeeId: 1 },
      include: expect.any(Object),
      orderBy: { createdAt: 'desc' },
    });
    expect(res.json).toHaveBeenCalledWith(bookings);
  });

  it('returns all bookings when role is MANAGER', async () => {
    const bookings = [mockBooking];
    (prisma.booking.findMany as jest.Mock).mockResolvedValue(bookings);

    const req = { user: mockManagerUser, query: {} } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await listBookings(req, res, next);

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {},
      include: expect.any(Object),
      orderBy: { createdAt: 'desc' },
    });
  });

  it('filters by status when status query param is provided', async () => {
    const bookings = [mockBooking];
    (prisma.booking.findMany as jest.Mock).mockResolvedValue(bookings);

    const req = { user: mockManagerUser, query: { status: 'PENDING' } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await listBookings(req, res, next);

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: { status: 'PENDING' },
      include: expect.any(Object),
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('bookingController - getBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a booking when user is the owner', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

    const req = { params: { id: '1' }, user: mockUser } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await getBooking(req, res, next);

    expect(res.json).toHaveBeenCalledWith(mockBooking);
  });

  it('allows manager to view any booking', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

    const req = { params: { id: '1' }, user: mockManagerUser } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await getBooking(req, res, next);

    expect(res.json).toHaveBeenCalledWith(mockBooking);
  });

  it('returns 404 when booking does not exist', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

    const req = { params: { id: '999' }, user: mockUser } as any;
    const res = {} as any;
    const next = jest.fn();

    await getBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Booking not found', status: 404 })
    );
  });

  it('returns 403 when employee tries to view another employees booking', async () => {
    const otherBooking = { ...mockBooking, employeeId: 999 };
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(otherBooking);

    const req = { params: { id: '1' }, user: mockUser } as any;
    const res = {} as any;
    const next = jest.fn();

    await getBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Forbidden', status: 403 })
    );
  });

  it('returns 400 when invalid booking id is provided', async () => {
    const req = { params: { id: 'invalid' }, user: mockUser } as any;
    const res = {} as any;
    const next = jest.fn();

    await getBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid booking id', status: 400 })
    );
  });
});

describe('bookingController - approveBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('approves a pending booking successfully', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
    (prisma.booking.update as jest.Mock).mockResolvedValue({
      ...mockBooking,
      status: 'CONFIRMED',
    });

    const req = { params: { id: '1' }, user: mockManagerUser } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await approveBooking(req, res, next);

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ status: 'CONFIRMED' }),
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'CONFIRMED' }));
  });

  it('returns 400 when booking is not in PENDING status', async () => {
    const confirmedBooking = { ...mockBooking, status: 'CONFIRMED' };
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(confirmedBooking);

    const req = { params: { id: '1' }, user: mockManagerUser } as any;
    const res = {} as any;
    const next = jest.fn();

    await approveBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Only pending bookings can be approved', status: 400 })
    );
  });

  it('returns 404 when booking does not exist', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

    const req = { params: { id: '999' }, user: mockManagerUser } as any;
    const res = {} as any;
    const next = jest.fn();

    await approveBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Booking not found', status: 404 })
    );
  });
});

describe('bookingController - rejectBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a pending booking with valid reason code', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
    (prisma.booking.update as jest.Mock).mockResolvedValue({
      ...mockBooking,
      status: 'CANCELLED',
      rejectionReasonCode: 'DUPLICATE',
    });

    const req = {
      params: { id: '1' },
      user: mockManagerUser,
      body: { reasonCode: 'DUPLICATE', note: 'Duplicate request' },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await rejectBooking(req, res, next);

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ status: 'CANCELLED', rejectionReasonCode: 'DUPLICATE' }),
    });
  });

  it('returns 400 when reason code is missing', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

    const req = {
      params: { id: '1' },
      user: mockManagerUser,
      body: {},
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await rejectBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'A valid rejection reasonCode is required', status: 400 })
    );
  });

  it('returns 400 when reason is OTHER but note is missing', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

    const req = {
      params: { id: '1' },
      user: mockManagerUser,
      body: { reasonCode: 'OTHER' },
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await rejectBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'A note is required when reason is OTHER', status: 400 })
    );
  });
});

describe('bookingController - updateBookingStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates booking status to PREPARING and sets preparedBy', async () => {
    const confirmedBooking = { ...mockBooking, status: 'CONFIRMED' };
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(confirmedBooking);
    (prisma.booking.update as jest.Mock).mockResolvedValue({
      ...confirmedBooking,
      status: 'PREPARING',
      preparedById: mockClerkUser.id,
    });

    const req = {
      params: { id: '1' },
      user: mockClerkUser,
      body: { status: 'PREPARING' },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await updateBookingStatus(req, res, next);

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ status: 'PREPARING', preparedById: mockClerkUser.id }),
    });
  });

  it('returns 400 when invalid status is provided', async () => {
    const confirmedBooking = { ...mockBooking, status: 'CONFIRMED' };
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(confirmedBooking);

    const req = {
      params: { id: '1' },
      user: mockClerkUser,
      body: { status: 'INVALID_STATUS' },
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await updateBookingStatus(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Invalid preparation status'),
        status: 400,
      })
    );
  });

  it('returns 400 when trying to update status of a PENDING booking', async () => {
    const pendingBooking = { ...mockBooking, status: 'PENDING' };
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(pendingBooking);

    const req = {
      params: { id: '1' },
      user: mockClerkUser,
      body: { status: 'PREPARING' },
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await updateBookingStatus(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Only confirmed or in-preparation'),
        status: 400,
      })
    );
  });
});

describe('bookingController - cancelBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels a pending booking successfully', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
    (prisma.booking.update as jest.Mock).mockResolvedValue({
      ...mockBooking,
      status: 'CANCELLED',
    });

    const req = { params: { id: '1' }, user: mockUser } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await cancelBooking(req, res, next);

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'CANCELLED' },
    });
  });

  it('allows manager to cancel any booking', async () => {
    const otherBooking = { ...mockBooking, employeeId: 999, status: 'CONFIRMED' };
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(otherBooking);
    (prisma.booking.update as jest.Mock).mockResolvedValue({
      ...otherBooking,
      status: 'CANCELLED',
    });

    const req = { params: { id: '1' }, user: mockManagerUser } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await cancelBooking(req, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'CANCELLED' }));
  });

  it('returns 400 when employee tries to cancel completed booking', async () => {
    const completedBooking = { ...mockBooking, status: 'COMPLETED' };
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(completedBooking);

    const req = { params: { id: '1' }, user: mockUser } as any;
    const res = {} as any;
    const next = jest.fn();

    await cancelBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'This booking can no longer be cancelled', status: 400 })
    );
  });

  it('returns 403 when employee tries to view another employees booking', async () => {
    const otherBooking = { ...mockBooking, employeeId: 999 };
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(otherBooking);

    const req = { params: { id: '1' }, user: mockUser } as any;
    const res = {} as any;
    const next = jest.fn();

    await cancelBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Forbidden', status: 403 })
    );
  });
});

describe('bookingController - listRejectionReasons', () => {
  it('returns rejection reasons list', async () => {
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await listRejectionReasons({} as any, res, next);

    expect(res.json).toHaveBeenCalled();
  });
});

describe('bookingController - listOccupancy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns occupancy slots within date range', async () => {
    const mockSlots = [
      {
        bookingId: 1,
        roomId: 1,
        startAt: new Date('2025-01-15T10:00:00Z'),
        endAt: new Date('2025-01-15T11:00:00Z'),
        status: 'CONFIRMED',
      },
    ];
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        startAt: new Date('2025-01-15T10:00:00Z'),
        endAt: new Date('2025-01-15T11:00:00Z'),
        status: 'CONFIRMED',
        rooms: [{ roomId: 1 }],
      },
    ]);

    const req = {
      query: {
        from: '2025-01-01',
        to: '2025-12-31',
      },
      user: mockUser,
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await listOccupancy(req, res, next);

    expect(res.json).toHaveBeenCalled();
  });

  it('returns 400 when invalid date range is provided', async () => {
    const req = {
      query: { from: 'invalid', to: 'also-invalid' },
      user: mockUser,
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await listOccupancy(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid from/to range', status: 400 })
    );
  });
});
