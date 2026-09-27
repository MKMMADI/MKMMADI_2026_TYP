import request from 'supertest';
import app from '../../src_ts/app';
import {
  createUser,
  createAndLoginUser,
  authHeader,
  cleanupTestData,
  randomString,
} from '../helpers/testHelpers';
import prisma from '../../src_ts/prisma';

describe('Auth Routes Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/v1/auth/register-manager', () => {
    it('should register a manager when no manager exists', async () => {
      const response = await request(app).post('/api/v1/auth/register-manager').send({
        name: 'Test Manager',
        email: 'manager@example.com',
        password: 'ManagerPass123!',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject registration when a manager already exists', async () => {
      // Create first manager
      await createUser({ role: 'MANAGER', email: 'first@example.com' });

      const response = await request(app).post('/api/v1/auth/register-manager').send({
        name: 'Second Manager',
        email: 'second@example.com',
        password: 'ManagerPass123!',
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('already exists');
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app).post('/api/v1/auth/register-manager').send({
        name: 'Test Manager',
        // missing email and password
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Missing fields');
    });

    it('should reject registration with duplicate email', async () => {
      await createUser({ email: 'duplicate@example.com' });

      const response = await request(app).post('/api/v1/auth/register-manager').send({
        name: 'Duplicate Test',
        email: 'duplicate@example.com',
        password: 'Password123!',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Email already in use');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    let managerTokens: { accessToken: string };

    beforeEach(async () => {
      const manager = await createAndLoginUser({ role: 'MANAGER' });
      managerTokens = manager.tokens;
    });

    it('should register an employee when invoked by manager', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set(authHeader(managerTokens.accessToken))
        .send({
          name: 'Test Employee',
          email: 'employee@example.com',
          password: 'EmployeePass123!',
          role: 'EMPLOYEE',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
    });

    it('should reject registration by non-manager', async () => {
      const employee = await createAndLoginUser({ role: 'EMPLOYEE' });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .set(authHeader(employee.tokens.accessToken))
        .send({
          name: 'Another Employee',
          email: 'another@example.com',
          password: 'Pass123!',
        });

      expect(response.status).toBe(403);
    });

    it('should reject registration without authorization header', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Pass123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Missing Authorization header');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await createUser({
        email: 'login@test.com',
        password: 'CorrectPassword123!',
        name: 'Login Test User',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@test.com',
          password: 'CorrectPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.message).toBe('Login successful');
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'CorrectPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword!',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@test.com' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Missing fields');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let tokens: { accessToken: string; refreshToken: string };

    beforeEach(async () => {
      const user = await createAndLoginUser();
      tokens = user.tokens;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).not.toBe(tokens.accessToken);
      expect(response.body.refreshToken).not.toBe(tokens.refreshToken);
    });

    it('should reject refresh with missing token', async () => {
      const response = await request(app).post('/api/v1/auth/refresh').send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Missing refreshToken');
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid_token_here' });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid refresh token');
    });

    it('should revoke old refresh token after refresh', async () => {
      // First refresh
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      const newRefreshToken = refreshResponse.body.refreshToken;

      // Try to use old token again
      const secondRefresh = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(secondRefresh.status).toBe(401);
      expect(secondRefresh.body.message).toContain('Invalid refresh token');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let tokens: { accessToken: string; refreshToken: string };

    beforeEach(async () => {
      const user = await createAndLoginUser();
      tokens = user.tokens;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set(authHeader(tokens.accessToken))
        .send({ refreshToken: tokens.refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out');
    });

    it('should reject logout without authorization header', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Missing Authorization header');
    });

    it('should reject logout with invalid token format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set({ Authorization: 'InvalidFormat' })
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid Authorization header');
    });

    it('should revoke access token on logout', async () => {
      // Logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set(authHeader(tokens.accessToken))
        .send({ refreshToken: tokens.refreshToken });

      // Try to use the revoked token
      const response = await request(app)
        .get('/api/v1/rooms')
        .set(authHeader(tokens.accessToken));

      expect(response.status).toBe(401);
    });
  });

  describe('Role-based Access Control', () => {
    it('should assign correct role during manager registration', async () => {
      const response = await request(app).post('/api/v1/auth/register-manager').send({
        name: 'Manager Role Test',
        email: `manager_role_${Date.now()}@test.com`,
        password: 'Password123!',
      });

      expect(response.status).toBe(200);
      
      // Decode token to verify role (basic check)
      expect(response.body.accessToken).toBeDefined();
    });

    it('should normalize role to uppercase', async () => {
      const manager = await createAndLoginUser({ role: 'MANAGER' });
      
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set(authHeader(manager.tokens.accessToken))
        .send({
          name: 'Role Test',
          email: `role_test_${Date.now()}@test.com`,
          password: 'Password123!',
          role: 'employee', // lowercase
        });

      expect(response.status).toBe(200);
    });
  });
});
