/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Tests the consumable controller behavior and response handling.
 */

import {
  listConsumables, getConsumable, createConsumable, updateConsumable, deleteConsumable,
  adjustStock, getStockAdjustments, getLowStockItems,
} from '../../src_ts/controllers/consumableController';
import * as consumableService from '../../src_ts/services/consumableService';

jest.mock('../../src_ts/services/consumableService', () => ({
  listConsumables: jest.fn(), getConsumable: jest.fn(), createConsumable: jest.fn(),
  updateConsumable: jest.fn(), deleteConsumable: jest.fn(), adjustStock: jest.fn(),
  getStockAdjustments: jest.fn(), getLowStockItems: jest.fn(),
}));

const user = { id: 7 };
/**
 * Creates a minimal mocked Express response for controller unit tests.

 * @returns A mocked response object with the methods used by the controller.
 */
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() }) as any;

describe('consumableController service delegation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns list and item data from the service', async () => {
    (consumableService.listConsumables as jest.Mock).mockResolvedValue([{ id: 1 }]);
    (consumableService.getConsumable as jest.Mock).mockResolvedValue({ id: 1 });
    const res = response();
    await listConsumables({} as any, res, jest.fn());
    await getConsumable({ params: { id: '1' } } as any, res, jest.fn());
    expect(consumableService.listConsumables).toHaveBeenCalledWith();
    expect(consumableService.getConsumable).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenNthCalledWith(1, [{ id: 1 }]);
  });

  it('passes authenticated creator and returns 201', async () => {
    const item = { id: 3 };
    const body = { name: 'Paper', unit: 'ream' };
    (consumableService.createConsumable as jest.Mock).mockResolvedValue(item);
    const res = response();
    await createConsumable({ body, user } as any, res, jest.fn());
    expect(consumableService.createConsumable).toHaveBeenCalledWith(body, 7);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(item);
  });

  it('delegates update, delete, and stock adjustment', async () => {
    const adjustment = { item: { id: 1 }, adjustment: { id: 2 } };
    (consumableService.updateConsumable as jest.Mock).mockResolvedValue({ id: 1 });
    (consumableService.deleteConsumable as jest.Mock).mockResolvedValue({ message: 'deleted' });
    (consumableService.adjustStock as jest.Mock).mockResolvedValue(adjustment);
    const res = response();
    const changes = { quantityOnHand: '10' };
    await updateConsumable({ params: { id: '1' }, body: changes } as any, res, jest.fn());
    await deleteConsumable({ params: { id: '1' } } as any, res, jest.fn());
    await adjustStock({ params: { id: '1' }, body: { quantityChange: -2, reason: 'Use' }, user } as any, res, jest.fn());
    expect(consumableService.updateConsumable).toHaveBeenCalledWith(1, changes);
    expect(consumableService.deleteConsumable).toHaveBeenCalledWith(1);
    expect(consumableService.adjustStock).toHaveBeenCalledWith(1, 7, -2, 'Use');
    expect(res.json).toHaveBeenNthCalledWith(3, adjustment);
  });

  it('sanitizes the adjustment limit and forwards the remaining read operations', async () => {
    (consumableService.getStockAdjustments as jest.Mock).mockResolvedValue([]);
    (consumableService.getLowStockItems as jest.Mock).mockResolvedValue([]);
    const res = response();
    await getStockAdjustments({ params: { id: '4' }, query: { limit: '-1' } } as any, res, jest.fn());
    await getLowStockItems({} as any, res, jest.fn());
    expect(consumableService.getStockAdjustments).toHaveBeenCalledWith(4, 50);
    expect(consumableService.getLowStockItems).toHaveBeenCalledWith();
  });

  it('forwards service validation errors', async () => {
    const error = Object.assign(new Error('Insufficient stock'), { status: 400 });
    (consumableService.adjustStock as jest.Mock).mockRejectedValue(error);
    const next = jest.fn();
    await adjustStock({ params: { id: '1' }, body: {}, user } as any, response(), next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
