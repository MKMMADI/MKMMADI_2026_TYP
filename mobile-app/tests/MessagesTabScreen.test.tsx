import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import api from '../src/api';
import { MessagesTabScreen } from '../src/tabs/MessagesTabScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(callback, [callback]),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
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

describe('MessagesTabScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getConversationContacts.mockResolvedValue([manager] as never);
    mockedApi.getConversations.mockResolvedValue([conversation] as never);
    mockedApi.getConversationMessages.mockResolvedValue({
      conversationId: 4,
      messages: [welcomeMessage],
      nextBeforeId: null,
    } as never);
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

  it('shows messages, starts a permitted conversation, sends, and receives realtime updates', async () => {
    render(<MessagesTabScreen user={employee} />);

    expect(await screen.findByText('Welcome to the team')).toBeTruthy();
    expect(screen.getAllByText('Mina Manager').length).toBeGreaterThan(0);

    fireEvent.changeText(screen.getByLabelText('Search permitted contacts'), 'Mina');
    fireEvent.press(screen.getByLabelText('Start conversation with Mina Manager'));
    await waitFor(() => expect(mockedApi.startConversation).toHaveBeenCalledWith(10));

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
  });
});