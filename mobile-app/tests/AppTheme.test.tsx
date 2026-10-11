import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AppThemeProvider, useAppTheme } from '../src/theme/AppTheme';
import { ClerkProfileTabScreen } from '../src/tabs/ClerkProfileTabScreen';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

function ThemePreview() {
  const { mode, colors, toggleTheme } = useAppTheme();
  return (
    <View style={{ backgroundColor: colors.canvas }}>
      <Text>{mode}</Text>
      <Text>{colors.canvas}</Text>
      <Text>{colors.ink}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Toggle theme" onPress={() => void toggleTheme()}>
        <Text>Toggle</Text>
      </Pressable>
    </View>
  );
}

describe('AppThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
    jest.mocked(SecureStore.setItemAsync).mockResolvedValue(undefined);
  });

  it('loads, applies, and persists the saved dark preference', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('dark');
    const screen = render(<AppThemeProvider><ThemePreview /></AppThemeProvider>);

    expect(await screen.findByText('dark')).toBeTruthy();
    expect(screen.getByText('#111820')).toBeTruthy();
    expect(screen.getByText('#EDF3F8')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(await screen.findByText('light')).toBeTruthy();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('bookspace-theme', 'light');
  });

  it('defaults to dark mode and persists a light-mode change', async () => {
    const screen = render(<AppThemeProvider><ThemePreview /></AppThemeProvider>);

    await waitFor(() => expect(screen.getByText('dark')).toBeTruthy());
    expect(screen.getByText('#111820')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Toggle theme' }));

    await waitFor(() => expect(screen.getByText('light')).toBeTruthy());
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('bookspace-theme', 'light');
  });

  it('uses a saved light-mode preference instead of the dark default', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('light');
    const screen = render(<AppThemeProvider><ThemePreview /></AppThemeProvider>);

    expect(await screen.findByText('light')).toBeTruthy();
    expect(screen.getByText('#FFFFFF')).toBeTruthy();
  });

  it('exposes the saved preference as an accessible switch in the clerk profile', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('light');
    const screen = render(
      <AppThemeProvider>
        <ClerkProfileTabScreen
          user={{
            id: 'clerk-1',
            name: 'Casey Clerk',
            email: 'clerk@example.com',
            department: 'Operations',
            contactNumber: '',
            role: 'CLERK',
          }}
          onSignOut={jest.fn()}
        />
      </AppThemeProvider>,
    );

    const themeSwitch = await screen.findByRole('switch', { name: 'Dark mode' });
    fireEvent(themeSwitch, 'valueChange', true);
    await waitFor(() => expect(SecureStore.setItemAsync).toHaveBeenCalledWith('bookspace-theme', 'dark'));
    await waitFor(() => expect(screen.getByTestId('clerk-profile-root').props.style.backgroundColor).toBe('#111820'));
  });
});
