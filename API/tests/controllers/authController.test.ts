import { signup, signupManager, login, refresh, logout } from '../../src_ts/controllers/authController';
import * as authService from '../../src_ts/services/authService';
import { disconnectUserSockets } from '../../src_ts/services/realtime';

jest.mock('../../src_ts/services/authService', () => ({
  signup: jest.fn(), signupManager: jest.fn(), login: jest.fn(), refresh: jest.fn(), logout: jest.fn(),
}));
jest.mock('../../src_ts/services/realtime', () => ({ disconnectUserSockets: jest.fn() }));

const response = () => ({ json: jest.fn() }) as any;

describe('authController service delegation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delegates signup, manager signup, login, and refresh payloads', async () => {
    const body = { name: 'Name', email: 'person@example.com', password: 'secret' };
    const result = { accessToken: 'access', refreshToken: 'refresh' };
    (authService.signup as jest.Mock).mockResolvedValue(result);
    (authService.signupManager as jest.Mock).mockResolvedValue(result);
    (authService.login as jest.Mock).mockResolvedValue({ message: 'Login successful', ...result });
    (authService.refresh as jest.Mock).mockResolvedValue(result);
    const res = response();
    await signup({ body } as any, res, jest.fn());
    await signupManager({ body } as any, res, jest.fn());
    await login({ body } as any, res, jest.fn());
    await refresh({ body: { refreshToken: 'refresh' } } as any, res, jest.fn());
    expect(authService.signup).toHaveBeenCalledWith(body);
    expect(authService.signupManager).toHaveBeenCalledWith(body);
    expect(authService.login).toHaveBeenCalledWith(body.email, body.password);
    expect(authService.refresh).toHaveBeenCalledWith('refresh');
    expect(res.json).toHaveBeenCalledTimes(4);
  });

  it('parses logout header and disconnects the user after successful logout', async () => {
    (authService.logout as jest.Mock).mockResolvedValue(9);
    const res = response();
    await logout({
      headers: { authorization: 'Bearer access-token' },
      body: { refreshToken: 'refresh-token' },
    } as any, res, jest.fn());
    expect(authService.logout).toHaveBeenCalledWith('access-token', 'refresh-token');
    expect(disconnectUserSockets).toHaveBeenCalledWith(9);
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out' });
  });

  it('rejects missing or malformed authorization headers at the HTTP boundary', async () => {
    const next = jest.fn();
    await logout({ headers: {} } as any, response(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Missing Authorization header', status: 400 }));
    next.mockClear();
    await logout({ headers: { authorization: 'Bearer' } } as any, response(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid Authorization header', status: 400 }));
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('forwards service errors', async () => {
    const error = Object.assign(new Error('Invalid credentials'), { status: 400 });
    (authService.login as jest.Mock).mockRejectedValue(error);
    const next = jest.fn();
    await login({ body: { email: 'bad', password: 'bad' } } as any, response(), next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
