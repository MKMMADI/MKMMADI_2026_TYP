/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Tests the booking controller behavior and response handling.
 */

import {
  createBookingHandler, rescheduleBooking, listBookings, listAssignableClerks, assignBookingClerk,
  getBooking, approveBooking, rejectBooking, updateBookingStatus, cancelBooking, listOccupancy,
} from '../../src_ts/controllers/bookingController';
import * as bookingService from '../../src_ts/services/bookingService';
import { publishBookingUpdate } from '../../src_ts/services/realtime';

jest.mock('../../src_ts/services/bookingService', () => ({
  createBooking: jest.fn(),
  rescheduleDisplacedBooking: jest.fn(),
  listBookings: jest.fn(),
  listAssignableClerks: jest.fn(),
  assignBookingClerk: jest.fn(),
  getBooking: jest.fn(),
  approveBooking: jest.fn(),
  rejectBooking: jest.fn(),
  updateBookingStatus: jest.fn(),
  cancelBooking: jest.fn(),
  listOccupancy: jest.fn(),
  listAvailableRooms: jest.fn(),
}));

jest.mock('../../src_ts/services/realtime', () => ({ publishBookingUpdate: jest.fn() }));

const user = { id: 1, role: 'EMPLOYEE' };
const booking = { id: 12, employeeId: 1, status: 'CONFIRMED' };
/**
 * Creates a minimal mocked Express response for controller unit tests.

 * @returns A mocked response object with the methods used by the controller.
 */
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() }) as any;

describe('bookingController service delegation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('normalizes booking IDs and passes creation data to the service', async () => {
    (bookingService.createBooking as jest.Mock).mockResolvedValue(booking);
    const res = response();
    await createBookingHandler({
      user, body: { purpose: 'Meet', startAt: 'start', endAt: 'end', roomIds: ['2'], amenityIds: ['3'], capacity: '8' },
    } as any, res, jest.fn());
    expect(bookingService.createBooking).toHaveBeenCalledWith({
      employeeId: 1, purpose: 'Meet', startAt: 'start', endAt: 'end', roomIds: [2], amenityIds: [3], capacity: 8,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(booking);
  });

  it('keeps reschedule request validation at the HTTP boundary', async () => {
    const next = jest.fn();
    await rescheduleBooking({ user, params: { id: '12' }, body: {} } as any, response(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Provide acceptSuggestion: true or a replacement startAt' }));
    expect(bookingService.rescheduleDisplacedBooking).not.toHaveBeenCalled();
  });

  it('delegates list filters and returns the service result', async () => {
    (bookingService.listBookings as jest.Mock).mockResolvedValue([booking]);
    const res = response();
    await listBookings({ user: { id: 1, role: 'MANAGER' }, query: { status: 'PENDING,CONFIRMED' } } as any, res, jest.fn());
    expect(bookingService.listBookings).toHaveBeenCalledWith('MANAGER', 1, 'PENDING,CONFIRMED');
    expect(res.json).toHaveBeenCalledWith([booking]);
  });

  it('delegates clerk assignment after parsing the route values', async () => {
    (bookingService.assignBookingClerk as jest.Mock).mockResolvedValue(booking);
    const res = response();
    await assignBookingClerk({ user, params: { id: '12' }, body: { clerkId: '5' } } as any, res, jest.fn());
    expect(bookingService.assignBookingClerk).toHaveBeenCalledWith(12, 5);
    expect(res.json).toHaveBeenCalledWith(booking);
  });

  it('delegates read, reject, preparation, and cancel operations', async () => {
    (bookingService.getBooking as jest.Mock).mockResolvedValue(booking);
    (bookingService.rejectBooking as jest.Mock).mockResolvedValue(booking);
    (bookingService.updateBookingStatus as jest.Mock).mockResolvedValue(booking);
    (bookingService.cancelBooking as jest.Mock).mockResolvedValue(booking);
    const res = response();
    await getBooking({ user, params: { id: '12' } } as any, res, jest.fn());
    await rejectBooking({ user, params: { id: '12' }, body: { reasonCode: 'OTHER', note: 'note' } } as any, res, jest.fn());
    await updateBookingStatus({ user, params: { id: '12' }, body: { status: 'PREPARING' } } as any, res, jest.fn());
    await cancelBooking({ user, params: { id: '12' } } as any, res, jest.fn());
    expect(bookingService.getBooking).toHaveBeenCalledWith(12, 1, 'EMPLOYEE');
    expect(bookingService.rejectBooking).toHaveBeenCalledWith(12, 1, 'OTHER', 'note');
    expect(bookingService.updateBookingStatus).toHaveBeenCalledWith(12, 'PREPARING', 1);
    expect(bookingService.cancelBooking).toHaveBeenCalledWith(12, 1, 'EMPLOYEE');
    expect(res.json).toHaveBeenCalledTimes(4);
  });

  it('publishes the approved booking update after the service succeeds', async () => {
    (bookingService.approveBooking as jest.Mock).mockResolvedValue(booking);
    const res = response();
    await approveBooking({ user, params: { id: '12' } } as any, res, jest.fn());
    expect(bookingService.approveBooking).toHaveBeenCalledWith(12, 1);
    expect(publishBookingUpdate).toHaveBeenCalledWith(booking.employeeId, {
      bookingId: booking.id,
      status: 'CONFIRMED',
    });
    expect(res.json).toHaveBeenCalledWith(booking);
  });

  it('delegates occupancy range and available clerk listing', async () => {
    (bookingService.listOccupancy as jest.Mock).mockResolvedValue([]);
    (bookingService.listAssignableClerks as jest.Mock).mockResolvedValue([]);
    const res = response();
    await listOccupancy({ query: { from: '2025-01-01', to: '2025-01-02' } } as any, res, jest.fn());
    await listAssignableClerks({} as any, res, jest.fn());
    expect(bookingService.listOccupancy).toHaveBeenCalledWith('2025-01-01', '2025-01-02');
    expect(bookingService.listAssignableClerks).toHaveBeenCalledWith();
  });
});
