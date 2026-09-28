import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ClerkTabNavigator } from '../src/navigation/ClerkTabNavigator';

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../src/tabs/DashboardTabScreen', () => ({
  DashboardTabScreen: () => require('react').createElement(require('react-native').Text, null, 'Clerk dashboard'),
}));
jest.mock('../src/tabs/QueueTabScreen', () => ({
  QueueTabScreen: () => require('react').createElement(require('react-native').Text, null, 'Clerk queue'),
}));
jest.mock('../src/tabs/RoomsTabScreen', () => ({
  RoomsTabScreen: () => require('react').createElement(require('react-native').Text, null, 'Clerk rooms'),
}));
jest.mock('../src/tabs/ClerkProfileTabScreen', () => ({
  ClerkProfileTabScreen: () => require('react').createElement(require('react-native').Text, null, 'Clerk profile'),
}));

describe('ClerkTabNavigator sign out action', () => {
  it('keeps Sign out visible and requires confirmation before signing out', async () => {
    const onSignOut = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    render(
      <NavigationContainer>
        <ClerkTabNavigator
          user={{
            id: 'clerk-1',
            name: 'Casey Clerk',
            email: 'clerk@example.com',
            department: 'Operations',
            contactNumber: '',
            role: 'CLERK',
          }}
          onSignOut={onSignOut}
        />
      </NavigationContainer>,
    );

    const signOutTab = screen.getByText('Sign out');
    expect(signOutTab).toBeTruthy();
    fireEvent.press(signOutTab);

    expect(alertSpy).toHaveBeenCalledWith(
      'Sign out',
      'Are you sure you want to sign out?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Sign out', style: 'destructive' }),
      ]),
    );
    expect(onSignOut).not.toHaveBeenCalled();

    const actions = alertSpy.mock.calls[0][2];
    await act(async () => {
      await actions?.[1]?.onPress?.();
    });
    expect(onSignOut).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
  });
});