import { fireEvent, render, screen } from '@testing-library/react-native';
import { BookingConfirmationScreen } from '../src/screens/BookingConfirmationScreen';
import { BookingDetailScreen } from '../src/screens/BookingDetailScreen';
import { BookingHistoryScreen } from '../src/screens/BookingHistoryScreen';
import { Booking, Room } from '../src/types';

jest.mock('../src/api', () => ({
  __esModule: true,
  default: { cancelBooking: jest.fn() },
}));

const rooms: Room[] = [
  {
    id: 'room-1',
    name: 'Boardroom',
    description: 'Large room',
    capacity: 10,
    status: 'AVAILABLE',
    isActive: true,
    imageUrl: '',
    amenities: [{ id: 'screen', name: 'Display', icon: 'tv-outline' }],
  },
  {
    id: 'room-2',
    name: 'Huddle room',
    description: 'Small room',
    capacity: 6,
    status: 'AVAILABLE',
    isActive: true,
    imageUrl: '',
    amenities: [],
  },
];

const booking: Booking = {
  id: 'booking-1',
  employeeId: 'employee-1',
  startAt: '2026-10-01T09:00:00.000Z',
  endAt: '2026-10-01T10:00:00.000Z',
  purpose: 'Department planning',
  status: 'PENDING',
  createdAt: '2026-09-27T08:00:00.000Z',
  rooms: rooms.map((room, index) => ({
    id: `booking-room-${index + 1}`,
    roomId: room.id,
    room,
    roomStatus: 'BOOKED',
  })),
  requestedAmenities: [{ id: 'screen', name: 'Display', icon: 'tv-outline' }],
};

describe('Multi-room booking result screens', () => {
  it('lists every room and the pending status in confirmation', () => {
    render(<BookingConfirmationScreen booking={booking} onBackHome={jest.fn()} />);

    expect(screen.getByText('Pending approval')).toBeTruthy();
    expect(screen.getByText('Your booking request was sent')).toBeTruthy();
    expect(screen.getAllByText('Boardroom').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Huddle room').length).toBeGreaterThan(0);
  });

  it('lists every room in history and books the full selection again', () => {
    const onBookAgain = jest.fn();
    render(
      <BookingHistoryScreen
        bookings={[booking]}
        onBack={jest.fn()}
        onBookAgain={onBookAgain}
      />,
    );

    expect(screen.getByText('Boardroom · 10 seats')).toBeTruthy();
    expect(screen.getByText('Huddle room · 6 seats')).toBeTruthy();
    fireEvent.press(screen.getByText('Book again'));
    expect(onBookAgain).toHaveBeenCalledWith(rooms);
  });

  it('shows each room status in details and books all rooms again', () => {
    const onBookAgain = jest.fn();
    render(
      <BookingDetailScreen
        booking={booking}
        onBack={jest.fn()}
        onBookAgain={onBookAgain}
      />,
    );

    expect(screen.getAllByText('Boardroom').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Huddle room').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BOOKED')).toHaveLength(2);
    fireEvent.press(screen.getByText('Book these rooms again'));
    expect(onBookAgain).toHaveBeenCalledWith(rooms);
  });
});
