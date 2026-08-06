import crypto from 'crypto';
import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('../../src_ts/config', () => ({
  __esModule: true,
  default: {
    JWT_SECRET: 'test-secret',
    ACCESS_TOKEN_EXPIRES: '15m',
    REFRESH_TOKEN_EXPIRES_DAYS: 30,
    URL: 'postgres://user:pass@localhost:5432/testdb',
    PORT: 4000,
    LOG_LEVEL: 'info',
    NODE_ENV: 'test',
  },
}));

const mockHashPassword = jest.fn().mockReturnValue('hashed-password');
const mockVerifyPassword = jest.fn().mockReturnValue(true);
const mockSignAccessToken = jest.fn().mockReturnValue({ token: 'access-token', jti: 'jti-123' });
const mockGenerateRefreshToken = jest.fn().mockReturnValue({ token: 'refresh-token', token_hash: 'refresh-token-hash' });
const mockStoreSession = jest.fn().mockResolvedValue(undefined);
const mockStoreRefreshToken = jest.fn().mockResolvedValue(undefined);
const mockRefreshTokenExpiryDate = jest.fn().mockReturnValue(new Date(Date.now() + 1000 * 60 * 60 * 24));

jest.mock('../../src_ts/utils/auth', () => ({
  hashPassword: mockHashPassword,
  verifyPassword: mockVerifyPassword,
  signAccessToken: mockSignAccessToken,
  generateRefreshToken: mockGenerateRefreshToken,
  storeSession: mockStoreSession,
  storeRefreshToken: mockStoreRefreshToken,
  refreshTokenExpiryDate: mockRefreshTokenExpiryDate,
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  worker: {
    create: jest.fn(),
  },
  admin: {
    create: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  session: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../../src_ts/prisma', () => mockPrisma);

import app from '../../src_ts/app';

function resetMocks() {
  Object.values(mockPrisma).forEach((model) => {
    Object.values(model as Record<string, jest.Mock>).forEach((fn) => {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        fn.mockClear();
      }
    });
  });
  mockHashPassword.mockClear();
  mockVerifyPassword.mockClear();
  mockSignAccessToken.mockClear();
  mockGenerateRefreshToken.mockClear();
  mockStoreSession.mockClear();
  mockStoreRefreshToken.mockClear();
  mockRefreshTokenExpiryDate.mockClear();
}

describe('authRoutes integration tests', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('POST /api/auth/signup returns tokens and creates a user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: 11, name: 'Integration User', email: 'integration@example.com', role: 'worker' });
    mockPrisma.worker.create.mockResolvedValue({ id: 21, user_id: 11, employee_number: 'E789', department: 'Marketing', office_location: 'Branch' });
    mockPrisma.admin.create.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Integration User', email: 'integration@example.com', password: 'Password123!', employee_number: 'E789', department: 'Marketing', office_location: 'Branch' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('POST /api/auth/login returns new access and refresh tokens', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 22, email: 'login-integration@example.com', password_hash: 'hashed-password', role: 'worker' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login-integration@example.com', password: 'Password123!' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('POST /api/auth/refresh renews tokens with a valid refresh token', async () => {
    const refreshToken = 'refresh-token-integration';
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    mockPrisma.refreshToken.findUnique.mockResolvedValue({ id: 3, user_id: 33, revoked: false, expires_at: new Date(Date.now() + 1000 * 60), token_hash: tokenHash });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 33, email: 'refresh-integration@example.com', role: 'worker' });
    mockPrisma.refreshToken.update.mockResolvedValue({ id: 3, revoked: true });
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 4, user_id: 33, token_hash: 'new-hash', expires_at: new Date() });

    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('POST /api/auth/logout revokes session and optional refresh token', async () => {
    const token = jwt.sign({ sub: 44, email: 'logout-integration@example.com', role: 'worker' }, 'test-secret', { jwtid: 'jti-logout-integration' });
    mockPrisma.session.findUnique.mockResolvedValue({ id: 4, user_id: 44, jwt_id: 'jti-logout-integration', revoked: false, expires_at: new Date(Date.now() + 1000 * 60) });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 44, email: 'logout-integration@example.com', role: 'worker' });
    mockPrisma.session.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({ refreshToken: 'refresh-token-logout' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Logged out' });
  });
});