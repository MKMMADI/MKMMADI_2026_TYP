import { Text, TouchableOpacity } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { HomeTabScreen } from '../src/tabs/HomeTabScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(callback, [callback]),
}));

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    getRooms: jest.fn(),
    getOccupancy: jest.fn(),
    toggleFavorite: jest.fn(),
  },
}));

jest.mock('../src/lib/preferences', () => ({
  applyFavoriteFlags: (rooms: unknown[]) => rooms,
  getFavoriteRoomIds: jest.fn().mockResolvedValue([]),
}));

jest.mock('../src/components/RoomCard', () => ({
  RoomCard: ({ room, onPress }: { room: { id: string; name: string }; onPress: (room: unknown) => void }) => (
    (() => {
      const React = require('react');
      const { Text, TouchableOpacity } = require('react-native');
      return React.createElement(
        TouchableOpacity,
        { accessibilityLabel: `Room details ${room.name}`, onPress: () => onPress(room) },
        React.createElement(Text, null, room.name),
      );
    })()
  ),
}));

const api = require('../src/api').default;

const availableRoom = {
  id: 'room-1',
  name: 'Boardroom',
  description: 'Large meeting room',
  capacity: 10,
  status: 'AVAILABLE',
  isActive: true,
  imageUrl: '',
  amenities: [],
};

const secondRoom = {
  ...availableRoom,
  id: 'room-2',
  name: 'Huddle room',
  capacity: 6,
};

const unavailableRoom = {
  ...availableRoom,
  id: 'room-3',
  name: 'Maintenance room',
  status: 'MAINTENANCE',
};

describe('HomeTabScreen room selection', () => {
  beforeEach(() => {
    cleanup();
    jest.clearAllMocks();
    api.getRooms.mockResolvedValue([availableRoom, secondRoom, unavailableRoom]);
    api.getOccupancy.mockResolvedValue([]);
  });

  it('automatically refreshes room availability while the home tab is active', async () => {
    jest.useFakeTimers();
    try {
      render(<HomeTabScreen onOpenRoom={jest.fn()} onBookRooms={jest.fn()} />);
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(api.getRooms).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(30_000);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(api.getRooms).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('passes the selected rooms to Continue', async () => {
    const onBookRooms = jest.fn();
    const onOpenRoom = jest.fn();
    render(<HomeTabScreen onOpenRoom={onOpenRoom} onBookRooms={onBookRooms} />);

    await waitFor(() => expect(screen.getByLabelText('Select room Boardroom')).toBeTruthy());
    expect(screen.queryByText('Continue')).toBeNull();

    const unavailable = screen.getByLabelText('Unavailable room Maintenance room');
    expect(unavailable.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(unavailable);
    expect(screen.queryByText('1 room(s) selected')).toBeNull();

    fireEvent.press(screen.getByLabelText('Select room Boardroom'));
    await waitFor(() => expect(screen.getByText('1 room(s) selected')).toBeTruthy());
    expect(screen.getByText('10 total seats')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Room details Boardroom'));
    expect(onOpenRoom).toHaveBeenCalledWith(expect.objectContaining({
      id: availableRoom.id,
      name: availableRoom.name,
      capacity: availableRoom.capacity,
    }));
    expect(screen.getByLabelText('Deselect room Boardroom')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Select room Huddle room'));
    await waitFor(() => expect(screen.getByText('2 room(s) selected')).toBeTruthy());
    expect(screen.getByText('16 total seats')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Deselect room Boardroom'));
    await waitFor(() => expect(screen.getByText('1 room(s) selected')).toBeTruthy());
    expect(screen.getByText('6 total seats')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Select room Boardroom'));
    await waitFor(() => expect(screen.getByText('2 room(s) selected')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('Continue')).toBeTruthy());
    fireEvent.press(screen.getByText('Continue'));

    expect(onBookRooms).toHaveBeenCalledWith([availableRoom, secondRoom]);
  });

  it('allows entering a minimum capacity and keeps the stepper controls working', async () => {
    render(<HomeTabScreen onOpenRoom={jest.fn()} onBookRooms={jest.fn()} />);

    await waitFor(() => expect(screen.getByLabelText('Select room Boardroom')).toBeTruthy());
    fireEvent.press(screen.getByText('Find a conference room'));

    const capacityInput = await screen.findByLabelText('Minimum capacity');
    fireEvent.changeText(capacityInput, '7');
    expect(capacityInput.props.value).toBe('7');

    fireEvent.press(screen.getByLabelText('Increase minimum capacity'));
    expect(capacityInput.props.value).toBe('8');
    fireEvent.press(screen.getByLabelText('Decrease minimum capacity'));
    expect(capacityInput.props.value).toBe('7');
    fireEvent.press(screen.getByLabelText('Increase minimum capacity'));
    expect(capacityInput.props.value).toBe('8');

    fireEvent.press(screen.getByText('Show rooms'));

    await waitFor(() => expect(screen.getByText('8+ people')).toBeTruthy());
    expect(screen.getByLabelText('Room details Boardroom')).toBeTruthy();
    expect(screen.queryByLabelText('Room details Huddle room')).toBeNull();
  });

  it('normalizes an empty capacity entry to the minimum of one on apply', async () => {
    render(<HomeTabScreen onOpenRoom={jest.fn()} onBookRooms={jest.fn()} />);

    fireEvent.press(screen.getByText('Find a conference room'));
    const capacityInput = await screen.findByLabelText('Minimum capacity');
    fireEvent.changeText(capacityInput, '');
    fireEvent.press(screen.getByText('Show rooms'));

    await waitFor(() => expect(screen.getByText('Find a conference room')).toBeTruthy());
    expect(screen.getByLabelText('Room details Huddle room')).toBeTruthy();
    fireEvent.press(screen.getByText('Find a conference room'));
    expect((await screen.findByLabelText('Minimum capacity')).props.value).toBe('1');
  });
});
