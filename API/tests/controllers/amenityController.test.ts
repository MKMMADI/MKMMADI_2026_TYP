import { createAmenity, listAmenities } from '../../src_ts/controllers/amenityController';
import prisma from '../../src_ts/prisma';

jest.mock('../../src_ts/prisma', () => ({
  __esModule: true,
  default: {
    amenity: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockedFindMany = prisma.amenity.findMany as jest.MockedFunction<
  typeof prisma.amenity.findMany
>;
const mockedCreate = prisma.amenity.create as jest.MockedFunction<
  typeof prisma.amenity.create
>;

describe('amenityController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists active amenities in descending creation order', async () => {
    const amenities = [{ id: 1, name: 'Projector' }];
    mockedFindMany.mockResolvedValue(amenities as never);
    const res = { json: jest.fn() } as any;

    await listAmenities({} as any, res, jest.fn());

    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(res.json).toHaveBeenCalledWith(amenities);
  });

  it('passes validation errors to the error handler', async () => {
    const next = jest.fn();

    await createAmenity({ body: {} } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Name is required', status: 400 }),
    );
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});
