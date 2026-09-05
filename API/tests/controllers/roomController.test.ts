import { createRoom, getRoom } from '../../src_ts/controllers/roomController';
import prisma from '../../src_ts/prisma';

jest.mock('../../src_ts/prisma', () => ({
  __esModule: true,
  default: {
    room: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

const mockedCreate = prisma.room.create as jest.MockedFunction<
  typeof prisma.room.create
>;
const mockedFindUnique = prisma.room.findUnique as jest.MockedFunction<
  typeof prisma.room.findUnique
>;

describe('roomController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a room and maps related amenities in the response', async () => {
    const room = {
      id: 1,
      name: 'Boardroom',
      capacity: 10,
      amenities: [{ amenity: { id: 2, name: 'Projector' } }],
    };
    mockedCreate.mockResolvedValue(room as never);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

    await createRoom(
      { body: { name: 'Boardroom', capacity: 10, amenityIds: [2] } } as any,
      res,
      jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      ...room,
      amenities: [{ id: 2, name: 'Projector' }],
    });
  });

  it('returns a 404 error when a room does not exist', async () => {
    mockedFindUnique.mockResolvedValue(null);
    const next = jest.fn();

    await getRoom({ params: { id: '99' } } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Room not found', status: 404 }),
    );
  });
});
