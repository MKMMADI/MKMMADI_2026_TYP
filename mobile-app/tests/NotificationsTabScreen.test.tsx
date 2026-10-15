import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import api from '../src/api';
import { NotificationsTabScreen } from '../src/tabs/NotificationsTabScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(callback, [callback]),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../src/config', () => ({ API_SOCKET_URL: 'http://localhost:4000' }));
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    listeners: {} as Record<string, (payload?: unknown) => void>,
    auth: {},
    on(event: string, listener: (payload?: unknown) => void) {
      this.listeners[event] = listener;
      return this;
    },
    connect() {
      this.listeners.connect?.();
    },
    disconnect: jest.fn(),
  })),
}));
jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    getBookings: jest.fn(),
    getConversations: jest.fn(),
    getSocketAccessToken: jest.fn().mockResolvedValue('access-token'),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;
const employee = {
  id: '20',
  name: 'Evan Employee',
  email: 'evan@example.com',
  department: 'Operations',
  contactNumber: '',
  role: 'EMPLOYEE' as const,
};

const confirmedBooking = {
  id: 31,
  employeeId: 20,
  purpose: 'Quarterly planning',
  status: 'CONFIRMED',
  startAt: '2026-10-08T09:00:00.000Z',
  updatedAt: '2026-10-06T08:00:00.000Z',
  rooms: [{ room: { name: 'Boardroom' } }],
};
const displacedBooking = {
  ...confirmedBooking,
  id: 32,
  purpose: 'Team workshop',
  status: 'RESCHEDULE_REQUIRED',
  suggestedStartAt: '2026-10-09T09:00:00.000Z',
  suggestedEndAt: '2026-10-09T10:00:00.000Z',
};
const unreadConversation = {
  id: 9,
  participant: { id: 11, name: 'Mina Manager', role: 'MANAGER' as const },
  createdAt: '2026-10-06T08:00:00.000Z',
  updatedAt: '2026-10-06T09:00:00.000Z',
  unreadCount: 1,
  lastMessage: {
    id: 44,
    conversationId: 9,
    senderId: 11,
    recipientId: 20,
    body: 'Please confirm the room setup',
    createdAt: '2026-10-06T09:00:00.000Z',
    readAt: null,
    sender: { id: 11, name: 'Mina Manager', role: 'MANAGER' as const },
    recipient: employee,
  },
};

describe('NotificationsTabScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getBookings.mockResolvedValue([confirmedBooking, displacedBooking] as never);
    mockedApi.getConversations.mockResolvedValue([unreadConversation] as never);
  });

  it('shows booking confirmations, priority schedule changes, and unread messages', async () => {
    const onCountChange = jest.fn();
    render(<NotificationsTabScreen user={employee} onCountChange={onCountChange} />);

    expect(await screen.findByText('Booking confirmed')).toBeTruthy();
    expect(screen.getByText(/Quarterly planning/)).toBeTruthy();
    expect(screen.getByText('Schedule changed')).toBeTruthy();
    expect(screen.getByText(/Team workshop/)).toBeTruthy();
    expect(screen.getByText('Please confirm the room setup')).toBeTruthy();
    expect(screen.getByText(/Mina Manager/)).toBeTruthy();
    expect(onCountChange).toHaveBeenCalledWith(3);
  });

  it('refreshes notifications when the manager requests a refresh', async () => {
    render(<NotificationsTabScreen user={employee} />);
    await screen.findByText('Booking confirmed');
    mockedApi.getBookings.mockResolvedValue([{ ...confirmedBooking, purpose: 'Updated booking' }] as never);

    fireEvent.press(screen.getByRole('button', { name: 'Refresh notifications' }));

    expect(await screen.findByText(/Updated booking/)).toBeTruthy();
    await waitFor(() => expect(mockedApi.getBookings).toHaveBeenCalledTimes(2));
  });

  it('supports pull-to-refresh on the notification list', async () => {
    render(<NotificationsTabScreen user={employee} />);
    await screen.findByText('Booking confirmed');
    mockedApi.getBookings.mockResolvedValue([{ ...confirmedBooking, purpose: 'Pulled booking' }] as never);

    const scrollView = screen.getByTestId('notifications-scroll-view');
    expect(scrollView.props.refreshControl).toBeTruthy();
    await act(async () => {
      scrollView.props.refreshControl.props.onRefresh();
    });

    expect(await screen.findByText(/Pulled booking/)).toBeTruthy();
  });

  it('refreshes the feed when a realtime booking change arrives', async () => {
    render(<NotificationsTabScreen user={employee} />);
    await screen.findByText('Booking confirmed');
    mockedApi.getBookings.mockResolvedValue([{ ...confirmedBooking, purpose: 'Realtime booking' }] as never);

    const socketIo = require('socket.io-client').io as jest.Mock;
    const socket = socketIo.mock.results[0].value;
    await act(async () => {
      socket.listeners['booking:updated']?.({ bookingId: 31, status: 'CONFIRMED' });
    });

    expect(await screen.findByText(/Realtime booking/)).toBeTruthy();
  });

  it('refreshes unread message previews after a realtime message arrives', async () => {
    mockedApi.getConversations.mockResolvedValueOnce([unreadConversation] as never);
    render(<NotificationsTabScreen user={employee} />);
    expect(await screen.findByText('Please confirm the room setup')).toBeTruthy();
    mockedApi.getConversations.mockResolvedValue([{
      ...unreadConversation,
      lastMessage: { ...unreadConversation.lastMessage!, body: 'The room is ready' },
    }] as never);

    const socketIo = require('socket.io-client').io as jest.Mock;
    const socket = socketIo.mock.results[0].value;
    await act(async () => {
      socket.listeners['message:new']?.({ conversationId: 9 });
    });

    expect(await screen.findByText('The room is ready')).toBeTruthy();
  });

  it('does not show another employee’s booking to a clerk', async () => {
    mockedApi.getBookings.mockResolvedValue([
      { ...confirmedBooking, employeeId: 21 },
      { ...displacedBooking, employeeId: 21 },
    ] as never);
    mockedApi.getConversations.mockResolvedValue([] as never);
    const clerk = { ...employee, id: '22', role: 'CLERK' as const };
    render(<NotificationsTabScreen user={clerk} />);

    expect(await screen.findByText('You’re all caught up')).toBeTruthy();
    expect(screen.queryByText(/Quarterly planning/)).toBeNull();
    expect(screen.queryByText(/Team workshop/)).toBeNull();
  });

  it('shows API errors and recovers after a successful refresh', async () => {
    mockedApi.getBookings.mockRejectedValueOnce(new Error('Bookings are unavailable'));
    render(<NotificationsTabScreen user={employee} />);

    expect(await screen.findByText(/Bookings: Bookings are unavailable/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Refresh notifications' }));

    expect(await screen.findByText('Booking confirmed')).toBeTruthy();
    expect(screen.queryByText(/Bookings: Bookings are unavailable/)).toBeNull();
  });
});
