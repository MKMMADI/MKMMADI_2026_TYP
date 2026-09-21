import {
  listConsumables,
  getConsumable,
  createConsumable,
  updateConsumable,
  deleteConsumable,
  adjustStock,
  getStockAdjustments,
  getLowStockItems,
} from '../../src_ts/controllers/consumableController';
import prisma from '../../src_ts/prisma';

jest.mock('../../src_ts/prisma', () => ({
  __esModule: true,
  default: {
    consumableItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      fields: {
        reorderLevel: 'reorderLevel',
      },
    },
    stockAdjustment: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockUser = { id: 1, email: 'test@example.com', role: 'MANAGER' };

const mockConsumable = {
  id: 1,
  name: 'Printer Paper',
  unit: 'reams',
  quantityOnHand: 50,
  reorderLevel: 10,
};

describe('consumableController - listConsumables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns list of consumables ordered by creation date', async () => {
    const consumables = [mockConsumable];
    (prisma.consumableItem.findMany as jest.Mock).mockResolvedValue(consumables);

    const req = {} as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await listConsumables(req, res, next);

    expect(prisma.consumableItem.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
    expect(res.json).toHaveBeenCalledWith(consumables);
  });
});

describe('consumableController - getConsumable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a consumable item with recent adjustments', async () => {
    (prisma.consumableItem.findUnique as jest.Mock).mockResolvedValue(mockConsumable);

    const req = { params: { id: '1' } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await getConsumable(req, res, next);

    expect(res.json).toHaveBeenCalledWith(mockConsumable);
  });

  it('returns 404 when consumable does not exist', async () => {
    (prisma.consumableItem.findUnique as jest.Mock).mockResolvedValue(null);

    const req = { params: { id: '999' } } as any;
    const res = {} as any;
    const next = jest.fn();

    await getConsumable(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Consumable item not found', status: 404 })
    );
  });
});

describe('consumableController - createConsumable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a consumable item successfully', async () => {
    (prisma.consumableItem.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.consumableItem.create as jest.Mock).mockResolvedValue(mockConsumable);
    (prisma.stockAdjustment.create as jest.Mock).mockResolvedValue({ id: 1 });

    const req = {
      body: { name: 'Printer Paper', unit: 'reams', quantityOnHand: 50 },
      user: mockUser,
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    await createConsumable(req, res, next);

    expect(prisma.consumableItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Printer Paper',
        unit: 'reams',
      }),
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 400 when name or unit is missing', async () => {
    const req = {
      body: { name: 'Test' },
      user: mockUser,
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await createConsumable(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Name and unit are required', status: 400 })
    );
  });

  it('returns 400 when consumable with same name already exists', async () => {
    (prisma.consumableItem.findFirst as jest.Mock).mockResolvedValue(mockConsumable);

    const req = {
      body: { name: 'Printer Paper', unit: 'reams' },
      user: mockUser,
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await createConsumable(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'A consumable item with this name already exists', status: 400 })
    );
  });
});

describe('consumableController - updateConsumable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates a consumable item successfully', async () => {
    (prisma.consumableItem.findUnique as jest.Mock).mockResolvedValue(mockConsumable);
    (prisma.consumableItem.update as jest.Mock).mockResolvedValue({
      ...mockConsumable,
      quantityOnHand: 60,
    });

    const req = {
      params: { id: '1' },
      body: { quantityOnHand: 60 },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await updateConsumable(req, res, next);

    expect(prisma.consumableItem.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ quantityOnHand: 60 }),
    });
  });

  it('returns 404 when consumable does not exist', async () => {
    (prisma.consumableItem.findUnique as jest.Mock).mockResolvedValue(null);

    const req = {
      params: { id: '999' },
      body: { quantityOnHand: 60 },
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await updateConsumable(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Consumable item not found', status: 404 })
    );
  });
});

