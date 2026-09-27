import request from 'supertest';
import app from '../../src_ts/app';
import {
  createAndLoginUser,
  authHeader,
  cleanupTestData,
} from '../helpers/testHelpers';
import prisma from '../../src_ts/prisma';
import jwt from 'jsonwebtoken';
import config from '../../src_ts/config';

function reportRange() {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
}

describe('Authentication Middleware Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Authorization Header Validation', () => {
    it('should reject requests without Authorization header', async () => {
      const response = await request(app).get('/api/v1/rooms');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Missing Authorization header');
    });

    it('should reject requests with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/rooms')
        .set({ Authorization: 'InvalidFormat' });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid Authorization header');
    });

    it('should reject requests with unsupported token type', async () => {
      const response = await request(app)
        .get('/api/v1/rooms')
        .set({ Authorization: 'Basic dXNlcjpwYXNz' });

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/v1/rooms')
        .set(authHeader('invalid.jwt.token'));

      expect(response.status).toBe(401);
    });

    it('should reject requests with expired token', async () => {
      const user = await createAndLoginUser({ role: 'EMPLOYEE' });

      const payload = {
        sub: user.user.id,
        email: user.user.email,
        role: user.user.role,
        iat: Math.floor(Date.now() / 1000) - 3600,
        exp: Math.floor(Date.now() / 1000) - 3500,
      };

      const expiredToken = jwt.sign(payload, config.JWT_SECRET);

      const response = await request(app)
        .get('/api/v1/rooms')
        .set(authHeader(expiredToken));

      expect(response.status).toBe(401);
    });
  });

  describe('Session Validation', () => {
    it('should reject requests with revoked session', async () => {
      const user = await createAndLoginUser();

      await request(app)
        .post('/api/v1/auth/logout')
        .set(authHeader(user.tokens.accessToken))
        .send({ refreshToken: user.tokens.refreshToken });

      const response = await request(app)
        .get('/api/v1/rooms')
        .set(authHeader(user.tokens.accessToken));

      expect(response.status).toBe(401);
    });

    it('should accept valid session token', async () => {
      const user = await createAndLoginUser();

      const response = await request(app)
        .get('/api/v1/rooms')
        .set(authHeader(user.tokens.accessToken));

      expect(response.status).toBe(200);
    });
  });

  describe('User Deactivation Check', () => {
    it('should reject requests from deactivated users', async () => {
      const user = await createAndLoginUser();

      await prisma.user.update({
        where: { id: user.user.id },
        data: { Active: false },
      });

      const response = await request(app)
        .get('/api/v1/rooms')
        .set(authHeader(user.tokens.accessToken));

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Account deactivated');
    });

    it('should accept requests from active users', async () => {
      const user = await createAndLoginUser();

      const response = await request(app)
        .get('/api/v1/rooms')
        .set(authHeader(user.tokens.accessToken));

      expect(response.status).toBe(200);
    });
  });
});

