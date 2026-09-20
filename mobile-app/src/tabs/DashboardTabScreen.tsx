import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api';
import { Booking, BookingStatus, User } from '../types';
import { colors, spacing, typography, radii } from '../theme/tokens';

type QueueStatus = Extract<BookingStatus, 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED'>;

interface DashboardTabScreenProps {
  user: User;
  onOpenQueue?: (status?: QueueStatus | 'ALL') => void;
  onOpenRooms?: () => void;
}

function mapBooking(item: any): Booking {
  return {
    id: String(item.id),
    employeeId: String(item.employee?.id ?? item.employeeId ?? ''),
    startAt: item.startAt,
    endAt: item.endAt,
    purpose: item.purpose ?? '',
    status: item.status,
    createdAt: item.createdAt ?? new Date().toISOString(),
    rooms:
      item.rooms?.map((r: any) => ({
        id: String(r.id ?? `${item.id}-room`),
        roomId: String(r.roomId ?? r.room?.id ?? ''),
        room: r.room
          ? {
              id: String(r.room.id),
              name: r.room.name ?? 'Room',
              description: r.room.description ?? '',
              capacity: r.room.capacity ?? 0,
              status: r.room.status ?? 'AVAILABLE',
              isActive: r.room.isActive ?? true,
              imageUrl: r.room.imageUrl ?? '',
              amenities: [],
            }
          : {
              id: 'unknown',
              name: 'Room',
              description: '',
              capacity: 0,
              status: 'AVAILABLE' as const,
              isActive: true,
              imageUrl: '',
              amenities: [],
            },
      })) ?? [],
    requestedAmenities: [],
  };
}

