import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

jest.mock('../../src_ts/config', () => ({
  __esModule: true,
  default: { JWT_SECRET: 'test-secret' },
}));

const mockHashPassword = jest.fn().mockReturnValue('hashed-password');
const mockVerifyPassword = jest.fn();
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
    updateMany: jest.fn(),
  },
};

jest.mock('../../src_ts/prisma', () => mockPrisma);

import { signup, login, refresh, logout } from '../../src_ts/controllers/authController';

function createMockRequest(body: Record<string, any>, headers: Record<string, string> = {}) {
  return {
    body,
    headers,
  } as unknown as Request;
}

function createMockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  return res as Response;
}

function createNextFunction() {
  return jest.fn() as unknown as NextFunction;
}

describe('authController unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signup should create a user and return tokens', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: 1, name: 'Test User', email: 'test@example.com', role: 'worker' });
    mockPrisma.worker.create.mockResolvedValue({ id: 1, user_id: 1, employee_number: 'E123', department: 'IT', office_location: 'HQ' });
    mockPrisma.admin.create.mockResolvedValue(null);

    const req = createMockRequest({ name: 'Test User', email: 'test@example.com', password: 'Password123!', employee_number: 'E123', department: 'IT', office_location: 'HQ' });
    const res = createMockResponse();
    const next = createNextFunction();

    await signup(req, res, next);

    expect(mockHashPassword).toHaveBeenCalledWith('Password123!');
    expect(mockPrisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: 'test@example.com' }) });
    expect(mockPrisma.worker.create).toHaveBeenCalledWith({ data: expect.objectContaining({ user_id: 1 }) });
    expect(mockStoreSession).toHaveBeenCalledWith(1, 'jti-123', expect.any(Date));
    expect(mockStoreRefreshToken).toHaveBeenCalledWith(1, 'refresh-token-hash', expect.any(Date));
    expect(res.json).toHaveBeenCalledWith({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('signup should call next with missing fields error', async () => {
    const req = createMockRequest({ name: 'Test User', password: 'Password123!' });
    const res = createMockResponse();
    const next = createNextFunction();

    await signup(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = (next as jest.Mock).mock.calls[0][0] as Error;
    expect(error.message).toBe('Missing fields');
  });

  it('login should return tokens when credentials are valid', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 2, email: 'login@example.com', password_hash: 'hashed', role: 'worker' });
    mockVerifyPassword.mockReturnValue(true);

    const req = createMockRequest({ email: 'login@example.com', password: 'Password123!' });
    const res = createMockResponse();
    const next = createNextFunction();

    await login(req, res, next);

    expect(mockVerifyPassword).toHaveBeenCalledWith('Password123!', 'hashed');
    expect(mockStoreSession).toHaveBeenCalledWith(2, 'jti-123', expect.any(Date));
    expect(mockStoreRefreshToken).toHaveBeenCalledWith(2, 'refresh-token-hash', expect.any(Date));
    expect(res.json).toHaveBeenCalledWith({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('login should call next with invalid credentials when user is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = createMockRequest({ email: 'missing@example.com', password: 'Password123!' });
    const res = createMockResponse();
    const next = createNextFunction();

    await login(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = (next as jest.Mock).mock.calls[0][0] as Error;
    expect(error.message).toBe('Invalid credentials');
  });

  it('refresh should return new tokens when refresh token is valid', async () => {
    const refreshToken = 'valid-refresh-token';
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    mockPrisma.refreshToken.findUnique.mockResolvedValue({ id: 1, user_id: 3, revoked: false, expires_at: new Date(Date.now() + 1000 * 60 * 60), token_hash: tokenHash });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 3, email: 'refresh@example.com', role: 'worker' });
    mockPrisma.refreshToken.update.mockResolvedValue({});
    mockPrisma.refreshToken.create.mockResolvedValue({});

    const req = createMockRequest({ refreshToken });
    const res = createMockResponse();
    const next = createNextFunction();

    await refresh(req, res, next);

    expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledWith({ where: { token_hash: tokenHash } });
    expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { revoked: true } });
    expect(res.json).toHaveBeenCalledWith({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('logout should revoke session and refresh token', async () => {
    const token = jwt.sign({ sub: 5, email: 'logout@example.com' }, 'test-secret', { jwtid: 'jti-logout' });
    mockPrisma.session.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const req = createMockRequest({ refreshToken: 'refresh-token' }, { authorization: `Bearer ${token}` });
    const res = createMockResponse();
    const next = createNextFunction();

    await logout(req, res, next);

    expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({ where: { jwt_id: 'jti-logout' }, data: { revoked: true } });
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({ where: { token_hash: expect.any(String) }, data: { revoked: true } });
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out' });
    expect(next).not.toHaveBeenCalled();
  });
});