describe('consumableController - deleteConsumable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes a consumable item successfully', async () => {
    (prisma.consumableItem.findUnique as jest.Mock).mockResolvedValue(mockConsumable);
    (prisma.consumableItem.delete as jest.Mock).mockResolvedValue(mockConsumable);

    const req = { params: { id: '1' } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await deleteConsumable(req, res, next);

    expect(prisma.consumableItem.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(res.json).toHaveBeenCalledWith({ message: 'Consumable item deleted successfully' });
  });

  it('returns 404 when consumable does not exist', async () => {
    (prisma.consumableItem.findUnique as jest.Mock).mockResolvedValue(null);

    const req = { params: { id: '999' } } as any;
    const res = {} as any;
    const next = jest.fn();

    await deleteConsumable(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Consumable item not found', status: 404 })
    );
  });
});

describe('consumableController - adjustStock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adjusts stock successfully', async () => {
    (prisma.consumableItem.findUnique as jest.Mock).mockResolvedValue(mockConsumable);

    const mockTransactionResult = {
      updated: { ...mockConsumable, quantityOnHand: 60 },
      adjustment: { id: 1, quantityChange: 10, reason: 'Restock' },
    };

    (prisma.$transaction as jest.Mock).mockResolvedValue(mockTransactionResult);

    const req = {
      params: { id: '1' },
      body: { quantityChange: 10, reason: 'Restock' },
      user: mockUser,
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await adjustStock(req, res, next);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(mockTransactionResult);
  });

  it('returns 400 when quantityChange is missing', async () => {
    const req = {
      params: { id: '1' },
      body: { reason: 'Restock' },
      user: mockUser,
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await adjustStock(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quantity change is required', status: 400 })
    );
  });

  it('returns 400 when reason is missing', async () => {
    const req = {
      params: { id: '1' },
      body: { quantityChange: 10 },
      user: mockUser,
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await adjustStock(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Reason for adjustment is required', status: 400 })
    );
  });

  it('returns 400 when adjustment would result in negative stock', async () => {
    const lowStockItem = { ...mockConsumable, quantityOnHand: 5 };
    (prisma.consumableItem.findUnique as jest.Mock).mockResolvedValue(lowStockItem);

    const req = {
      params: { id: '1' },
      body: { quantityChange: -10, reason: 'Usage' },
      user: mockUser,
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await adjustStock(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Insufficient stock. Cannot reduce below zero.', status: 400 })
    );
  });
});

describe('consumableController - getStockAdjustments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns stock adjustments for a consumable', async () => {
    const adjustments = [{ id: 1, quantityChange: 10, reason: 'Restock' }];
    (prisma.consumableItem.findUnique as jest.Mock).mockResolvedValue(mockConsumable);
    (prisma.stockAdjustment.findMany as jest.Mock).mockResolvedValue(adjustments);

    const req = { params: { id: '1' }, query: { limit: '10' } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await getStockAdjustments(req, res, next);

    expect(res.json).toHaveBeenCalledWith(adjustments);
  });

  it('returns 404 when consumable does not exist', async () => {
    (prisma.consumableItem.findUnique as jest.Mock).mockResolvedValue(null);

    const req = { params: { id: '999' } } as any;
    const res = {} as any;
    const next = jest.fn();

    await getStockAdjustments(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Consumable item not found', status: 404 })
    );
  });
});

describe('consumableController - getLowStockItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns items where quantity is at or below reorder level', async () => {
    const lowStockItems = [{ ...mockConsumable, quantityOnHand: 5, reorderLevel: 10 }];
    (prisma.consumableItem.findMany as jest.Mock).mockResolvedValue(lowStockItems);

    const req = {} as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await getLowStockItems(req, res, next);

    expect(prisma.consumableItem.findMany).toHaveBeenCalledWith({
      where: {
        quantityOnHand: {
          lte: expect.any(String),
        },
      },
      orderBy: { quantityOnHand: 'asc' },
    });
    expect(res.json).toHaveBeenCalledWith(lowStockItems);
  });
});
