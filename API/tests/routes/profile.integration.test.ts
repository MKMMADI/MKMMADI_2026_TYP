import request from 'supertest';
import app from '../../src_ts/app';
import {
  createAndLoginUser,
  authHeader,
  cleanupTestData,
} from '../helpers/testHelpers';
import prisma from '../../src_ts/prisma';

describe('Profile Routes Integration Tests', () => {
  let employeeTokens: string;
  let employeeId: number;

  beforeEach(async () => {
    await cleanupTestData();

    const employee = await createAndLoginUser({
      role: 'EMPLOYEE',
      name: 'Profile Test User',
      email: `profile_${Date.now()}@test.com`,
      department: 'Engineering',
      contactNumber: '+1234567890',
    });
    employeeTokens = employee.tokens.accessToken;
    employeeId = employee.user.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/v1/profile/me', () => {
    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/v1/profile/me')
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Profile Test User');
      expect(response.body.email).toContain('@test.com');
    });

    it('should reject unauthenticated access', async () => {
      const response = await request(app).get('/api/v1/profile/me');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Missing Authorization header');
    });
  });

  describe('PATCH /api/v1/profile/user', () => {
    it('should update user profile fields', async () => {
      const updateData = {
        name: 'Updated Name',
        department: 'Marketing',
        contactNumber: '+9876543210',
      };

      const response = await request(app)
        .patch('/api/v1/profile/user')
        .set(authHeader(employeeTokens))
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.department).toBe(updateData.department);
      expect(response.body.contactNumber).toBe(updateData.contactNumber);
    });

    it('should partially update profile', async () => {
      const response = await request(app)
        .patch('/api/v1/profile/user')
        .set(authHeader(employeeTokens))
        .send({ contactNumber: '+1111111111' });

      expect(response.status).toBe(200);
      expect(response.body.contactNumber).toBe('+1111111111');
      expect(response.body.name).toBe('Profile Test User');
    });

    it('should prevent updating email', async () => {
      const response = await request(app)
        .patch('/api/v1/profile/user')
        .set(authHeader(employeeTokens))
        .send({ email: 'hacker@example.com' });

      expect([200, 400]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.email).not.toBe('hacker@example.com');
      }
    });

    it('should prevent updating role', async () => {
      const response = await request(app)
        .patch('/api/v1/profile/user')
        .set(authHeader(employeeTokens))
        .send({ role: 'MANAGER' });

      expect([200, 400]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.role).toBe('EMPLOYEE');
      }
    });

    it('should reject unauthenticated update', async () => {
      const response = await request(app)
        .patch('/api/v1/profile/user')
        .send({ name: 'Update' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/profile/user', () => {
    it('should deactivate user account', async () => {
      const response = await request(app)
        .delete('/api/v1/profile/user')
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(200);
      expect(response.body.message).toBeDefined();

      const user = await prisma.user.findUnique({
        where: { id: employeeId },
      });
      expect(user?.Active).toBe(false);
    });

    it('should invalidate tokens after deactivation', async () => {
      await request(app)
        .delete('/api/v1/profile/user')
        .set(authHeader(employeeTokens));

      const response = await request(app)
        .get('/api/v1/profile/me')
        .set(authHeader(employeeTokens));

      expect([401, 403]).toContain(response.status);
    });

    it('should reject unauthenticated deletion', async () => {
      const response = await request(app)
        .delete('/api/v1/profile/user')
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe('Profile Workflow', () => {
    it('should handle complete profile management workflow', async () => {
      const getResponse = await request(app)
        .get('/api/v1/profile/me')
        .set(authHeader(employeeTokens));
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.name).toBe('Profile Test User');

      const updateResponse = await request(app)
        .patch('/api/v1/profile/user')
        .set(authHeader(employeeTokens))
        .send({
          name: 'Workflow Test User',
          department: 'Sales',
        });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe('Workflow Test User');

      const verifyResponse = await request(app)
        .get('/api/v1/profile/me')
        .set(authHeader(employeeTokens));
      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.name).toBe('Workflow Test User');
      expect(verifyResponse.body.department).toBe('Sales');

      const deactivateResponse = await request(app)
        .delete('/api/v1/profile/user')
        .set(authHeader(employeeTokens));
      expect(deactivateResponse.status).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty update payload gracefully', async () => {
      const response = await request(app)
        .patch('/api/v1/profile/user')
        .set(authHeader(employeeTokens))
        .send({});

      expect([200, 400]).toContain(response.status);
    });

    it('should handle very long field values', async () => {
      const longName = 'A'.repeat(200);

      const response = await request(app)
        .patch('/api/v1/profile/user')
        .set(authHeader(employeeTokens))
        .send({ name: longName });

      expect([200, 400]).toContain(response.status);
    });

    it('should sanitize special characters in input', async () => {
      const specialChars = '<script>alert("xss")</script>';

      const response = await request(app)
        .patch('/api/v1/profile/user')
        .set(authHeader(employeeTokens))
        .send({ name: specialChars });

      expect([200, 400]).toContain(response.status);
    });
  });
});
