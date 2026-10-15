/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Exercises the room API routes through the Express application.
 */

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
          {
            name: 'Room A',
            capacity: 10,
            description: 'Floor 1',
            status: 'AVAILABLE',
            isActive: true,
            imageUrl: 'https://images.example.com/room-a.jpg',
          },
          { name: 'Room B', capacity: 20, description: 'Floor 2', status: 'AVAILABLE', isActive: true },
        ],
      });

      const response = await request(app)
        .get('/api/v1/rooms')
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.find((room: { name: string }) => room.name === 'Room A').imageUrl)
        .toBe('https://images.example.com/room-a.jpg');
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

    it('should create a room with an image URL', async () => {
      const imageUrl = 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?fm=jpg&q=60&w=800&h=600&auto=format&fit=crop';
      const response = await request(app)
        .post('/api/v1/rooms')
        .set(authHeader(managerTokens))
        .send({ name: randomString('RoomWithImage'), capacity: 8, imageUrl });

      expect(response.status).toBe(201);
      expect(response.body.imageUrl).toBe(imageUrl);
    });

    it('should create a room without an image URL', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .set(authHeader(managerTokens))
        .send({ name: randomString('RoomWithoutImage'), capacity: 8 });

      expect(response.status).toBe(201);
      expect(response.body.imageUrl).toBeNull();
    });

    it('should reject a non-HTTPS image URL', async () => {
      const response = await request(app)
        .post('/api/v1/rooms')
        .set(authHeader(managerTokens))
        .send({
          name: randomString('RoomWithInvalidImage'),
          capacity: 8,
          imageUrl: 'http://images.example.com/room.jpg',
        });

      expect(response.status).toBe(400);
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

    it('should return the stored image URL for an employee', async () => {
      const imageUrl = 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?fm=jpg&q=60&w=800&h=600&auto=format&fit=crop';
      await prisma.room.update({ where: { id: roomId }, data: { imageUrl } });

      const response = await request(app)
        .get(`/api/v1/rooms/${roomId}`)
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(200);
      expect(response.body.imageUrl).toBe(imageUrl);
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

    it('should let a manager replace and remove a room image URL', async () => {
      const imageUrl = 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?fm=jpg&q=60&w=800&h=600&auto=format&fit=crop';
      const replacedUrl = 'https://images.unsplash.com/photo-1571624436279-b272aff752b5?fm=jpg&q=60&w=800&h=600&auto=format&fit=crop';
      await prisma.room.update({ where: { id: roomId }, data: { imageUrl } });

      const replaceResponse = await request(app)
        .patch(`/api/v1/rooms/${roomId}`)
        .set(authHeader(managerTokens))
        .send({ imageUrl: replacedUrl });

      expect(replaceResponse.status).toBe(200);
      expect(replaceResponse.body.imageUrl).toBe(replacedUrl);

      const removeResponse = await request(app)
        .patch(`/api/v1/rooms/${roomId}`)
        .set(authHeader(managerTokens))
        .send({ imageUrl: null });

      expect(removeResponse.status).toBe(200);
      expect(removeResponse.body.imageUrl).toBeNull();
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

  describe('S3 room image routes', () => {
    it('should prevent employees from requesting an S3 upload URL', async () => {
      const room = await prisma.room.create({
        data: { name: 'Upload Permission Room', capacity: 8 },
      });

      const response = await request(app)
        .post(`/api/v1/rooms/${room.id}/image-upload`)
        .set(authHeader(employeeTokens))
        .send({ contentType: 'image/jpeg', contentLength: 1024 });

      expect(response.status).toBe(403);
    });

    it('should reject unsupported upload types before contacting storage', async () => {
      const room = await prisma.room.create({
        data: { name: 'Upload Validation Room', capacity: 8 },
      });

      const response = await request(app)
        .post(`/api/v1/rooms/${room.id}/image-upload`)
        .set(authHeader(managerTokens))
        .send({ contentType: 'image/svg+xml', contentLength: 1024 });

      expect(response.status).toBe(400);
    });

    it('should prevent employees from removing room images', async () => {
      const room = await prisma.room.create({
        data: { name: 'Image Delete Permission Room', capacity: 8 },
      });

      const response = await request(app)
        .delete(`/api/v1/rooms/${room.id}/image`)
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(403);
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
