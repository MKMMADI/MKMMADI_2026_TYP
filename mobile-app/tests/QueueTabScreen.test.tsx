import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import api from '../src/api';
import { QueueTabScreen } from '../src/tabs/QueueTabScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(callback, [callback]),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    getBookings: jest.fn(),
    updateBookingStatus: jest.fn(),
    startConversation: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const endAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

function makeBooking(rooms: unknown[], employee?: { id: number; name: string }) {
  return {
    id: 7,
    employeeId: employee?.id,
    employee,
    purpose: 'Team planning',
    status: 'CONFIRMED',
    startAt,
    endAt,
    rooms,
    amenities: [],
  };
}

function renderQueue(onOpenConversation?: (conversationId: number) => void) {
  return render(<QueueTabScreen onOpenConversation={onOpenConversation} />);
}

describe('QueueTabScreen room checklist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows actual amenities and distinct checklist items for every booked room', async () => {
    mockedApi.getBookings.mockResolvedValue([
      makeBooking([
        {
          id: 70,
          roomId: 1,
          room: {
            id: 1,
            name: 'Boardroom',
            amenities: [{ amenity: { id: 1, name: 'Projector' } }],
          },
        },
        {
          id: 71,
          roomId: 2,
          room: {
            id: 2,
            name: 'Huddle room',
            amenities: [{ amenity: { id: 2, name: 'Coffee station' } }],
          },
        },
      ]),
    ] as never);

    renderQueue();

    await waitFor(() => expect(screen.getByText('Boardroom, Huddle room')).toBeTruthy());
    expect(screen.getByText('Boardroom amenities')).toBeTruthy();
    expect(screen.getByText('Projector')).toBeTruthy();
    expect(screen.getByText('Huddle room amenities')).toBeTruthy();
    expect(screen.getByText('Coffee station')).toBeTruthy();

    fireEvent.press(screen.getByText('Prep checklist'));
    expect(screen.getByText('Boardroom checklist')).toBeTruthy();
    expect(screen.getByText('Projector remote + HDMI cable')).toBeTruthy();
    expect(screen.getByText('Huddle room checklist')).toBeTruthy();
    expect(screen.getByText('Coffee station restocked')).toBeTruthy();
  });

  it('distinguishes rooms with no amenities from missing room amenity data', async () => {
    mockedApi.getBookings.mockResolvedValue([
      makeBooking([
        {
          id: 70,
          roomId: 1,
          room: { id: 1, name: 'Empty room', amenities: [] },
        },
        {
          id: 71,
          roomId: 2,
          room: { id: 2, name: 'Unknown room' },
        },
      ]),
    ] as never);

    renderQueue();

    await waitFor(() => expect(screen.getByText('No amenities assigned to this room.')).toBeTruthy());
    expect(screen.getByText('Room amenity data unavailable. Refresh the queue to retry.')).toBeTruthy();
    fireEvent.press(screen.getByText('Prep checklist'));
    expect(screen.getByText('Unknown room checklist')).toBeTruthy();
    expect(screen.getByText('Amenity-specific checks unavailable until room data is refreshed.')).toBeTruthy();
    expect(screen.queryByText('Projector remote + HDMI cable')).toBeNull();
  });

  it('shows loading and empty states, and retries a failed queue request', async () => {
    let resolveBookings!: (value: unknown[]) => void;
    mockedApi.getBookings.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveBookings = resolve;
      }) as never,
    );

    renderQueue();
    expect(screen.getByText('Loading queue…')).toBeTruthy();
    resolveBookings([]);
    await waitFor(() => expect(screen.getByText('No bookings in this view')).toBeTruthy());

    mockedApi.getBookings.mockRejectedValueOnce(new Error('Queue unavailable'));
    fireEvent.press(screen.getByLabelText('Refresh queue'));
    await waitFor(() => expect(screen.getByText('Queue unavailable')).toBeTruthy());

    mockedApi.getBookings.mockResolvedValueOnce([] as never);
    fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByText('No bookings in this view')).toBeTruthy());
  });

  it('starts a conversation with the owner of a queued booking', async () => {
    mockedApi.getBookings.mockResolvedValue([
      makeBooking([], { id: 42, name: 'Thandi Mokoena' }),
    ] as never);
    mockedApi.startConversation.mockResolvedValue({ id: 91 } as never);
    const onOpenConversation = jest.fn();

    renderQueue(onOpenConversation);

    const messageButton = await screen.findByLabelText('Message booking owner Thandi Mokoena');
    fireEvent.press(messageButton);

    await waitFor(() => expect(mockedApi.startConversation).toHaveBeenCalledWith(42));
    expect(onOpenConversation).toHaveBeenCalledWith(91);
  });
});