describe('Role-Based Access Control (RBAC) Integration Tests', () => {
  let managerTokens: string;
  let clerkTokens: string;
  let employeeTokens: string;
  let roomId: number;

  beforeEach(async () => {
    await cleanupTestData();

    const manager = await createAndLoginUser({ role: 'MANAGER' });
    managerTokens = manager.tokens.accessToken;

    const clerk = await createAndLoginUser({ role: 'CLERK' });
    clerkTokens = clerk.tokens.accessToken;

    const employee = await createAndLoginUser({ role: 'EMPLOYEE' });
    employeeTokens = employee.tokens.accessToken;

    const room = await prisma.room.create({
      data: { name: 'RBAC Test Room', capacity: 10, description: 'Floor 1', status: 'AVAILABLE', isActive: true },
    });
    roomId = room.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Manager Role Permissions', () => {
    it('should allow manager to access all routes', async () => {
      expect((await request(app).get('/api/v1/rooms').set(authHeader(managerTokens))).status).toBe(200);
      expect((await request(app).post('/api/v1/rooms').set(authHeader(managerTokens)).send({ name: 'Test', capacity: 5, description: 'Test' })).status).toBe(201);

      expect((await request(app).get('/api/v1/amenities').set(authHeader(managerTokens))).status).toBe(200);
      expect((await request(app).post('/api/v1/amenities').set(authHeader(managerTokens)).send({ name: 'TestAmenity' })).status).toBe(201);

      expect((await request(app).get('/api/v1/consumables').set(authHeader(managerTokens))).status).toBe(200);
      expect((await request(app).post('/api/v1/consumables').set(authHeader(managerTokens)).send({ name: 'Test', unit: 'pcs', quantityOnHand: 10, reorderLevel: 5 })).status).toBe(201);

      expect((await request(app).get('/api/v1/reports/availability').set(authHeader(managerTokens)).query(reportRange())).status).toBe(200);
      expect((await request(app).get('/api/v1/reports/usage').set(authHeader(managerTokens)).query(reportRange())).status).toBe(200);
      expect((await request(app).get('/api/v1/reports/popularity').set(authHeader(managerTokens)).query(reportRange())).status).toBe(200);

      expect((await request(app).get('/api/v1/bookings').set(authHeader(managerTokens))).status).toBe(200);
      expect((await request(app).get('/api/v1/bookings/rejection-reasons').set(authHeader(managerTokens))).status).toBe(200);
    });
  });

  describe('Clerk Role Permissions', () => {
    it('should allow clerk operational access', async () => {
      expect((await request(app).get('/api/v1/rooms').set(authHeader(clerkTokens))).status).toBe(200);
      expect((await request(app).get('/api/v1/amenities').set(authHeader(clerkTokens))).status).toBe(200);
      expect((await request(app).get('/api/v1/consumables').set(authHeader(clerkTokens))).status).toBe(200);
      const consumable = await request(app).post('/api/v1/consumables').set(authHeader(clerkTokens)).send({ name: 'ClerkTest', unit: 'pcs', quantityOnHand: 10, reorderLevel: 5 });
      expect(consumable.status).toBe(201);
      expect((await request(app).get('/api/v1/reports/availability').set(authHeader(clerkTokens)).query(reportRange())).status).toBe(200);
      expect((await request(app).get('/api/v1/bookings/rejection-reasons').set(authHeader(clerkTokens))).status).toBe(200);
    });

    it('should restrict clerk from manager-only operations', async () => {
      expect((await request(app).post('/api/v1/rooms').set(authHeader(clerkTokens)).send({ name: 'Test', capacity: 5, description: 'Test' })).status).toBe(403);

      const consumable = await prisma.consumableItem.create({ data: { name: 'ToDelete', unit: 'pcs', quantityOnHand: 10, reorderLevel: 5 } });
      expect((await request(app).delete(`/api/v1/consumables/${consumable.id}`).set(authHeader(clerkTokens))).status).toBe(403);
    });
  });

  describe('Employee Role Permissions', () => {
    it('should allow employee basic access', async () => {
      expect((await request(app).get('/api/v1/rooms').set(authHeader(employeeTokens))).status).toBe(200);
      expect((await request(app).get('/api/v1/amenities').set(authHeader(employeeTokens))).status).toBe(200);
      expect((await request(app).get('/api/v1/consumables').set(authHeader(employeeTokens))).status).toBe(200);
      expect((await request(app).get('/api/v1/profile/me').set(authHeader(employeeTokens))).status).toBe(200);
      expect((await request(app).get('/api/v1/bookings').set(authHeader(employeeTokens))).status).toBe(200);
    });

    it('should restrict employee from admin operations', async () => {
      expect((await request(app).post('/api/v1/rooms').set(authHeader(employeeTokens)).send({ name: 'Test', capacity: 5, description: 'Test' })).status).toBe(403);
      expect((await request(app).post('/api/v1/amenities').set(authHeader(employeeTokens)).send({ name: 'Test' })).status).toBe(403);
      expect((await request(app).get('/api/v1/reports/availability').set(authHeader(employeeTokens))).status).toBe(403);
    });
  });
});