function isSameDay(iso: string, day: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

function formatTimeRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${s.toLocaleTimeString([], opts)} – ${e.toLocaleTimeString([], opts)}`;
}

const STATUS_META: Record<
  QueueStatus,
  { label: string; tone: string; tint: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  CONFIRMED: { label: 'Queued', tone: '#F8E7C7', tint: '#B76A00', icon: 'time-outline' },
  PREPARING: { label: 'Preparing', tone: '#D9EBFF', tint: '#0056A8', icon: 'sparkles-outline' },
  READY: { label: 'Ready', tone: '#DDF5E5', tint: '#0A7A3F', icon: 'checkmark-circle-outline' },
  COMPLETED: { label: 'Done', tone: '#E8E9F7', tint: '#3E49A6', icon: 'checkbox-outline' },
};

export function DashboardTabScreen({ user, onOpenQueue, onOpenRooms }: DashboardTabScreenProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [roomStats, setRoomStats] = useState({ total: 0, available: 0, maintenance: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [bookingsRes, roomsRes] = await Promise.all([
        api.getBookings(),
        api.getRooms().catch(() => []),
      ]);
      const list = Array.isArray(bookingsRes) ? bookingsRes.map(mapBooking) : [];
      setBookings(list);

      if (Array.isArray(roomsRes)) {
        const total = roomsRes.length;
        const available = roomsRes.filter((r: any) => r.status === 'AVAILABLE').length;
        const maintenance = roomsRes.filter(
          (r: any) => r.status === 'MAINTENANCE' || r.status === 'OUT_OF_SERVICE',
        ).length;
        setRoomStats({ total, available, maintenance });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load dashboard.';
      setError(message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        await load();
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const today = useMemo(() => new Date(), []);

  const todayQueue = useMemo(() => {
    return bookings
      .filter((b) => ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'].includes(b.status))
      .filter((b) => isSameDay(b.startAt, today) || isSameDay(b.endAt, today));
  }, [bookings, today]);

  // If nothing is scheduled "today", still show active pipeline items (next 48h) so the board isn't empty
  const activePipeline = useMemo(() => {
    const now = Date.now();
    const horizon = now + 48 * 60 * 60 * 1000;
    const pool = todayQueue.length
      ? todayQueue
      : bookings.filter((b) => {
          if (!['CONFIRMED', 'PREPARING', 'READY'].includes(b.status)) return false;
          const start = new Date(b.startAt).getTime();
          const end = new Date(b.endAt).getTime();
          return end >= now && start <= horizon;
        });
    return pool;
  }, [bookings, todayQueue]);

  const counts = useMemo(() => {
    const source = todayQueue.length ? todayQueue : activePipeline;
    return {
      CONFIRMED: source.filter((b) => b.status === 'CONFIRMED').length,
      PREPARING: source.filter((b) => b.status === 'PREPARING').length,
      READY: source.filter((b) => b.status === 'READY').length,
      COMPLETED: source.filter((b) => b.status === 'COMPLETED').length,
      PENDING: bookings.filter((b) => b.status === 'PENDING').length,
    };
  }, [todayQueue, activePipeline, bookings]);

  const priorityItems = useMemo(() => {
    return activePipeline
      .filter((b) => b.status === 'CONFIRMED' || b.status === 'PREPARING' || b.status === 'READY')
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 6);
  }, [activePipeline]);

  const firstName = (user.name || 'Clerk').split(' ')[0];
  const dateLabel = today.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  const summaryCards: {
    key: QueueStatus | 'ALL';
    label: string;
    value: number;
    tone: string;
    tint: string;
  }[] = [
    { key: 'CONFIRMED', label: 'Queued', value: counts.CONFIRMED, tone: '#F8E7C7', tint: '#B76A00' },
    { key: 'PREPARING', label: 'Preparing', value: counts.PREPARING, tone: '#D9EBFF', tint: '#0056A8' },
    { key: 'READY', label: 'Ready', value: counts.READY, tone: '#DDF5E5', tint: '#0A7A3F' },
    { key: 'COMPLETED', label: 'Done today', value: counts.COMPLETED, tone: '#E8E9F7', tint: '#3E49A6' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hi, {firstName}</Text>
            <Text style={styles.dateLine}>{dateLabel}</Text>
          </View>
          <TouchableOpacity style={styles.refreshChip} onPress={onRefresh} disabled={refreshing}>
            <Ionicons name="refresh" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Prep overview</Text>
          <Text style={styles.heroSubtitle}>
            {todayQueue.length
              ? `${todayQueue.length} booking${todayQueue.length === 1 ? '' : 's'} on today’s schedule`
              : activePipeline.length
                ? `${activePipeline.length} active item${activePipeline.length === 1 ? '' : 's'} in the next 48 hours`
                : 'No active prep items right now'}
          </Text>
          {counts.PENDING > 0 ? (
            <Text style={styles.pendingNote}>
              {counts.PENDING} pending approval (manager) — not in clerk prep queue
            </Text>
          ) : null}
        </View>

        {loading && !refreshing ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Loading dashboard…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateWrap}>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={load}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.summaryGrid}>
              {summaryCards.map((card) => (
                <TouchableOpacity
                  key={card.key}
                  style={[styles.summaryCard, { backgroundColor: card.tone }]}
                  activeOpacity={0.85}
                  onPress={() => onOpenQueue?.(card.key)}
                >
                  <Text style={[styles.summaryLabel, { color: card.tint }]}>{card.label}</Text>
                  <Text style={[styles.summaryValue, { color: card.tint }]}>{card.value}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.quickRow}>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => onOpenQueue?.('ALL')}
                activeOpacity={0.85}
              >
                <Ionicons name="list-outline" size={20} color={colors.primary} />
                <Text style={styles.quickActionText}>Open queue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => onOpenRooms?.()}
                activeOpacity={0.85}
              >
                <Ionicons name="business-outline" size={20} color={colors.primary} />
                <Text style={styles.quickActionText}>Rooms</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.roomStrip}>
              <View style={styles.roomStat}>
                <Text style={styles.roomStatValue}>{roomStats.available}</Text>
                <Text style={styles.roomStatLabel}>Available</Text>
              </View>
              <View style={styles.roomStatDivider} />
              <View style={styles.roomStat}>
                <Text style={styles.roomStatValue}>{roomStats.maintenance}</Text>
                <Text style={styles.roomStatLabel}>Out / maint.</Text>
              </View>
              <View style={styles.roomStatDivider} />
              <View style={styles.roomStat}>
                <Text style={styles.roomStatValue}>{roomStats.total}</Text>
                <Text style={styles.roomStatLabel}>Total rooms</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Needs attention</Text>
              <TouchableOpacity onPress={() => onOpenQueue?.('ALL')}>
                <Text style={styles.linkText}>See all</Text>
              </TouchableOpacity>
            </View>

            {priorityItems.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="checkmark-done-outline" size={28} color={colors.muted} />
                <Text style={styles.emptyTitle}>Queue is clear</Text>
                <Text style={styles.emptySub}>No confirmed or in-prep bookings need action.</Text>
              </View>
            ) : (
              priorityItems.map((booking) => {
                const status = booking.status as QueueStatus;
                const meta = STATUS_META[status] ?? STATUS_META.CONFIRMED;
                const roomName = booking.rooms[0]?.room?.name ?? 'Room';
                return (
                  <TouchableOpacity
                    key={booking.id}
                    style={styles.card}
                    activeOpacity={0.85}
                    onPress={() => onOpenQueue?.(status)}
                  >
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {roomName}
                      </Text>
                      <View style={[styles.statusPill, { backgroundColor: meta.tone }]}>
                        <Ionicons name={meta.icon} size={12} color={meta.tint} />
                        <Text style={[styles.statusText, { color: meta.tint }]}>{meta.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>
                      {booking.purpose || 'No purpose listed'}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {formatTimeRange(booking.startAt, booking.endAt)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingBottom: spacing.section },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  greeting: { ...typography.displayMd, color: colors.ink },
  dateLine: { ...typography.bodySm, color: colors.muted, marginTop: 2 },
  refreshChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    marginHorizontal: spacing.base,
    padding: spacing.base,
    borderRadius: radii.lg,
    backgroundColor: colors.steelLight,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    marginBottom: spacing.md,
  },
  heroTitle: { ...typography.titleMd, color: colors.ink },
  heroSubtitle: { ...typography.bodySm, color: colors.muted, marginTop: 6 },
  pendingNote: { ...typography.captionSm, color: colors.warning, marginTop: 8 },
  sectionTitle: {
    ...typography.titleMd,
    color: colors.ink,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.base,
    marginTop: spacing.md,
  },
  linkText: { ...typography.buttonSm, color: colors.steel },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  summaryCard: {
    width: '47%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    minHeight: 72,
    justifyContent: 'center',
  },
  summaryLabel: { ...typography.captionSm, fontWeight: '600' },
  summaryValue: { ...typography.displaySm, marginTop: 4 },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  quickActionText: { ...typography.buttonSm, color: colors.primary },
  roomStrip: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  roomStat: { flex: 1, alignItems: 'center' },
  roomStatValue: { ...typography.titleMd, color: colors.primary },
  roomStatLabel: { ...typography.captionSm, color: colors.muted, marginTop: 2 },
  roomStatDivider: { width: 1, backgroundColor: colors.hairlineSoft },
  card: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    padding: spacing.base,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: { ...typography.titleSm, color: colors.ink, flex: 1 },
  cardSubtitle: { ...typography.bodySm, color: colors.body, marginTop: 4 },
  cardMeta: { ...typography.captionSm, color: colors.muted, marginTop: 4 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  statusText: { ...typography.captionSm, fontWeight: '700' },
  emptyCard: {
    marginHorizontal: spacing.base,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
  },
  emptyTitle: { ...typography.titleSm, color: colors.ink, marginTop: spacing.sm },
  emptySub: { ...typography.bodySm, color: colors.muted, marginTop: 4, textAlign: 'center' },
  stateWrap: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  stateText: { ...typography.bodyMd, color: colors.muted, textAlign: 'center' },
  retryButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
  },
  retryButtonText: { ...typography.buttonSm, color: colors.onPrimary },
});
