import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import api from '../api';
import { API_SOCKET_URL } from '../config';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { ConversationSummary, DirectMessage, User } from '../types';

interface MessagePage {
  messages: DirectMessage[];
  nextBeforeId: number | null;
}

type SocketStatus = 'connecting' | 'connected' | 'offline';

function mergeMessages(current: DirectMessage[], incoming: DirectMessage[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, { ...byId.get(message.id), ...message }));
  return [...byId.values()].sort(
    (first, second) =>
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime() || first.id - second.id,
  );
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessagesTabScreen({ user }: { user: User }) {
  const [contacts, setContacts] = useState<User[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const threadRef = useRef<ScrollView | null>(null);

  const refreshConversations = useCallback(async () => {
    const result = await api.getConversations();
    setConversations(Array.isArray(result) ? result as ConversationSummary[] : []);
    return Array.isArray(result) ? result as ConversationSummary[] : [];
  }, []);

  const refreshHistory = useCallback(async (conversationId: number) => {
    const page = await api.getConversationMessages(conversationId) as MessagePage;
    setMessages((current) => mergeMessages(current, page.messages));
    setNextBeforeId(page.nextBeforeId);
    await api.markConversationRead(conversationId);
    await refreshConversations();
  }, [refreshConversations]);

  const loadInbox = useCallback(async () => {
    try {
      setError(null);
      const [contactResult, conversationResult] = await Promise.all([
        api.getConversationContacts(),
        api.getConversations(),
      ]);
      const nextContacts = Array.isArray(contactResult) ? contactResult as User[] : [];
      const nextConversations = Array.isArray(conversationResult)
        ? conversationResult as ConversationSummary[]
        : [];
      setContacts(nextContacts);
      setConversations(nextConversations);

      const activeId = selectedIdRef.current;
      const selectedStillExists = nextConversations.some((conversation) => conversation.id === activeId);
      const nextId = selectedStillExists ? activeId : nextConversations[0]?.id ?? null;
      selectedIdRef.current = nextId;
      setSelectedConversationId(nextId);
      if (nextId) await refreshHistory(nextId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [refreshHistory]);

  useFocusEffect(
    useCallback(() => {
      void loadInbox();
    }, [loadInbox]),
  );

  useEffect(() => {
    let active = true;
    let refreshingToken = false;
    const socket = io(API_SOCKET_URL, { autoConnect: false, auth: { accessToken: '' } });
    socketRef.current = socket;

    const connect = async () => {
      try {
        const accessToken = await api.getSocketAccessToken();
        if (!active) return;
        socket.auth = { accessToken };
        socket.connect();
      } catch {
        if (active) setSocketStatus('offline');
      }
    };

    socket.on('connect', () => {
      setSocketStatus('connected');
      void loadInbox();
    });
    socket.on('disconnect', () => setSocketStatus('offline'));
    socket.on('connect_error', async () => {
      setSocketStatus('offline');
      if (refreshingToken) return;
      refreshingToken = true;
      try {
        const accessToken = await api.getSocketAccessToken();
        if (active) {
          socket.auth = { accessToken };
          socket.connect();
        }
      } catch {
        setSocketStatus('offline');
      } finally {
        refreshingToken = false;
      }
    });
    socket.on('message:new', (event: { conversationId: number; message: DirectMessage }) => {
      if (selectedIdRef.current === event.conversationId) {
        setMessages((current) => mergeMessages(current, [event.message]));
      }
      void refreshConversations();
    });
    socket.on('conversation:read', (event: { conversationId: number; readerId: number; readAt: string }) => {
      if (selectedIdRef.current === event.conversationId) {
        setMessages((current) => current.map((message) =>
          message.recipientId === event.readerId ? { ...message, readAt: event.readAt } : message,
        ));
      }
      void refreshConversations();
    });

    void connect();
    return () => {
      active = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [loadInbox, refreshConversations]);

  useEffect(() => {
    threadRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  async function openConversation(conversationId: number) {
    selectedIdRef.current = conversationId;
    setSelectedConversationId(conversationId);
    setMessages([]);
    setLoadingHistory(true);
    setError(null);
    try {
      await refreshHistory(conversationId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not load conversation.');
    } finally {
      setLoadingHistory(false);
    }
  }

  async function beginConversation(participantId: number) {
    try {
      setError(null);
      const conversation = await api.startConversation(participantId) as ConversationSummary;
      await refreshConversations();
      setContactSearch('');
      await openConversation(conversation.id);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not start conversation.');
    }
  }

  async function sendMessage() {
    const body = draft.trim();
    if (!selectedConversationId || !body || sending) return;
    setSending(true);
    setError(null);
    try {
      const message = await api.sendConversationMessage(selectedConversationId, body) as DirectMessage;
      setMessages((current) => mergeMessages(current, [message]));
      setDraft('');
      await refreshConversations();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  }

  async function loadOlderMessages() {
    if (!selectedConversationId || !nextBeforeId || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await api.getConversationMessages(selectedConversationId, 50, nextBeforeId) as MessagePage;
      setMessages((current) => mergeMessages(page.messages, current));
      setNextBeforeId(page.nextBeforeId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Older messages could not be loaded.');
    } finally {
      setLoadingOlder(false);
    }
  }

  const selectedConversation = conversations.find(({ id }) => id === selectedConversationId) ?? null;
  const filteredContacts = contacts.filter((contact) =>
    `${contact.name} ${contact.role}`.toLowerCase().includes(contactSearch.trim().toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Messages</Text>
            <Text style={styles.subtitle}>{socketStatus === 'connected' ? 'Live' : socketStatus === 'connecting' ? 'Connecting' : 'Offline'}</Text>
          </View>
          <Ionicons name={socketStatus === 'connected' ? 'chatbubbles' : 'chatbubbles-outline'} size={23} color={socketStatus === 'connected' ? colors.success : colors.muted} />
        </View>

        <View style={styles.contactSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={17} color={colors.muted} />
            <TextInput
              accessibilityLabel="Search permitted contacts"
              style={styles.searchInput}
              value={contactSearch}
              onChangeText={setContactSearch}
              placeholder="Start a conversation"
              placeholderTextColor={colors.mutedSoft}
            />
          </View>
          {contactSearch.trim() ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contactResults}>
              {filteredContacts.map((contact) => (
                <TouchableOpacity
                  key={contact.id}
                  style={styles.contactChip}
                  accessibilityRole="button"
                  accessibilityLabel={`Start conversation with ${contact.name}`}
                  onPress={() => void beginConversation(Number(contact.id))}
                >
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactRole}>{contact.role.toLowerCase()}</Text>
                </TouchableOpacity>
              ))}
              {filteredContacts.length === 0 ? <Text style={styles.emptyInline}>No permitted contacts</Text> : null}
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.conversationStrip}>
          {loading ? <ActivityIndicator color={colors.primary} /> : conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={[styles.conversationChip, selectedConversationId === conversation.id && styles.conversationChipActive]}
              onPress={() => void openConversation(conversation.id)}
            >
              <View style={styles.conversationChipText}>
                <Text style={styles.conversationName} numberOfLines={1}>{conversation.participant.name}</Text>
                {conversation.unreadCount > 0 ? <Text style={styles.unreadCount}>{conversation.unreadCount}</Text> : null}
              </View>
              <Text style={styles.conversationPreview} numberOfLines={1}>
                {conversation.lastMessage?.body ?? conversation.participant.role.toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
          {!loading && conversations.length === 0 ? <Text style={styles.emptyInline}>No conversations yet</Text> : null}
        </View>

        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        {selectedConversation ? (
          <View style={styles.threadHeader}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{selectedConversation.participant.name.slice(0, 1).toUpperCase()}</Text></View>
            <View>
              <Text style={styles.threadName}>{selectedConversation.participant.name}</Text>
              <Text style={styles.threadRole}>{selectedConversation.participant.role.toLowerCase()}</Text>
            </View>
          </View>
        ) : null}

        <ScrollView
          ref={threadRef}
          style={styles.thread}
          contentContainerStyle={styles.threadContent}
          keyboardShouldPersistTaps="handled"
        >
          {nextBeforeId ? (
            <TouchableOpacity style={styles.loadOlder} onPress={() => void loadOlderMessages()} disabled={loadingOlder}>
              <Text style={styles.loadOlderText}>{loadingOlder ? 'Loading…' : 'Load older messages'}</Text>
            </TouchableOpacity>
          ) : null}
          {loadingHistory ? <ActivityIndicator color={colors.primary} /> : null}
          {messages.map((message) => {
            const mine = message.senderId === Number(user.id);
            return (
              <View key={message.id} style={[styles.messageBubble, mine ? styles.messageMine : styles.messageTheirs]}>
                <Text style={[styles.messageBody, mine && styles.messageBodyMine]}>{message.body}</Text>
                <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>
                  {formatMessageTime(message.createdAt)}{mine && message.readAt ? ' · Read' : ''}
                </Text>
              </View>
            );
          })}
          {!loadingHistory && selectedConversationId && messages.length === 0 ? (
            <Text style={styles.emptyThread}>No messages yet. Say hello.</Text>
          ) : null}
        </ScrollView>

        {selectedConversation ? (
          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Write a message"
              style={styles.composerInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a message…"
              placeholderTextColor={colors.mutedSoft}
              multiline
              maxLength={4000}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
              onPress={() => void sendMessage()}
              disabled={!draft.trim() || sending}
            >
              {sending ? <ActivityIndicator color={colors.onPrimary} size="small" /> : <Ionicons name="send" size={18} color={colors.onPrimary} />}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyPrompt}>
            <Text style={styles.emptyPromptText}>Search for a manager to start a conversation.</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  headerCopy: { gap: 2 },
  title: { ...typography.displayMd, color: colors.ink },
  subtitle: { ...typography.captionSm, color: colors.muted, textTransform: 'capitalize' },
  contactSection: { paddingHorizontal: spacing.base },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 42, paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surfaceSoft },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 8, ...typography.bodySm, color: colors.ink },
  contactResults: { gap: spacing.sm, paddingVertical: spacing.sm },
  contactChip: { maxWidth: 190, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.hairline, borderRadius: radii.md, backgroundColor: colors.canvas },
  contactName: { ...typography.captionSm, color: colors.ink, fontWeight: '600' },
  contactRole: { ...typography.badge, color: colors.muted, textTransform: 'capitalize' },
  emptyInline: { ...typography.captionSm, color: colors.muted, paddingVertical: spacing.md },
  conversationStrip: { flexDirection: 'row', gap: spacing.sm, minHeight: 60, paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  conversationChip: { width: 150, justifyContent: 'center', gap: 3, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.hairlineSoft, borderRadius: radii.md, backgroundColor: colors.canvas },
  conversationChipActive: { borderColor: colors.steel, backgroundColor: colors.steelLight },
  conversationChipText: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  conversationName: { flex: 1, ...typography.captionSm, color: colors.ink, fontWeight: '600' },
  unreadCount: { minWidth: 18, paddingHorizontal: 4, borderRadius: radii.full, backgroundColor: colors.steel, color: colors.white, textAlign: 'center', fontSize: 10, fontWeight: '700' },
  conversationPreview: { ...typography.badge, color: colors.muted },
  error: { paddingHorizontal: spacing.base, color: colors.error, ...typography.captionSm },
  threadHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.hairlineSoft },
  avatar: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radii.full, backgroundColor: colors.steelLight },
  avatarText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  threadName: { ...typography.bodySm, color: colors.ink, fontWeight: '700' },
  threadRole: { ...typography.badge, color: colors.muted, textTransform: 'capitalize' },
  thread: { flex: 1 },
  threadContent: { flexGrow: 1, justifyContent: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  loadOlder: { alignSelf: 'center', padding: spacing.sm },
  loadOlderText: { ...typography.captionSm, color: colors.steel },
  messageBubble: { maxWidth: '84%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md },
  messageMine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  messageTheirs: { alignSelf: 'flex-start', backgroundColor: colors.surfaceSoft },
  messageBody: { ...typography.bodySm, color: colors.ink },
  messageBodyMine: { color: colors.onPrimary },
  messageTime: { ...typography.badge, color: colors.muted, marginTop: 4, textAlign: 'right' },
  messageTimeMine: { color: colors.steelLight },
  emptyThread: { alignSelf: 'center', padding: spacing.lg, ...typography.bodySm, color: colors.muted },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderTopWidth: 1, borderColor: colors.hairlineSoft, backgroundColor: colors.canvas },
  composerInput: { flex: 1, maxHeight: 110, minHeight: 42, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.hairline, borderRadius: radii.md, ...typography.bodySm, color: colors.ink, textAlignVertical: 'top' },
  sendButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radii.full, backgroundColor: colors.primary },
  sendButtonDisabled: { backgroundColor: colors.primaryDisabled },
  emptyPrompt: { padding: spacing.md, alignItems: 'center' },
  emptyPromptText: { ...typography.captionSm, color: colors.muted, textAlign: 'center' },
});