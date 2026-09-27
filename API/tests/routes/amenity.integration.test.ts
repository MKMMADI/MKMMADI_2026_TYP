import request from 'supertest';
import app from '../../src_ts/app';
import {
  createAndLoginUser,
  authHeader,
  cleanupTestData,
  randomString,
} from '../helpers/testHelpers';
import prisma from '../../src_ts/prisma';

describe('Amenity Routes Integration Tests', () => {
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

  describe('GET /api/v1/amenities', () => {
    beforeEach(async () => {
      await prisma.amenity.createMany({
        data: [
          { name: 'Projector', description: 'HD Projector', isActive: true },
          { name: 'Whiteboard', description: 'Large whiteboard', isActive: true },
        ],
      });
    });

    it('should list all amenities for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/amenities')
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should reject unauthenticated access', async () => {
      const response = await request(app).get('/api/v1/amenities');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/amenities', () => {
    it('should create an amenity as manager', async () => {
      const amenityData = {
        name: randomString('TestAmenity'),
        description: 'Test Description',
      };

      const response = await request(app)
        .post('/api/v1/amenities')
        .set(authHeader(managerTokens))
        .send(amenityData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(amenityData.name);
    });

    it('should reject amenity creation by non-manager', async () => {
      const response = await request(app)
        .post('/api/v1/amenities')
        .set(authHeader(employeeTokens))
        .send({ name: 'Unauthorized Amenity' });

      expect(response.status).toBe(403);
    });

    it('should reject creation with missing name', async () => {
      const response = await request(app)
        .post('/api/v1/amenities')
        .set(authHeader(managerTokens))
        .send({ description: 'No name provided' });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/amenities/:id', () => {
    let amenityId: number;

    beforeEach(async () => {
      const amenity = await prisma.amenity.create({
        data: { name: 'Original Amenity', description: 'Original Desc', isActive: true },
      });
      amenityId = amenity.id;
    });

    it('should update an amenity as manager', async () => {
      const updateData = {
        name: 'Updated Amenity Name',
        description: 'Updated Description',
      };

      const response = await request(app)
        .patch(`/api/v1/amenities/${amenityId}`)
        .set(authHeader(managerTokens))
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
    });

    it('should reject update by non-manager', async () => {
      const response = await request(app)
        .patch(`/api/v1/amenities/${amenityId}`)
        .set(authHeader(employeeTokens))
        .send({ name: 'Unauthorized Update' });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent amenity', async () => {
      const fakeId = 999999;

      const response = await request(app)
        .patch(`/api/v1/amenities/${fakeId}`)
        .set(authHeader(managerTokens))
        .send({ name: 'Update' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/amenities/:id', () => {
    let amenityId: number;

    beforeEach(async () => {
      const amenity = await prisma.amenity.create({
        data: { name: 'To Delete', description: 'Will be archived', isActive: true },
      });
      amenityId = amenity.id;
    });

    it('should archive (soft delete) an amenity as manager', async () => {
      const response = await request(app)
        .delete(`/api/v1/amenities/${amenityId}`)
        .set(authHeader(managerTokens));

      expect(response.status).toBe(200);

      const archived = await prisma.amenity.findUnique({
        where: { id: amenityId },
      });
      expect(archived?.isActive).toBe(false);
    });

    it('should reject deletion by non-manager', async () => {
      const response = await request(app)
        .delete(`/api/v1/amenities/${amenityId}`)
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent amenity', async () => {
      const fakeId = 999999;

      const response = await request(app)
        .delete(`/api/v1/amenities/${fakeId}`)
        .set(authHeader(managerTokens));

      expect(response.status).toBe(404);
    });
  });

  describe('Role-based Access Control', () => {
    it('should allow manager full CRUD operations', async () => {
      const createResponse = await request(app)
        .post('/api/v1/amenities')
        .set(authHeader(managerTokens))
        .send({ name: randomString('ManagerAmenity'), description: 'Test' });
      expect(createResponse.status).toBe(201);

      const amenityId = createResponse.body.id;

      const updateResponse = await request(app)
        .patch(`/api/v1/amenities/${amenityId}`)
        .set(authHeader(managerTokens))
        .send({ name: 'Updated Name' });
      expect(updateResponse.status).toBe(200);

      const deleteResponse = await request(app)
        .delete(`/api/v1/amenities/${amenityId}`)
        .set(authHeader(managerTokens));
      expect(deleteResponse.status).toBe(200);
    });

    it('should restrict employee to read-only', async () => {
      const amenity = await prisma.amenity.create({
        data: { name: 'RBAC Test', description: 'Test', isActive: true },
      });

      const listResponse = await request(app)
        .get('/api/v1/amenities')
        .set(authHeader(employeeTokens));
      expect(listResponse.status).toBe(200);

      const createResponse = await request(app)
        .post('/api/v1/amenities')
        .set(authHeader(employeeTokens))
        .send({ name: 'Employee Amenity' });
      expect(createResponse.status).toBe(403);

      const updateResponse = await request(app)
        .patch(`/api/v1/amenities/${amenity.id}`)
        .set(authHeader(employeeTokens))
        .send({ name: 'Update' });
      expect(updateResponse.status).toBe(403);

      const deleteResponse = await request(app)
        .delete(`/api/v1/amenities/${amenity.id}`)
        .set(authHeader(employeeTokens));
      expect(deleteResponse.status).toBe(403);
    });
  });
});
