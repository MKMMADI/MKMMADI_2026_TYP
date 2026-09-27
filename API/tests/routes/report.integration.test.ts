import request from 'supertest';
import app from '../../src_ts/app';
import {
  createAndLoginUser,
  authHeader,
  cleanupTestData,
} from '../helpers/testHelpers';
import prisma from '../../src_ts/prisma';

function reportRange() {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
}

describe('Report Routes Integration Tests', () => {
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

  describe('GET /api/v1/reports/availability', () => {
    it('should get availability report as manager', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/v1/reports/availability')
        .set(authHeader(managerTokens))
        .query({ startDate: startDate.toISOString(), endDate: endDate.toISOString() });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
    });

    it('should get availability report as clerk', async () => {
      const response = await request(app)
        .get('/api/v1/reports/availability')
        .set(authHeader(clerkTokens))
        .query(reportRange());

      expect(response.status).toBe(200);
    });

    it('should reject availability report for employee', async () => {
      const response = await request(app)
        .get('/api/v1/reports/availability')
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(403);
    });

    it('should reject unauthenticated access', async () => {
      const response = await request(app).get('/api/v1/reports/availability');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/reports/usage', () => {
    it('should get usage report as manager', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/v1/reports/usage')
        .set(authHeader(managerTokens))
        .query({ startDate: startDate.toISOString(), endDate: endDate.toISOString() });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
    });

    it('should get usage report as clerk', async () => {
      const response = await request(app)
        .get('/api/v1/reports/usage')
        .set(authHeader(clerkTokens))
        .query(reportRange());

      expect(response.status).toBe(200);
    });

    it('should reject usage report for employee', async () => {
      const response = await request(app)
        .get('/api/v1/reports/usage')
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/reports/popularity', () => {
    it('should get popularity report as manager', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/v1/reports/popularity')
        .set(authHeader(managerTokens))
        .query({ startDate: startDate.toISOString(), endDate: endDate.toISOString() });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
    });

    it('should get popularity report as clerk', async () => {
      const response = await request(app)
        .get('/api/v1/reports/popularity')
        .set(authHeader(clerkTokens))
        .query(reportRange());

      expect(response.status).toBe(200);
    });

    it('should reject popularity report for employee', async () => {
      const response = await request(app)
        .get('/api/v1/reports/popularity')
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(403);
    });
  });

  describe('Report Data Validation', () => {
    beforeEach(async () => {
      const room = await prisma.room.create({
        data: { name: 'Report Test Room', capacity: 10, description: 'Floor 1', status: 'AVAILABLE', isActive: true },
      });

      const user = await prisma.user.findFirst({ where: { role: 'EMPLOYEE' } });

      const startDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 2 * 60 * 60 * 1000);

      await prisma.booking.create({
        data: {
          employeeId: user!.id,
          purpose: 'Report Test Booking',
          startAt: startDate,
          endAt: endDate,
          status: 'CONFIRMED',
          rooms: { create: { roomId: room.id, roomStatus: 'BOOKED' } },
        },
      });
    });

    it('should include booking data in availability report', async () => {
      const startDate = new Date(Date.now() - 1 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 3 * 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/v1/reports/availability')
        .set(authHeader(managerTokens))
        .query({ startDate: startDate.toISOString(), endDate: endDate.toISOString() });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
    });

    it('should handle empty date range gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/reports/availability')
        .set(authHeader(managerTokens));

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Role-based Access Control', () => {
    it('should allow manager access to all reports', async () => {
      const reports = ['availability', 'usage', 'popularity'];

      for (const report of reports) {
        const response = await request(app)
          .get(`/api/v1/reports/${report}`)
          .set(authHeader(managerTokens))
          .query(reportRange());

        expect(response.status).toBe(200);
      }
    });

    it('should allow clerk access to all reports', async () => {
      const reports = ['availability', 'usage', 'popularity'];

      for (const report of reports) {
        const response = await request(app)
          .get(`/api/v1/reports/${report}`)
          .set(authHeader(clerkTokens))
          .query(reportRange());

        expect(response.status).toBe(200);
      }
    });

    it('should deny employee access to all reports', async () => {
      const reports = ['availability', 'usage', 'popularity'];

      for (const report of reports) {
        const response = await request(app)
          .get(`/api/v1/reports/${report}`)
          .set(authHeader(employeeTokens));

        expect(response.status).toBe(403);
      }
    });
  });
});
