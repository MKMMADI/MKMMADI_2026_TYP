import { createAmenity, listAmenities, updateAmenity, archiveAmenity } from '../../src_ts/controllers/amenityController';
import * as amenityService from '../../src_ts/services/amenityService';

jest.mock('../../src_ts/services/amenityService', () => ({
  listAmenities: jest.fn(), createAmenity: jest.fn(), updateAmenity: jest.fn(), archiveAmenity: jest.fn(),
}));

describe('amenityController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the amenity list from its service', async () => {
    (amenityService.listAmenities as jest.Mock).mockResolvedValue([{ id: 1 }]);
    const res = { json: jest.fn() } as any;
    await listAmenities({} as any, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('passes creation input to the service and responds with 201', async () => {
    const amenity = { id: 1, name: 'Projector' };
    (amenityService.createAmenity as jest.Mock).mockResolvedValue(amenity);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const body = { name: 'Projector' };
    await createAmenity({ body } as any, res, jest.fn());
    expect(amenityService.createAmenity).toHaveBeenCalledWith(body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(amenity);
  });

  it('forwards service validation errors to Express', async () => {
    const error = Object.assign(new Error('Name is required'), { status: 400 });
    (amenityService.createAmenity as jest.Mock).mockRejectedValue(error);
    const next = jest.fn();
    await createAmenity({ body: {} } as any, { status: jest.fn().mockReturnThis(), json: jest.fn() } as any, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('parses the id for update and archive operations', async () => {
    (amenityService.updateAmenity as jest.Mock).mockResolvedValue({ id: 3 });
    (amenityService.archiveAmenity as jest.Mock).mockResolvedValue({ id: 3, isActive: false });
    const res = { json: jest.fn() } as any;
    await updateAmenity({ params: { id: '3' }, body: { name: 'New' } } as any, res, jest.fn());
    await archiveAmenity({ params: { id: '3' } } as any, res, jest.fn());
    expect(amenityService.updateAmenity).toHaveBeenCalledWith(3, { name: 'New' });
    expect(amenityService.archiveAmenity).toHaveBeenCalledWith(3);
  });
});
