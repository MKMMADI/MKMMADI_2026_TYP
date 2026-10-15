/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Tests the profile controller behavior and response handling.
 */

import { getProfile, updateProfile, deactivateAccount, getMyBookings } from '../../src_ts/controllers/profileController';
import * as profileService from '../../src_ts/services/profileService';

jest.mock('../../src_ts/services/profileService', () => ({
  getProfile: jest.fn(), updateProfile: jest.fn(), deactivateAccount: jest.fn(), getMyBookings: jest.fn(),
}));

const user = { id: 1 };
/**
 * Creates a minimal mocked Express response for controller unit tests.

 * @returns A mocked response object with the methods used by the controller.
 */
const res = () => ({ json: jest.fn() }) as any;

describe('profileController service delegation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns profile and delegates editable fields', async () => {
    const profile = { id: 1, name: 'User' };
    (profileService.getProfile as jest.Mock).mockResolvedValue(profile);
    (profileService.updateProfile as jest.Mock).mockResolvedValue(profile);
    const response = res();
    const fields = { name: 'Updated' };
    await getProfile({ user } as any, response, jest.fn());
    await updateProfile({ user, body: fields } as any, response, jest.fn());
    expect(profileService.getProfile).toHaveBeenCalledWith(1);
    expect(profileService.updateProfile).toHaveBeenCalledWith(1, fields);
    expect(response.json).toHaveBeenNthCalledWith(1, profile);
  });

  it('returns the service deactivation response and delegates bookings', async () => {
    const deactivated = { message: 'Account deactivated successfully', user: { id: 1 } };
    (profileService.deactivateAccount as jest.Mock).mockResolvedValue(deactivated);
    (profileService.getMyBookings as jest.Mock).mockResolvedValue([]);
    const response = res();
    await deactivateAccount({ user } as any, response, jest.fn());
    await getMyBookings({ user } as any, response, jest.fn());
    expect(profileService.deactivateAccount).toHaveBeenCalledWith(1);
    expect(profileService.getMyBookings).toHaveBeenCalledWith(1);
    expect(response.json).toHaveBeenNthCalledWith(1, deactivated);
  });

  it('forwards service errors', async () => {
    const error = Object.assign(new Error('User not found'), { status: 404 });
    (profileService.getProfile as jest.Mock).mockRejectedValue(error);
    const next = jest.fn();
    await getProfile({ user } as any, res(), next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
