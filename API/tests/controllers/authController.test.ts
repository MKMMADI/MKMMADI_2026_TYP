import { signup, signupManager, login, refresh, logout } from '../../src_ts/controllers/authController';
import prisma from '../../src_ts/prisma';
import * as authUtils from '../../src_ts/utils/auth';
import crypto from 'crypto';

jest.mock('../../src_ts/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    session: {
      updateMany: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('../../src_ts/utils/auth', () => ({
  hashPassword: jest.fn((password) => `hashed_${password}`),
  verifyPassword: jest.fn((password, hash) => password === 'validpassword'),
  signAccessToken: jest.fn((payload) => ({ token: 'mock_access_token', jti: 'mock_jti_123' })),
  generateRefreshToken: jest.fn(() => ({ token: 'mock_refresh_token', token_hash: 'mock_hash_123' })),
  storeSession: jest.fn(),
  storeRefreshToken: jest.fn(),
  refreshTokenExpiryDate: jest.fn(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
}));

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  role: 'EMPLOYEE',
  passwordHash: 'hashed_password',
};

describe('authController - signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new user and returns tokens on successful signup', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

    const req = {
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'securepassword',
      },
    } as any;

    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await signup(req, res, next);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Test User',
        email: 'test@example.com',
        role: 'EMPLOYEE',
      }),
    });
    expect(res.json).toHaveBeenCalledWith({
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
    });
  });

  it('returns 400 error when required fields are missing', async () => {
    const req = { body: {} } as any;
    const res = {} as any;
    const next = jest.fn();

    await signup(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Missing fields', status: 400 })
    );
  });

  it('returns 400 error when email already exists', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const req = {
      body: { name: 'Test', email: 'test@example.com', password: 'pass' },
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await signup(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email already in use', status: 400 })
    );
  });
});

describe('authController - signupManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows manager signup when no manager exists', async () => {
    (prisma.user.count as jest.Mock).mockResolvedValue(0);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ ...mockUser, role: 'MANAGER' });

    const req = {
      body: { name: 'Manager', email: 'manager@example.com', password: 'pass' },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await signupManager(req, res, next);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: 'MANAGER' }),
    });
  });

  it('returns 403 error when a manager already exists', async () => {
    (prisma.user.count as jest.Mock).mockResolvedValue(1);

    const req = {
      body: { name: 'Manager', email: 'manager@example.com', password: 'pass' },
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await signupManager(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'A manager account already exists', status: 403 })
    );
  });
});

describe('authController - login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns tokens on successful login with valid credentials', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const req = {
      body: { email: 'test@example.com', password: 'validpassword' },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await login(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Login successful',
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
    });
  });

  it('returns 400 error when credentials are invalid', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = {
      body: { email: 'test@example.com', password: 'wrongpassword' },
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid credentials', status: 400 })
    );
  });

  it('returns 400 error when user does not exist', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = {
      body: { email: 'nonexistent@example.com', password: 'password' },
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid credentials', status: 400 })
    );
  });

  it('returns 400 error when email or password is missing', async () => {
    const req = { body: {} } as any;
    const res = {} as any;
    const next = jest.fn();

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Missing fields', status: 400 })
    );
  });
});

describe('authController - refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockStoredToken = {
    id: 1,
    userId: 1,
    tokenHash: 'mock_hash_123',
    revoked: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  it('returns new tokens when refresh token is valid', async () => {
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockStoredToken);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.refreshToken.update as jest.Mock).mockResolvedValue(mockStoredToken);

    const req = {
      body: { refreshToken: 'valid_refresh_token' },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await refresh(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
    });
  });

  it('returns 400 error when refreshToken is missing', async () => {
    const req = { body: {} } as any;
    const res = {} as any;
    const next = jest.fn();

    await refresh(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Missing refreshToken', status: 400 })
    );
  });

  it('returns 401 error when refresh token is invalid', async () => {
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

    const req = {
      body: { refreshToken: 'invalid_token' },
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await refresh(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid refresh token', status: 401 })
    );
  });

  it('returns 401 error when refresh token is revoked', async () => {
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
      ...mockStoredToken,
      revoked: true,
    });

    const req = {
      body: { refreshToken: 'revoked_token' },
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await refresh(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid refresh token', status: 401 })
    );
  });

  it('returns 401 error when refresh token has expired', async () => {
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
      ...mockStoredToken,
      expiresAt: new Date(Date.now() - 1000),
    });

    const req = {
      body: { refreshToken: 'expired_token' },
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await refresh(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Refresh token expired', status: 401 })
    );
  });
});

describe('authController - logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSession = { jwtId: 'mock_jti_123', userId: 1 };
  const mockRefreshToken = { id: 1, tokenHash: 'mock_hash' };

  it('logs out successfully with valid token', async () => {
    jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({ jti: 'mock_jti_123' } as any);
    (prisma.session.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockRefreshToken);
    (prisma.refreshToken.update as jest.Mock).mockResolvedValue(mockRefreshToken);

    const req = {
      headers: { authorization: 'Bearer valid_token' },
      body: { refreshToken: 'refresh_token' },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await logout(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out' });
  });

  it('returns 400 error when Authorization header is missing', async () => {
    const req = { headers: {} } as any;
    const res = {} as any;
    const next = jest.fn();

    await logout(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Missing Authorization header', status: 400 })
    );
  });

  it('returns 400 error when Authorization header format is invalid', async () => {
    const req = { headers: { authorization: 'InvalidFormat' } } as any;
    const res = {} as any;
    const next = jest.fn();

    await logout(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid Authorization header', status: 400 })
    );
  });

  it('returns 400 error when token is missing jti', async () => {
    jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({} as any);

    const req = {
      headers: { authorization: 'Bearer token_without_jti' },
    } as any;
    const res = {} as any;
    const next = jest.fn();

    await logout(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Token missing jti', status: 400 })
    );
  });
});
