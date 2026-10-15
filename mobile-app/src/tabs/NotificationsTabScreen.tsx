import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io, Socket } from 'socket.io-client';
import api from '../api';
import { API_SOCKET_URL } from '../config';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { useAppTheme } from '../theme/AppTheme';
import type { ColorPalette } from '../theme/tokens';
import { NotificationBooking, MobileNotification, buildNotificationFeed } from '../lib/notifications';
import { ConversationSummary, User } from '../types';

export function NotificationsTabScreen({
  user,
  onCountChange,
}: {
  user: User;
  onCountChange?: (count: number) => void;
}) {
  const { colors, mode } = useAppTheme();
  const styles = createStyles(colors);
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  const refreshNotifications = useCallback(async () => {
    setRefreshing(true);
    const [bookingsResult, conversationsResult] = await Promise.allSettled([
      api.getBookings(),
      api.getConversations(),
    ]);

    const errors: string[] = [];
    let bookingData: NotificationBooking[] = [];
    let conversationData: ConversationSummary[] = [];

    if (bookingsResult.status === 'fulfilled' && Array.isArray(bookingsResult.value)) {
      bookingData = bookingsResult.value as NotificationBooking[];
    } else if (bookingsResult.status === 'rejected') {
      errors.push(bookingsResult.reason instanceof Error
        ? `Bookings: ${bookingsResult.reason.message}`
        : 'Bookings: Could not load bookings.');
    } else {
      errors.push('Bookings: The server returned an invalid booking list.');
    }

    if (conversationsResult.status === 'fulfilled' && Array.isArray(conversationsResult.value)) {
      conversationData = conversationsResult.value as ConversationSummary[];
    } else if (conversationsResult.status === 'rejected') {
      errors.push(conversationsResult.reason instanceof Error
        ? `Messages: ${conversationsResult.reason.message}`
        : 'Messages: Could not load messages.');
    } else {
      errors.push('Messages: The server returned an invalid conversation list.');
    }

    if (bookingsResult.status === 'fulfilled' || conversationsResult.status === 'fulfilled') {
      const nextNotifications = buildNotificationFeed(bookingData, conversationData, user.id);
      setNotifications(nextNotifications);
      onCountChangeRef.current?.(nextNotifications.length);
    }
    setError(errors.length > 0 ? errors.join('\n') : null);
    setRefreshing(false);
    setLoading(false);
  }, [user.id]);

  useFocusEffect(
    useCallback(() => {
      void refreshNotifications();
    }, [refreshNotifications]),
  );

  useEffect(() => {
    let active = true;
    let refreshingToken = false;
    const socket: Socket = io(API_SOCKET_URL, { autoConnect: false, auth: { accessToken: '' } });

    const connect = async () => {
      try {
        const accessToken = await api.getSocketAccessToken();
        if (!active) return;
        socket.auth = { accessToken };
        socket.connect();
      } catch (caughtError) {
        if (active) {
          setError((current) => [
            current,
            caughtError instanceof Error ? `Realtime updates: ${caughtError.message}` : 'Realtime updates are unavailable.',
          ].filter(Boolean).join('\n'));
        }
      }
    };

    const refreshForUpdate = () => {
      if (active) void refreshNotifications();
    };
    socket.on('booking:displaced', refreshForUpdate);
    socket.on('booking:updated', refreshForUpdate);
    socket.on('message:new', refreshForUpdate);
    socket.on('conversation:read', refreshForUpdate);
    socket.on('connect_error', async () => {
      if (!active || refreshingToken) return;
      refreshingToken = true;
      try {
        const accessToken = await api.getSocketAccessToken();
        if (active) {
          socket.auth = { accessToken };
          socket.connect();
        }
      } catch (caughtError) {
        if (active) {
          setError((current) => [
            current,
            caughtError instanceof Error ? `Realtime updates: ${caughtError.message}` : 'Realtime updates are unavailable.',
          ].filter(Boolean).join('\n'));
        }
      } finally {
        refreshingToken = false;
      }
    });
    void connect();

    return () => {
      active = false;
      socket.disconnect();
    };
  }, [refreshNotifications]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surfaceSoft} />
      <ScrollView
        testID="notifications-scroll-view"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refreshNotifications()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>UPDATES</Text>
            <Text style={styles.title}>Notifications</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Refresh notifications"
            onPress={() => void refreshNotifications()}
            disabled={refreshing}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshText}>{refreshing ? 'Refreshing…' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator accessibilityLabel="Loading notifications" color={colors.primary} /> : null}
        {!loading && !error && notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>You’re all caught up</Text>
            <Text style={styles.emptyText}>Booking updates and unread messages will appear here.</Text>
          </View>
        ) : null}

        {notifications.map((notification) => (
          <NotificationCard key={notification.id} notification={notification} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationCard({ notification }: { notification: MobileNotification }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const isMessage = notification.type === 'MESSAGE';
  const isReschedule = notification.type === 'BOOKING_RESCHEDULED';
  return (
    <View style={styles.card}>
      <View style={[styles.icon, isMessage ? styles.messageIcon : isReschedule ? styles.rescheduleIcon : styles.confirmedIcon]}>
        <Text style={styles.iconText}>{isMessage ? 'M' : isReschedule ? '!' : '✓'}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{notification.title}</Text>
        <Text style={styles.cardDetail}>{notification.detail}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
  safeArea: { flex: 1,   backgroundColor: colors.surfaceSoft },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 4,
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
  },
  refreshButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.steelLight,
  },
  refreshText: { color: colors.primary, fontWeight: '700' },
  error: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#FDECEC',
    color: '#A32323',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCard,
  },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  emptyText: { marginTop: spacing.xs, color: colors.muted, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCard,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  confirmedIcon: { backgroundColor: '#DDF5E5' },
  rescheduleIcon: { backgroundColor: '#FFF0D9' },
  messageIcon: { backgroundColor: colors.steelLight },
  iconText: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  cardContent: { flex: 1 },
  cardTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  cardDetail: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: typography.bodyMd.fontSize,
    lineHeight: 20,
  },
});
};
