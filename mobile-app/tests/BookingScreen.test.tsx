import { addDays, format, startOfDay } from 'date-fns';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { BookingScreen } from '../src/screens/BookingScreen';
import { Room } from '../src/types';

const makeRoom = (overrides: Partial<Room>): Room => ({
  id: 'room-1',
  name: 'Boardroom',
  description: '',
  capacity: 10,
  status: 'AVAILABLE',
  isActive: true,
  imageUrl: '',
  amenities: [],
  ...overrides,
});

const rooms = [
  makeRoom({
    id: 'room-1',
    name: 'Boardroom',
    capacity: 10,
    amenities: [
      { id: 'shared', name: 'Shared microphone', icon: 'mic-outline' },
      { id: 'only-first', name: 'Boardroom camera', icon: 'videocam-outline' },
    ],
  }),
  makeRoom({
    id: 'room-2',
    name: 'Huddle room',
    capacity: 6,
    amenities: [{ id: 'shared', name: 'Shared microphone', icon: 'mic-outline' }],
  }),
];

describe('BookingScreen multi-room review', () => {
  it('blocks submission and explains when no rooms were provided', () => {
    const onConfirm = jest.fn();
    render(<BookingScreen rooms={[]} onBack={jest.fn()} onConfirm={onConfirm} />);

    expect(screen.getByText('No rooms selected. Go back and choose at least one room.')).toBeTruthy();
    fireEvent.press(screen.getByText('Confirm booking'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('removes an individual room and only offers amenities shared by all remaining rooms', async () => {
    render(<BookingScreen rooms={rooms} onBack={jest.fn()} onConfirm={jest.fn()} />);

    expect(screen.getByText('16 combined seats')).toBeTruthy();
    expect(screen.getByText('Shared microphone')).toBeTruthy();
    expect(screen.queryByText('Boardroom camera')).toBeNull();

    fireEvent.press(screen.getByLabelText('Remove Huddle room'));

    await waitFor(() => expect(screen.getByText('10 combined seats')).toBeTruthy());
    expect(screen.queryByText('Huddle room')).toBeNull();
    expect(screen.getByText('Boardroom camera')).toBeTruthy();
    expect(screen.queryByLabelText('Remove Boardroom')).toBeNull();
  });

  it('shows the availability error and allows the employee to retry', async () => {
    const onConfirm = jest
      .fn()
      .mockRejectedValueOnce(new Error('Room Huddle room is not available during the selected time'))
      .mockResolvedValueOnce(undefined);
    render(<BookingScreen rooms={rooms} onBack={jest.fn()} onConfirm={onConfirm} />);

    fireEvent.press(screen.getByLabelText('Choose booking date'));
    const tomorrowLabel = format(addDays(startOfDay(new Date()), 1), 'EEEE d MMMM yyyy');
    fireEvent.press(screen.getByLabelText(tomorrowLabel));
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Sprint planning with product'), 'Planning');
    fireEvent.press(screen.getByText('Confirm booking'));

    const errorText = 'Room Huddle room is not available during the selected time';
    await waitFor(() => expect(screen.getByText(errorText)).toBeTruthy());

    fireEvent.press(screen.getByText('Confirm booking'));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(2));
    expect(onConfirm).toHaveBeenLastCalledWith(expect.objectContaining({
      roomIds: ['room-1', 'room-2'],
      capacity: 1,
    }));
    expect(screen.queryByText(errorText)).toBeNull();
  });
});
