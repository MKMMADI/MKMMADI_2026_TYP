import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import api from '../src/api';
import { FLOATING_TAB_HEIGHT, FLOATING_TAB_MARGIN_BOTTOM } from '../src/navigation/floatingTabBar';
import { MessagesTabScreen } from '../src/tabs/MessagesTabScreen';
import { spacing } from '../src/theme/tokens';

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
    listeners: {} as Record<string, (payload?: any) => void>,
    auth: {},
    on(event: string, listener: (payload?: any) => void) {
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
    getSocketAccessToken: jest.fn().mockResolvedValue('access-token'),
    getConversationContacts: jest.fn(),
    getConversations: jest.fn(),
    getConversationMessages: jest.fn(),
    markConversationRead: jest.fn().mockResolvedValue({ markedRead: 0 }),
    startConversation: jest.fn(),
    sendConversationMessage: jest.fn(),
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
const clerk = {
  id: '30',
  name: 'Casey Clerk',
  email: 'casey@example.com',
  department: 'Operations',
  contactNumber: '',
  role: 'CLERK' as const,
};
const manager = { id: 10, name: 'Mina Manager', role: 'MANAGER' as const };
const conversation = {
  id: 4,
  participant: manager,
  createdAt: '2026-09-28T08:00:00.000Z',
  updatedAt: '2026-09-28T08:02:00.000Z',
  unreadCount: 1,
  lastMessage: null,
};
const welcomeMessage = {
  id: 31,
  conversationId: 4,
  senderId: 10,
  recipientId: 20,
  body: 'Welcome to the team',
  createdAt: '2026-09-28T08:02:00.000Z',
  readAt: null,
  sender: manager,
  recipient: { ...employee, id: 20 },
};
const missedMessage = { ...welcomeMessage, id: 32, body: 'Message sent while offline' };

describe('MessagesTabScreen', () => {
  let includeMissedMessage = false;

  beforeEach(() => {
    jest.clearAllMocks();
    includeMissedMessage = false;
    mockedApi.getConversationContacts.mockResolvedValue([manager] as never);
    mockedApi.getConversations.mockResolvedValue([conversation] as never);
    mockedApi.getConversationMessages.mockImplementation(async () => ({
      conversationId: 4,
      messages: includeMissedMessage ? [welcomeMessage, missedMessage] : [welcomeMessage],
      nextBeforeId: null,
    }) as never);
    mockedApi.sendConversationMessage.mockImplementation(async (_id, body) => ({
      ...welcomeMessage,
      id: 32,
      senderId: 20,
      recipientId: 10,
      body,
      sender: employee,
      recipient: manager,
    }) as never);
    mockedApi.startConversation.mockResolvedValue(conversation as never);
  });

  it('opens a contact in chat, sends, receives updates, and returns to the inbox', async () => {
    render(<MessagesTabScreen user={employee} />);

    expect(await screen.findByText('People you can message')).toBeTruthy();
    expect(screen.queryByLabelText('Write a message')).toBeNull();

    fireEvent.changeText(screen.getByLabelText('Filter permitted contacts'), 'Mina');
    fireEvent.press(screen.getByLabelText('Message Mina Manager'));
    await waitFor(() => expect(mockedApi.startConversation).toHaveBeenCalledWith(10));
    expect(await screen.findByText('Welcome to the team')).toBeTruthy();
    expect(screen.getByLabelText('Back to messages')).toBeTruthy();
    const composerStyle = screen.getByTestId('message-composer').props.style;
    expect(composerStyle[1].marginBottom).toBe(
      FLOATING_TAB_HEIGHT + FLOATING_TAB_MARGIN_BOTTOM + spacing.sm,
    );

    fireEvent.changeText(screen.getByLabelText('Write a message'), 'I have received it');
    fireEvent.press(screen.getByLabelText('Send message'));
    await waitFor(() => expect(mockedApi.sendConversationMessage).toHaveBeenCalledWith(4, 'I have received it'));
    expect(await screen.findByText('I have received it')).toBeTruthy();

    const socketIo = require('socket.io-client').io as jest.Mock;
    const socket = socketIo.mock.results[0].value;
    act(() => {
      socket.listeners['message:new']({
        conversationId: 4,
        message: { ...welcomeMessage, id: 33, body: 'Live update' },
      });
    });
    expect(await screen.findByText('Live update')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Back to messages'));
    expect(screen.getByText('People you can message')).toBeTruthy();
    expect(screen.queryByLabelText('Write a message')).toBeNull();
  });

  it('shows permitted employee contacts and opens a chat for clerk users', async () => {
    const employeeConversation = { ...conversation, participant: employee };
    mockedApi.getConversationContacts.mockResolvedValue([employee] as never);
    mockedApi.getConversations.mockResolvedValue([employeeConversation] as never);
    mockedApi.startConversation.mockResolvedValue(employeeConversation as never);

    render(<MessagesTabScreen user={clerk} />);

    expect(await screen.findByLabelText('Message Evan Employee')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Message Evan Employee'));
    await waitFor(() => expect(mockedApi.startConversation).toHaveBeenCalledWith(20));
    expect(await screen.findByLabelText('Back to messages')).toBeTruthy();
    expect(screen.getByText('Evan Employee')).toBeTruthy();
  });

  it('opens a conversation requested from the clerk queue', async () => {
    const handled = jest.fn();

    render(
      <MessagesTabScreen
        user={clerk}
        openConversationId={4}
        onConversationRequestHandled={handled}
      />,
    );

    expect(await screen.findByLabelText('Back to messages')).toBeTruthy();
    expect(await screen.findByText('Welcome to the team')).toBeTruthy();
    await waitFor(() => expect(handled).toHaveBeenCalledTimes(1));
    expect(mockedApi.getConversationMessages).toHaveBeenCalledWith(4);
  });

  it('reloads missed history after reconnect and deduplicates replayed messages', async () => {
    render(<MessagesTabScreen user={employee} />);

    expect(await screen.findByLabelText('Open conversation with Mina Manager')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Open conversation with Mina Manager'));
    expect(await screen.findByText('Welcome to the team')).toBeTruthy();
    const socketIo = require('socket.io-client').io as jest.Mock;
    const socket = socketIo.mock.results[0].value;

    includeMissedMessage = true;
    act(() => {
      socket.listeners.disconnect?.();
      socket.connect();
    });
    expect(await screen.findByText('Message sent while offline')).toBeTruthy();
    expect(screen.getAllByText(/Welcome to the team|Message sent while offline/).map(({ props }) => props.children)).toEqual([
      'Welcome to the team',
      'Message sent while offline',
    ]);

    act(() => {
      socket.listeners['message:new']({ conversationId: 4, message: missedMessage });
      socket.listeners['message:new']({ conversationId: 4, message: missedMessage });
    });
    await waitFor(() => expect(screen.getAllByText('Message sent while offline')).toHaveLength(1));
  });
});