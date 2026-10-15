import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { RoomCard } from '../src/components/RoomCard';
import { AppThemeProvider } from '../src/theme/AppTheme';
import type { Room } from '../src/types';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

jest.mock('expo-image', () => ({
  Image: () => null,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, color }: { name: string; color: string }) => {
    const { Text } = require('react-native');
    return <Text testID={`icon-${name}`} style={{ color }} />;
  },
}));

const room: Room = {
  id: 'room-1',
  name: 'Boardroom',
  description: '',
  capacity: 8,
  status: 'AVAILABLE',
  isActive: true,
  imageUrl: '',
  amenities: [],
  isFavorite: false,
};

describe('RoomCard favorite toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('dark');
  });

  it('keeps the favorite button visible against room photos in dark mode', async () => {
    const onToggleFavorite = jest.fn();
    const screen = render(
      <AppThemeProvider>
        <RoomCard room={room} onPress={jest.fn()} onToggleFavorite={onToggleFavorite} />
      </AppThemeProvider>,
    );

    const button = await screen.findByRole('button', { name: 'Add to favorites' });
    await waitFor(() => expect(screen.getByTestId('icon-heart-outline')).toBeTruthy());

    const buttonStyle = StyleSheet.flatten(button.props.style);
    expect(buttonStyle.backgroundColor).toBe('rgba(17,24,32,0.9)');
    expect(buttonStyle.borderColor).toBe('#526473');
    expect(screen.getByTestId('icon-heart-outline').props.style.color).toBe('#EDF3F8');

    fireEvent.press(button);
    expect(onToggleFavorite).toHaveBeenCalledWith(room);
  });

  it('uses a softened rose state for a saved favorite in dark mode', async () => {
    const screen = render(
      <AppThemeProvider>
        <RoomCard room={{ ...room, isFavorite: true }} onPress={jest.fn()} onToggleFavorite={jest.fn()} />
      </AppThemeProvider>,
    );

    const button = await screen.findByRole('button', { name: 'Remove from favorites' });
    const buttonStyle = StyleSheet.flatten(button.props.style);

    expect(buttonStyle.backgroundColor).toBe('#3B252E');
    expect(buttonStyle.borderColor).toBe('#9F5366');
    expect(screen.getByTestId('icon-heart').props.style.color).toBe('#FB7185');
  });
});
