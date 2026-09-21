import { getProfile, updateProfile, deactivateAccount, getMyBookings } from '../../src_ts/controllers/profileController';
import prisma from '../../src_ts/prisma';

jest.mock('../../src_ts/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
    session: {
      updateMany: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
  },
}));

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  role: 'EMPLOYEE',
  department: 'IT',
  contactNumber: '1234567890',
  Active: true,
};

describe('profileController - getProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns user profile data', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const req = { user: { id: 1 } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await getProfile(req, res, next);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: expect.any(Object),
    });
    expect(res.json).toHaveBeenCalledWith(mockUser);
  });

  it('returns 404 when user does not exist', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = { user: { id: 999 } } as any;
    const res = {} as any;
    const next = jest.fn();

    await getProfile(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User not found', status: 404 })
    );
  });
});

describe('profileController - updateProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates user profile successfully', async () => {
    const updatedUser = { ...mockUser, name: 'Updated Name' };
    (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

    const req = {
      user: { id: 1 },
      body: { name: 'Updated Name' },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await updateProfile(req, res, next);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ name: 'Updated Name' }),
      select: expect.any(Object),
    });
    expect(res.json).toHaveBeenCalledWith(updatedUser);
  });

  it('updates only provided fields', async () => {
    const updatedUser = { ...mockUser, department: 'HR' };
    (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

    const req = {
      user: { id: 1 },
      body: { department: 'HR' },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await updateProfile(req, res, next);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { department: 'HR' },
      select: expect.any(Object),
    });
  });
});

describe('profileController - deactivateAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deactivates user account and revokes tokens', async () => {
    const deactivatedUser = { ...mockUser, Active: false };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.user.update as jest.Mock).mockResolvedValue(deactivatedUser);
    (prisma.session.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const req = { user: { id: 1 } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await deactivateAccount(req, res, next);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { Active: false },
      select: expect.any(Object),
    });
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { userId: 1 },
      data: { revoked: true },
    });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 1 },
      data: { revoked: true },
    });
    expect(res.json).toHaveBeenCalledWith({
      message: 'Account deactivated successfully',
      user: deactivatedUser,
    });
  });

  it('returns 404 when user does not exist', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = { user: { id: 999 } } as any;
    const res = {} as any;
    const next = jest.fn();

    await deactivateAccount(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User not found', status: 404 })
    );
  });
});

describe('profileController - getMyBookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns user bookings excluding cancelled ones', async () => {
    const bookings = [
      {
        id: 1,
        purpose: 'Meeting',
        rooms: [{ room: { id: 1, name: 'Room A' } }],
        amenities: [{ amenity: { id: 1, name: 'Projector' } }],
      },
    ];
    (prisma.booking.findMany as jest.Mock).mockResolvedValue(bookings);

    const req = { user: { id: 1 } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await getMyBookings(req, res, next);

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        employeeId: 1,
        status: { notIn: ['CANCELLED'] },
      },
      include: expect.any(Object),
      orderBy: { createdAt: 'desc' },
    });
    expect(res.json).toHaveBeenCalledWith(bookings);
  });
});
