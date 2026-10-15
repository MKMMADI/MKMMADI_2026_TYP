/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Tests the domainServices service behavior.
 */

import prisma from '../../src_ts/prisma';
import { createAmenity } from '../../src_ts/services/amenityService';
import { updateRoomStatus } from '../../src_ts/services/roomService';
import { adjustStock } from '../../src_ts/services/consumableService';
import { getAvailabilityReport } from '../../src_ts/services/reportService';

jest.mock('../../src_ts/prisma', () => ({
  __esModule: true,
  default: {
    amenity: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    room: { update: jest.fn(), findMany: jest.fn() },
    consumableItem: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe('domain service validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an amenity without a name before accessing persistence', async () => {
    await expect(createAmenity({})).rejects.toMatchObject({ message: 'Name is required', status: 400 });
    expect(prisma.amenity.create).not.toHaveBeenCalled();
  });

  it('rejects an unsupported room status before updating the room', async () => {
    await expect(updateRoomStatus(1, 'BOOKED')).rejects.toMatchObject({
      message: 'Status must be AVAILABLE, OUT_OF_SERVICE, or MAINTENANCE',
      status: 400,
    });
    expect(prisma.room.update).not.toHaveBeenCalled();
  });

  it('prevents stock adjustments from reducing inventory below zero', async () => {
    (prisma.consumableItem.findUnique as jest.Mock).mockResolvedValue({ id: 2, quantityOnHand: 5 });
    await expect(adjustStock(2, 7, -6, 'Usage')).rejects.toMatchObject({
      message: 'Insufficient stock. Cannot reduce below zero.',
      status: 400,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('validates report date ranges before querying data', async () => {
    await expect(getAvailabilityReport('bad-date', 'also-bad')).rejects.toMatchObject({
      message: 'Invalid date format',
      status: 400,
    });
    expect(prisma.room.findMany).not.toHaveBeenCalled();
  });
});
