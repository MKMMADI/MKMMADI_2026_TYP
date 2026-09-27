import request from 'supertest';
import app from '../../src_ts/app';
import {
  createAndLoginUser,
  authHeader,
  cleanupTestData,
  randomString,
} from '../helpers/testHelpers';
import prisma from '../../src_ts/prisma';

describe('Consumable Routes Integration Tests', () => {
  let managerTokens: string;
  let clerkTokens: string;
  let employeeTokens: string;

  beforeEach(async () => {
    await cleanupTestData();

    const manager = await createAndLoginUser({ role: 'MANAGER' });
    managerTokens = manager.tokens.accessToken;

    const clerk = await createAndLoginUser({ role: 'CLERK' });
    clerkTokens = clerk.tokens.accessToken;

    const employee = await createAndLoginUser({ role: 'EMPLOYEE' });
    employeeTokens = employee.tokens.accessToken;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/v1/consumables', () => {
    beforeEach(async () => {
      await prisma.consumableItem.createMany({
        data: [
          { name: 'Coffee Cups', unit: 'pcs', quantityOnHand: 100, reorderLevel: 20 },
          { name: 'Notebooks', unit: 'pcs', quantityOnHand: 50, reorderLevel: 10 },
        ],
      });
    });

    it('should list all consumables for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/consumables')
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject unauthenticated access', async () => {
      const response = await request(app).get('/api/v1/consumables');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/consumables/low-stock', () => {
    beforeEach(async () => {
      await prisma.consumableItem.createMany({
        data: [
          { name: 'Low Item', unit: 'pcs', quantityOnHand: 5, reorderLevel: 20 },
          { name: 'OK Item', unit: 'pcs', quantityOnHand: 50, reorderLevel: 10 },
        ],
      });
    });

    it('should return items below minimum stock', async () => {
      const response = await request(app)
        .get('/api/v1/consumables/low-stock')
        .set(authHeader(clerkTokens));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((item: any) => item.name === 'Low Item')).toBe(true);
    });
  });

  describe('POST /api/v1/consumables', () => {
    it('should create a consumable as manager', async () => {
      const consumableData = {
        name: randomString('TestConsumable'),
        unit: 'pieces',
        quantityOnHand: 100,
        reorderLevel: 20,
      };

      const response = await request(app)
        .post('/api/v1/consumables')
        .set(authHeader(managerTokens))
        .send(consumableData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(consumableData.name);
      expect(response.body.quantityOnHand).toBe(consumableData.quantityOnHand);
    });

    it('should create a consumable as clerk', async () => {
      const response = await request(app)
        .post('/api/v1/consumables')
        .set(authHeader(clerkTokens))
        .send({
          name: randomString('ClerkConsumable'),
          unit: 'pcs',
          quantityOnHand: 50,
          reorderLevel: 10,
        });

      expect(response.status).toBe(201);
    });

    it('should reject creation by employee', async () => {
      const response = await request(app)
        .post('/api/v1/consumables')
        .set(authHeader(employeeTokens))
        .send({ name: 'Employee Consumable', unit: 'pcs', quantityOnHand: 10, reorderLevel: 5 });

      expect(response.status).toBe(403);
    });

    it('should reject creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/consumables')
        .set(authHeader(managerTokens))
        .send({ description: 'Missing name and stock' });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/consumables/:id', () => {
    let consumableId: number;

    beforeEach(async () => {
      const consumable = await prisma.consumableItem.create({
        data: { name: 'Original', unit: 'pcs', quantityOnHand: 100, reorderLevel: 20 },
      });
      consumableId = consumable.id;
    });

    it('should update a consumable as manager', async () => {
      const updateData = {
        name: 'Updated Name',
        reorderLevel: 30,
      };

      const response = await request(app)
        .patch(`/api/v1/consumables/${consumableId}`)
        .set(authHeader(managerTokens))
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
    });

    it('should update a consumable as clerk', async () => {
      const response = await request(app)
        .patch(`/api/v1/consumables/${consumableId}`)
        .set(authHeader(clerkTokens))
        .send({ reorderLevel: 25 });

      expect(response.status).toBe(200);
    });

    it('should reject update by employee', async () => {
      const response = await request(app)
        .patch(`/api/v1/consumables/${consumableId}`)
        .set(authHeader(employeeTokens))
        .send({ name: 'Update' });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/v1/consumables/:id/adjust', () => {
    let consumableId: number;

    beforeEach(async () => {
      const consumable = await prisma.consumableItem.create({
        data: { name: 'Adjustable', unit: 'pcs', quantityOnHand: 100, reorderLevel: 20 },
      });
      consumableId = consumable.id;
    });

    it('should adjust stock positively as manager', async () => {
      const response = await request(app)
        .post(`/api/v1/consumables/${consumableId}/adjust`)
        .set(authHeader(managerTokens))
        .send({ quantityChange: 50, reason: 'Restocking' });

      expect(response.status).toBe(200);
      expect(response.body.item.quantityOnHand).toBe(150);
    });

    it('should adjust stock negatively as clerk', async () => {
      const response = await request(app)
        .post(`/api/v1/consumables/${consumableId}/adjust`)
        .set(authHeader(clerkTokens))
        .send({ quantityChange: -30, reason: 'Used in meeting' });

      expect(response.status).toBe(200);
      expect(response.body.item.quantityOnHand).toBe(70);
    });

    it('should reject adjustment by employee', async () => {
      const response = await request(app)
        .post(`/api/v1/consumables/${consumableId}/adjust`)
        .set(authHeader(employeeTokens))
        .send({ quantityChange: 10, reason: 'Test' });

      expect(response.status).toBe(403);
    });

    it('should require adjustment amount and reason', async () => {
      const response = await request(app)
        .post(`/api/v1/consumables/${consumableId}/adjust`)
        .set(authHeader(managerTokens))
        .send({});

      expect(response.status).toBe(400);
    });

    it('should record stock adjustment history', async () => {
      await request(app)
        .post(`/api/v1/consumables/${consumableId}/adjust`)
        .set(authHeader(managerTokens))
        .send({ quantityChange: 20, reason: 'Test Adjustment' });

      const adjustments = await prisma.stockAdjustment.findMany({
        where: { itemId: consumableId },
      });

      expect(adjustments.length).toBeGreaterThan(0);
      expect(adjustments[0].quantityChange).toBe(20);
      expect(adjustments[0].reason).toBe('Test Adjustment');
    });
  });

  describe('GET /api/v1/consumables/:id/adjustments', () => {
    let consumableId: number;

    beforeEach(async () => {
      const consumable = await prisma.consumableItem.create({
        data: { name: 'History Test', unit: 'pcs', quantityOnHand: 100, reorderLevel: 20 },
      });
      consumableId = consumable.id;

      const manager = await prisma.user.findFirst({ where: { role: 'MANAGER' } });
      await prisma.stockAdjustment.create({
        data: {
          itemId: consumableId,
          adjustedById: manager!.id,
          quantityChange: 10,
          reason: 'Test',
        },
      });
    });

    it('should get adjustment history for a consumable', async () => {
      const response = await request(app)
        .get(`/api/v1/consumables/${consumableId}/adjustments`)
        .set(authHeader(clerkTokens));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/v1/consumables/:id', () => {
    let consumableId: number;

    beforeEach(async () => {
      const consumable = await prisma.consumableItem.create({
        data: { name: 'To Delete', unit: 'pcs', quantityOnHand: 50, reorderLevel: 10 },
      });
      consumableId = consumable.id;
    });

    it('should delete a consumable as manager', async () => {
      const response = await request(app)
        .delete(`/api/v1/consumables/${consumableId}`)
        .set(authHeader(managerTokens));

      expect(response.status).toBe(200);

      const deleted = await prisma.consumableItem.findUnique({
        where: { id: consumableId },
      });
      expect(deleted).toBeNull();
    });

    it('should reject deletion by clerk', async () => {
      const response = await request(app)
        .delete(`/api/v1/consumables/${consumableId}`)
        .set(authHeader(clerkTokens));

      expect(response.status).toBe(403);
    });

    it('should reject deletion by employee', async () => {
      const response = await request(app)
        .delete(`/api/v1/consumables/${consumableId}`)
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(403);
    });
  });

  describe('Role-based Access Control', () => {
    it('should allow manager full access', async () => {
      const createResponse = await request(app)
        .post('/api/v1/consumables')
        .set(authHeader(managerTokens))
        .send({ name: randomString('ManagerItem'), unit: 'pcs', quantityOnHand: 100, reorderLevel: 10 });
      expect(createResponse.status).toBe(201);

      const consumableId = createResponse.body.id;

      const updateResponse = await request(app)
        .patch(`/api/v1/consumables/${consumableId}`)
        .set(authHeader(managerTokens))
        .send({ reorderLevel: 15 });
      expect(updateResponse.status).toBe(200);

      const adjustResponse = await request(app)
        .post(`/api/v1/consumables/${consumableId}/adjust`)
        .set(authHeader(managerTokens))
        .send({ quantityChange: 10, reason: 'Test' });
      expect(adjustResponse.status).toBe(200);

      const deleteResponse = await request(app)
        .delete(`/api/v1/consumables/${consumableId}`)
        .set(authHeader(managerTokens));
      expect(deleteResponse.status).toBe(200);
    });

    it('should allow clerk create, update, adjust but not delete', async () => {
      const createResponse = await request(app)
        .post('/api/v1/consumables')
        .set(authHeader(clerkTokens))
        .send({ name: randomString('ClerkItem'), unit: 'pcs', quantityOnHand: 50, reorderLevel: 10 });
      expect(createResponse.status).toBe(201);

      const consumableId = createResponse.body.id;

      const updateResponse = await request(app)
        .patch(`/api/v1/consumables/${consumableId}`)
        .set(authHeader(clerkTokens))
        .send({ reorderLevel: 15 });
      expect(updateResponse.status).toBe(200);

      const adjustResponse = await request(app)
        .post(`/api/v1/consumables/${consumableId}/adjust`)
        .set(authHeader(clerkTokens))
        .send({ quantityChange: -5, reason: 'Test' });
      expect(adjustResponse.status).toBe(200);

      const deleteResponse = await request(app)
        .delete(`/api/v1/consumables/${consumableId}`)
        .set(authHeader(clerkTokens));
      expect(deleteResponse.status).toBe(403);
    });

    it('should restrict employee to read-only', async () => {
      const consumable = await prisma.consumableItem.create({
        data: { name: 'Employee View', unit: 'pcs', quantityOnHand: 100, reorderLevel: 10 },
      });

      const listResponse = await request(app)
        .get('/api/v1/consumables')
        .set(authHeader(employeeTokens));
      expect(listResponse.status).toBe(200);

      const getResponse = await request(app)
        .get(`/api/v1/consumables/${consumable.id}`)
        .set(authHeader(employeeTokens));
      expect(getResponse.status).toBe(200);

      const createResponse = await request(app)
        .post('/api/v1/consumables')
        .set(authHeader(employeeTokens))
        .send({ name: 'Test', unit: 'pcs', quantityOnHand: 10, reorderLevel: 5 });
      expect(createResponse.status).toBe(403);

      const updateResponse = await request(app)
        .patch(`/api/v1/consumables/${consumable.id}`)
        .set(authHeader(employeeTokens))
        .send({ reorderLevel: 15 });
      expect(updateResponse.status).toBe(403);

      const adjustResponse = await request(app)
        .post(`/api/v1/consumables/${consumable.id}/adjust`)
        .set(authHeader(employeeTokens))
        .send({ quantityChange: 10, reason: 'Test' });
      expect(adjustResponse.status).toBe(403);

      const deleteResponse = await request(app)
        .delete(`/api/v1/consumables/${consumable.id}`)
        .set(authHeader(employeeTokens));
      expect(deleteResponse.status).toBe(403);
    });
  });
});
