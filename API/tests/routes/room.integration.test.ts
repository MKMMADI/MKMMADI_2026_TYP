import request from 'supertest';
import app from '../../src_ts/app';
import {
  createAndLoginUser,
  authHeader,
  cleanupTestData,
  randomString,
} from '../helpers/testHelpers';
import prisma from '../../src_ts/prisma';

describe('Room Routes Integration Tests', () => {
  let managerTokens: string;
  let employeeTokens: string;

  beforeEach(async () => {
    await cleanupTestData();

    const manager = await createAndLoginUser({ role: 'MANAGER' });
    managerTokens = manager.tokens.accessToken;

    const employee = await createAndLoginUser({ role: 'EMPLOYEE' });
    employeeTokens = employee.tokens.accessToken;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/v1/rooms', () => {
    it('should list all active rooms for authenticated user', async () => {
      await prisma.room.createMany({
        data: [
          { name: 'Room A', capacity: 10, description: 'Floor 1', status: 'AVAILABLE', isActive: true },
          { name: 'Room B', capacity: 20, description: 'Floor 2', status: 'AVAILABLE', isActive: true },
        ],
      });

      const response = await request(app)
        .get('/api/v1/rooms')
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject unauthenticated access', async () => {
      const response = await request(app).get('/api/v1/rooms');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Missing Authorization header');
    });
  });

  describe('POST /api/v1/rooms', () => {
    it('should create a room when requested by manager', async () => {
      const roomData = {
        name: randomString('TestRoom'),
        capacity: 15,
        description: 'Floor 3',
      };

      const response = await request(app)
        .post('/api/v1/rooms')
        .set(authHeader(managerTokens))
        .send(roomData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(roomData.name);
      expect(response.body.capacity).toBe(roomData.capacity);
    });

    it('should reject room creation by non-manager', async () => {
      const roomData = {
        name: 'Unauthorized Room',
        capacity: 10,
        description: 'Floor 1',
      };

      const response = await request(app)
        .post('/api/v1/rooms')
        .set(authHeader(employeeTokens))
        .send(roomData);

      expect(response.status).toBe(403);
    });

    it('should reject room creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .set(authHeader(managerTokens))
        .send({ capacity: 10 });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/rooms/:id', () => {
    let roomId: number;

    beforeEach(async () => {
      const room = await prisma.room.create({
        data: { name: 'Test Room', capacity: 8, description: 'Floor 1', status: 'AVAILABLE', isActive: true },
      });
      roomId = room.id;
    });

    it('should get a specific room by id', async () => {
      const response = await request(app)
        .get(`/api/v1/rooms/${roomId}`)
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(roomId);
      expect(response.body.name).toBe('Test Room');
    });

    it('should return 404 for non-existent room', async () => {
      const fakeId = 999999;

      const response = await request(app)
        .get(`/api/v1/rooms/${fakeId}`)
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(404);
    });

    it('should reject unauthenticated access', async () => {
      const response = await request(app).get(`/api/v1/rooms/${roomId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/rooms/:id', () => {
    let roomId: number;

    beforeEach(async () => {
      const room = await prisma.room.create({
        data: { name: 'Original Room', capacity: 10, description: 'Floor 1', status: 'AVAILABLE', isActive: true },
      });
      roomId = room.id;
    });

    it('should update a room when requested by manager', async () => {
      const updateData = {
        name: 'Updated Room Name',
        capacity: 25,
      };

      const response = await request(app)
        .patch(`/api/v1/rooms/${roomId}`)
        .set(authHeader(managerTokens))
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.capacity).toBe(updateData.capacity);
    });

    it('should reject room update by non-manager', async () => {
      const response = await request(app)
        .patch(`/api/v1/rooms/${roomId}`)
        .set(authHeader(employeeTokens))
        .send({ name: 'Unauthorized Update' });

      expect(response.status).toBe(403);
    });

    it('should return 404 for updating non-existent room', async () => {
      const fakeId = 999999;

      const response = await request(app)
        .patch(`/api/v1/rooms/${fakeId}`)
        .set(authHeader(managerTokens))
        .send({ name: 'Update' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/rooms/:id', () => {
    let roomId: number;

    beforeEach(async () => {
      const room = await prisma.room.create({
        data: { name: 'To Be Archived', capacity: 5, description: 'Floor 1', status: 'AVAILABLE', isActive: true },
      });
      roomId = room.id;
    });

    it('should archive (soft delete) a room when requested by manager', async () => {
      const response = await request(app)
        .delete(`/api/v1/rooms/${roomId}`)
        .set(authHeader(managerTokens));

      expect(response.status).toBe(200);

      const archivedRoom = await prisma.room.findUnique({
        where: { id: roomId },
      });
      expect(archivedRoom?.isActive).toBe(false);
    });

    it('should reject room deletion by non-manager', async () => {
      const response = await request(app)
        .delete(`/api/v1/rooms/${roomId}`)
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(403);
    });

    it('should return 404 for deleting non-existent room', async () => {
      const fakeId = 999999;

      const response = await request(app)
        .delete(`/api/v1/rooms/${fakeId}`)
        .set(authHeader(managerTokens));

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/rooms/availability', () => {
    it('should search available rooms with date parameters', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/v1/rooms/availability')
        .set(authHeader(employeeTokens))
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          capacity: 5,
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject availability search without authentication', async () => {
      const response = await request(app).get('/api/v1/rooms/availability');

      expect(response.status).toBe(401);
    });

    it('should handle missing query parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/rooms/availability')
        .set(authHeader(employeeTokens));

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Role-based Access Control', () => {
    let roomId: number;

    beforeEach(async () => {
      const room = await prisma.room.create({
        data: { name: 'RBAC Test Room', capacity: 10, description: 'Floor 1', status: 'AVAILABLE', isActive: true },
      });
      roomId = room.id;
    });

    it('should allow manager to perform all operations', async () => {
      const listResponse = await request(app)
        .get('/api/v1/rooms')
        .set(authHeader(managerTokens));
      expect(listResponse.status).toBe(200);

      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .set(authHeader(managerTokens))
        .send({ name: randomString('ManagerRoom'), capacity: 5, description: 'Test' });
      expect(createResponse.status).toBe(201);

      const updateResponse = await request(app)
        .patch(`/api/v1/rooms/${roomId}`)
        .set(authHeader(managerTokens))
        .send({ name: 'Manager Updated' });
      expect(updateResponse.status).toBe(200);

      const deleteResponse = await request(app)
        .delete(`/api/v1/rooms/${roomId}`)
        .set(authHeader(managerTokens));
      expect(deleteResponse.status).toBe(200);
    });

    it('should restrict employee to read-only operations', async () => {
      const listResponse = await request(app)
        .get('/api/v1/rooms')
        .set(authHeader(employeeTokens));
      expect(listResponse.status).toBe(200);

      const getResponse = await request(app)
        .get(`/api/v1/rooms/${roomId}`)
        .set(authHeader(employeeTokens));
      expect(getResponse.status).toBe(200);

      const createResponse = await request(app)
        .post('/api/v1/rooms')
        .set(authHeader(employeeTokens))
        .send({ name: 'Employee Room', capacity: 5, description: 'Test' });
      expect(createResponse.status).toBe(403);

      const updateResponse = await request(app)
        .patch(`/api/v1/rooms/${roomId}`)
        .set(authHeader(employeeTokens))
        .send({ name: 'Employee Update' });
      expect(updateResponse.status).toBe(403);

      const deleteResponse = await request(app)
        .delete(`/api/v1/rooms/${roomId}`)
        .set(authHeader(employeeTokens));
      expect(deleteResponse.status).toBe(403);
    });
  });
});
