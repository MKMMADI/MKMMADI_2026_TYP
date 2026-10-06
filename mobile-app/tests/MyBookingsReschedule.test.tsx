import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { MyBookingsTabScreen } from '../src/tabs/MyBookingsTabScreen';

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    getBookings: jest.fn(),
    rescheduleBooking: jest.fn(),
    cancelBooking: jest.fn(),
  },
}));

const api = require('../src/api').default;
const displacedBooking = {
  id: 42,
  employeeId: 7,
  purpose: 'Team planning',
  startAt: '2026-10-05T09:00:00.000Z',
  endAt: '2026-10-05T10:00:00.000Z',
  status: 'RESCHEDULE_REQUIRED',
  suggestedStartAt: '2026-10-06T09:00:00.000Z',
  suggestedEndAt: '2026-10-06T10:00:00.000Z',
  createdAt: '2026-10-04T08:00:00.000Z',
  rooms: [{ id: 1, roomId: 1, room: { id: 1, name: 'Boardroom', capacity: 10 } }],
  amenities: [],
};

describe('MyBookingsTabScreen displaced booking recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getBookings.mockResolvedValue([displacedBooking]);
  });

  afterEach(() => cleanup());

  it('lets a booker accept the proposed replacement time', async () => {
    api.rescheduleBooking.mockResolvedValue({
      ...displacedBooking,
      status: 'PENDING',
      startAt: displacedBooking.suggestedStartAt,
      endAt: displacedBooking.suggestedEndAt,
      suggestedStartAt: null,
      suggestedEndAt: null,
    });

    render(<MyBookingsTabScreen onOpenBookingDetail={jest.fn()} />);

    fireEvent.press(await screen.findByLabelText('Accept suggested time for Team planning'));

    await waitFor(() => expect(api.rescheduleBooking).toHaveBeenCalledWith('42', { acceptSuggestion: true }));
    expect(await screen.findByText('Pending Approval')).toBeTruthy();
  }, 15000);

  it('lets a booker choose a preferred future date and start time', async () => {
    api.rescheduleBooking.mockResolvedValue({
      ...displacedBooking,
      status: 'PENDING',
      startAt: '2026-12-15T11:30:00.000Z',
      endAt: '2026-12-15T12:30:00.000Z',
      suggestedStartAt: null,
      suggestedEndAt: null,
    });

    render(<MyBookingsTabScreen onOpenBookingDetail={jest.fn()} />);

    fireEvent.press(await screen.findByText('Choose another time'));
    fireEvent.changeText(screen.getByLabelText('Replacement date'), '2026-12-15');
    fireEvent.changeText(screen.getByLabelText('Replacement start time'), '13:30');
    fireEvent.press(screen.getByText('Save new time'));

    await waitFor(() => expect(api.rescheduleBooking).toHaveBeenCalledWith('42', {
      startAt: new Date('2026-12-15T13:30:00').toISOString(),
    }));
  }, 15000);
});
