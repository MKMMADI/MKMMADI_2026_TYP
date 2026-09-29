import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ClerkTabNavigator } from '../src/navigation/ClerkTabNavigator';

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../src/tabs/MessagesTabScreen', () => ({
  MessagesTabScreen: ({ openConversationId }: { openConversationId?: number }) =>
    require('react').createElement(require('react-native').Text, null, `Clerk messages ${openConversationId ?? 'inbox'}`),
}));

jest.mock('../src/tabs/DashboardTabScreen', () => ({
  DashboardTabScreen: () => require('react').createElement(require('react-native').Text, null, 'Clerk dashboard'),
}));
jest.mock('../src/tabs/QueueTabScreen', () => ({
  QueueTabScreen: ({ onOpenConversation }: { onOpenConversation?: (conversationId: number) => void }) =>
    require('react').createElement(
      require('react-native').TouchableOpacity,
      { onPress: () => onOpenConversation?.(91) },
      require('react').createElement(require('react-native').Text, null, 'Message booking owner'),
    ),
}));
jest.mock('../src/tabs/RoomsTabScreen', () => ({
  RoomsTabScreen: () => require('react').createElement(require('react-native').Text, null, 'Clerk rooms'),
}));
jest.mock('../src/tabs/ClerkProfileTabScreen', () => ({
  ClerkProfileTabScreen: () => require('react').createElement(require('react-native').Text, null, 'Clerk profile'),
}));

describe('ClerkTabNavigator sign out action', () => {
  it('removes Sign out from the tab bar', () => {
    const onSignOut = jest.fn();

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

    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.queryByText('Sign out')).toBeNull();
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it('opens the booking conversation from Queue in Messages', async () => {
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
          onSignOut={jest.fn()}
        />
      </NavigationContainer>,
    );

    fireEvent.press(screen.getByText('Queue'));
    fireEvent.press(await screen.findByText('Message booking owner'));
    expect(await screen.findByText('Clerk messages 91')).toBeTruthy();
  });

  it('keeps confirmed sign out visible in the Profile header', async () => {
    const { ClerkProfileTabScreen: RealClerkProfileTabScreen } = jest.requireActual(
      '../src/tabs/ClerkProfileTabScreen',
    ) as typeof import('../src/tabs/ClerkProfileTabScreen');
    const onSignOut = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    render(
      <RealClerkProfileTabScreen
        user={{
          id: 'clerk-1',
          name: 'Casey Clerk',
          email: 'clerk@example.com',
          department: 'Operations',
          contactNumber: '',
          role: 'CLERK',
        }}
        onSignOut={onSignOut}
      />,
    );

    expect(screen.getByTestId('profile-header')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
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