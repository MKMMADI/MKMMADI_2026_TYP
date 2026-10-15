/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Tests the room controller behavior and response handling.
 */

import { createRoom, getRoom, updateRoom, searchAvailability } from '../../src_ts/controllers/roomController';
import * as roomService from '../../src_ts/services/roomService';

jest.mock('../../src_ts/services/roomService', () => ({
  listRooms: jest.fn(), createRoom: jest.fn(), getRoom: jest.fn(), updateRoom: jest.fn(),
  archiveRoom: jest.fn(), updateRoomStatus: jest.fn(), searchAvailability: jest.fn(),
}));

describe('roomController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns created room with service-provided amenity mapping', async () => {
    const room = { id: 1, name: 'Boardroom', amenities: [{ id: 2, name: 'Projector' }] };
    (roomService.createRoom as jest.Mock).mockResolvedValue(room);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const body = { name: 'Boardroom', capacity: 10, amenityIds: [2] };
    await createRoom({ body } as any, res, jest.fn());
    expect(roomService.createRoom).toHaveBeenCalledWith(body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(room);
  });

  it('parses IDs and delegates room reads and updates', async () => {
    (roomService.getRoom as jest.Mock).mockResolvedValue({ id: 4 });
    (roomService.updateRoom as jest.Mock).mockResolvedValue({ id: 4 });
    const res = { json: jest.fn() } as any;
    await getRoom({ params: { id: '4' } } as any, res, jest.fn());
    await updateRoom({ params: { id: '4' }, body: { capacity: 6 } } as any, res, jest.fn());
    expect(roomService.getRoom).toHaveBeenCalledWith(4);
    expect(roomService.updateRoom).toHaveBeenCalledWith(4, { capacity: 6 });
  });

  it('delegates availability query parsing', async () => {
    (roomService.searchAvailability as jest.Mock).mockResolvedValue([]);
    await searchAvailability({
      query: { startAt: '2025-01-01', endAt: '2025-01-02', capacity: '12', amenityIds: '1,2' },
    } as any, { json: jest.fn() } as any, jest.fn());
    expect(roomService.searchAvailability).toHaveBeenCalledWith({
      startAt: '2025-01-01', endAt: '2025-01-02', capacity: 12, amenityIds: ['1', '2'],
    });
  });
});
