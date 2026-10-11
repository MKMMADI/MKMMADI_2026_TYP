import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { MyBookingsTabScreen } from '../src/tabs/MyBookingsTabScreen';

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');

  return {
    __esModule: true,
    default: ({ mode, onChange }: { mode: string; onChange: (event: unknown, date: Date) => void }) =>
      React.createElement(
        TouchableOpacity,
        {
          accessibilityRole: 'button',
          onPress: () => {
            const year = new Date().getFullYear() + 1;
            const date = mode === 'date'
              ? new Date(year, 11, 15)
              : new Date(year, 11, 15, 13, 30);
            onChange({ type: 'set' }, date);
          },
        },
        React.createElement(Text, null, `Set ${mode}`),
      ),
    DateTimePickerAndroid: { open: jest.fn() },
  };
});

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    getBookings: jest.fn(),
    rescheduleBooking: jest.fn(),
    cancelBooking: jest.fn(),
  },
}));

const api = require('../src/api').default;
const bookingStart = new Date();
bookingStart.setDate(bookingStart.getDate() + 1);
bookingStart.setHours(9, 0, 0, 0);
const suggestedStart = new Date(bookingStart);
suggestedStart.setDate(suggestedStart.getDate() + 1);
const preferredStart = new Date();
preferredStart.setFullYear(preferredStart.getFullYear() + 1, 11, 15);
preferredStart.setHours(13, 30, 0, 0);
const displacedBooking = {
  id: 42,
  employeeId: 7,
  purpose: 'Team planning',
  startAt: bookingStart.toISOString(),
  endAt: new Date(bookingStart.getTime() + 60 * 60 * 1000).toISOString(),
  status: 'RESCHEDULE_REQUIRED',
  suggestedStartAt: suggestedStart.toISOString(),
  suggestedEndAt: new Date(suggestedStart.getTime() + 60 * 60 * 1000).toISOString(),
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

  it('pulls to refresh the bookings list', async () => {
    render(<MyBookingsTabScreen onOpenBookingDetail={jest.fn()} />);
    expect(await screen.findByText('Team planning')).toBeTruthy();
    api.getBookings.mockResolvedValue([{ ...displacedBooking, purpose: 'Updated booking' }]);

    const bookings = screen.getByTestId('bookings-scroll-view');
    await act(async () => {
      bookings.props.refreshControl.props.onRefresh();
    });

    expect(await screen.findByText('Updated booking')).toBeTruthy();
  });

  it('lets a booker choose a preferred future date and start time', async () => {
    api.rescheduleBooking.mockResolvedValue({
      ...displacedBooking,
      status: 'PENDING',
      startAt: preferredStart.toISOString(),
      endAt: new Date(preferredStart.getTime() + 60 * 60 * 1000).toISOString(),
      suggestedStartAt: null,
      suggestedEndAt: null,
    });

    render(<MyBookingsTabScreen onOpenBookingDetail={jest.fn()} />);

    fireEvent.press(await screen.findByText('Choose another time'));
    fireEvent.press(screen.getByLabelText('Replacement date'));
    fireEvent.press(screen.getByText('Set date'));
    fireEvent.press(screen.getByText('Done'));
    fireEvent.press(screen.getByLabelText('Replacement start time'));
    fireEvent.press(screen.getByText('Set time'));
    fireEvent.press(screen.getByText('Done'));
    fireEvent.press(screen.getByText('Save new time'));

    await waitFor(() => expect(api.rescheduleBooking).toHaveBeenCalledWith('42', {
      startAt: preferredStart.toISOString(),
    }));
  }, 15000);
});
