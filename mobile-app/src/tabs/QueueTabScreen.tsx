import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api';
import { Booking, BookingStatus } from '../types';
import { colors, spacing, typography, radii } from '../theme/tokens';

type StatusFilter = 'ALL' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED';

const PREP_STATUSES: BookingStatus[] = ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];

const statusMeta: Record<
  BookingStatus,
  { label: string; short: string; tone: string; tint: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  PENDING: { label: 'Pending approval', short: 'Pending', tone: '#FFF3D6', tint: '#9A6B00', icon: 'hourglass-outline' },
  CONFIRMED: { label: 'Awaiting prep', short: 'Queued', tone: '#F8E7C7', tint: '#B76A00', icon: 'time-outline' },
  PREPARING: { label: 'Preparing', short: 'Prep', tone: '#D9EBFF', tint: '#0056A8', icon: 'sparkles-outline' },
  READY: { label: 'Ready', short: 'Ready', tone: '#DDF5E5', tint: '#0A7A3F', icon: 'checkmark-circle-outline' },
  COMPLETED: { label: 'Completed', short: 'Done', tone: '#E8E9F7', tint: '#3E49A6', icon: 'checkbox-outline' },
  CANCELLED: { label: 'Cancelled', short: 'Cancel', tone: '#F9E1E1', tint: '#A32323', icon: 'close-circle-outline' },
};

const statusOrder: StatusFilter[] = ['ALL', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];

/** Next status in the forward prep flow (clerk can also move backwards via the menu). */
const NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'COMPLETED',
};

interface QueueTabScreenProps {
  initialStatus?: BookingStatus | 'ALL';
}

function mapBooking(item: any): Booking {
  const roomPayload = item.rooms?.[0]?.room ?? item.rooms?.[0] ?? null;
  const room = roomPayload
    ? {
        id: String(roomPayload.id ?? 'unknown'),
        name: roomPayload.name ?? 'Room',
        description: roomPayload.description ?? '',
        capacity: roomPayload.capacity ?? 0,
        status: roomPayload.status ?? 'AVAILABLE',
        isActive: roomPayload.isActive ?? true,
        imageUrl: roomPayload.imageUrl ?? '',
        amenities: (roomPayload.amenities || []).map((a: any) =>
          a?.amenity
            ? {
                id: String(a.amenity.id),
                name: a.amenity.name,
                icon: a.amenity.icon ?? 'checkmark-circle-outline',
                description: a.amenity.description,
              }
            : {
                id: String(a.id),
                name: a.name,
                icon: a.icon ?? 'checkmark-circle-outline',
                description: a.description,
              },
        ),
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
      };

  return {
    id: String(item.id),
    employeeId: String(item.employee?.id ?? item.employeeId ?? ''),
    startAt: item.startAt,
    endAt: item.endAt,
    purpose: item.purpose ?? '',
    status: item.status as BookingStatus,
    createdAt: item.createdAt ?? new Date().toISOString(),
    rooms: [
      {
        id: String(item.rooms?.[0]?.id ?? `${item.id}-room`),
        roomId: String(room.id),
        room,
      },
    ],
    requestedAmenities: Array.isArray(item.amenities)
      ? item.amenities.map((entry: any) => ({
          id: String(entry.amenity?.id ?? entry.id ?? `${item.id}-amenity`),
          name: entry.amenity?.name ?? entry.name ?? 'Amenity',
          icon: entry.amenity?.icon ?? 'checkmark-circle-outline',
          description: entry.amenity?.description ?? '',
        }))
      : [],
  };
}

function inventoryChecklistForRoom(booking: Booking): string[] {
  const roomName = booking.rooms[0]?.room?.name ?? 'Room';
  const baseList = [
    `${roomName} set-up checklist`,
    'Sanitiser and wipe-down check',
    'Table and chair layout',
  ];

  const extras = (booking.requestedAmenities || []).map((amenity) => {
    const name = amenity.name.toLowerCase();
    if (name.includes('projector')) return 'Projector remote + HDMI cable';
    if (name.includes('whiteboard')) return 'Whiteboard markers and eraser';
    if (name.includes('phone')) return 'Conference phone charged';
    if (name.includes('coffee')) return 'Coffee station restocked';
    if (name.includes('tv')) return 'TV input checked';
    return `${amenity.name} set and checked`;
  });

  return [...baseList, ...extras];
}

function formatTimeRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  const dayOpts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();
  if (sameDay) {
    return `${s.toLocaleDateString([], dayOpts)} · ${s.toLocaleTimeString([], timeOpts)} – ${e.toLocaleTimeString([], timeOpts)}`;
  }
  return `${s.toLocaleString([], { ...dayOpts, ...timeOpts })} – ${e.toLocaleString([], { ...dayOpts, ...timeOpts })}`;
}

export function QueueTabScreen({ initialStatus = 'ALL' }: QueueTabScreenProps) {
  const [queue, setQueue] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>(
    initialStatus === 'ALL' || PREP_STATUSES.includes(initialStatus as BookingStatus)
      ? (initialStatus as StatusFilter)
      : 'ALL',
  );
  const [searchText, setSearchText] = useState('');
  const [hidePast, setHidePast] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setError(null);
    try {
      const response = await api.getBookings();
      const nextQueue = Array.isArray(response)
        ? response
            .map(mapBooking)
            .filter((b) => PREP_STATUSES.includes(b.status))
        : [];
      setQueue(nextQueue);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load the queue.';
      setError(message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        await loadQueue();
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [loadQueue]),
  );

  useEffect(() => {
    if (!initialStatus) return;
    if (initialStatus === 'ALL' || PREP_STATUSES.includes(initialStatus as BookingStatus)) {
      setSelectedStatus(initialStatus as StatusFilter);
    }
  }, [initialStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQueue();
    setRefreshing(false);
  };

  const filteredQueue = useMemo(() => {
    const now = Date.now();
    const q = searchText.trim().toLowerCase();

    return queue
      .filter((booking) => {
        if (hidePast && new Date(booking.endAt).getTime() < now) return false;
        if (selectedStatus !== 'ALL' && booking.status !== selectedStatus) return false;
        if (!q) return true;
        const roomName = booking.rooms[0]?.room?.name?.toLowerCase() ?? '';
        const purpose = (booking.purpose || '').toLowerCase();
        const status = booking.status.toLowerCase();
        const employee = ''; // employee name may not be on Booking type
        return roomName.includes(q) || purpose.includes(q) || status.includes(q) || employee.includes(q);
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [queue, selectedStatus, searchText, hidePast]);

  const counts = useMemo(
    () => ({
      ALL: queue.filter((b) => !hidePast || new Date(b.endAt).getTime() >= Date.now()).length,
      CONFIRMED: queue.filter((b) => b.status === 'CONFIRMED').length,
      PREPARING: queue.filter((b) => b.status === 'PREPARING').length,
      READY: queue.filter((b) => b.status === 'READY').length,
      COMPLETED: queue.filter((b) => b.status === 'COMPLETED').length,
    }),
    [queue, hidePast],
  );

  const applyStatus = async (booking: Booking, newStatus: BookingStatus) => {
    if (booking.status === newStatus) return;
    setUpdatingId(booking.id);
    try {
      await api.updateBookingStatus(booking.id, newStatus);
      setQueue((current) =>
        current.map((b) => (b.id === booking.id ? { ...b, status: newStatus } : b)),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status.';
      Alert.alert('Update failed', message);
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmStatusChange = (booking: Booking, newStatus: BookingStatus) => {
    if (booking.status === newStatus) return;
    const from = statusMeta[booking.status]?.label ?? booking.status;
    const to = statusMeta[newStatus]?.label ?? newStatus;
    const roomName = booking.rooms[0]?.room?.name ?? 'this room';
    Alert.alert(
      'Confirm status change',
      `Update ${roomName} from ${from} to ${to}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          style: 'default',
          onPress: () => {
            void applyStatus(booking, newStatus);
          },
        },
      ],
    );
  };

  const openStatusPicker = (booking: Booking) => {
    const options = PREP_STATUSES.map((s) => ({
      text: statusMeta[s].label + (s === booking.status ? ' (current)' : ''),
      onPress: () => confirmStatusChange(booking, s),
    }));
    Alert.alert('Set status', booking.rooms[0]?.room?.name ?? 'Booking', [
      ...options,
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Prep queue</Text>
          <Text style={styles.headerSub}>
            {filteredQueue.length} shown · {counts.CONFIRMED} queued · {counts.PREPARING} in prep
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={onRefresh} disabled={refreshing}>
          <Ionicons name="refresh" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search room, purpose, or status"
          placeholderTextColor={colors.muted}
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchText.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
        keyboardShouldPersistTaps="handled"
      >
        {statusOrder.map((status) => {
          const active = selectedStatus === status;
          const label = status === 'ALL' ? 'All' : statusMeta[status].short;
          const count = counts[status];
          return (
            <TouchableOpacity
              key={status}
              onPress={() => setSelectedStatus(status)}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]} numberOfLines={1}>
                {label}
                {status !== 'ALL' ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={styles.hidePastRow}
        onPress={() => setHidePast((v) => !v)}
        activeOpacity={0.8}
      >
        <Ionicons
          name={hidePast ? 'checkbox' : 'square-outline'}
          size={18}
          color={colors.primary}
        />
        <Text style={styles.hidePastText}>Hide past bookings</Text>
      </TouchableOpacity>

      {loading && !refreshing ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Loading queue…</Text>
        </View>
      ) : error ? (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadQueue}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filteredQueue.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="list-outline" size={36} color={colors.muted} />
              <Text style={styles.emptyTitle}>No bookings in this view</Text>
              <Text style={styles.emptySub}>
                Try another status filter, clear search, or show past bookings.
              </Text>
            </View>
          ) : (
            filteredQueue.map((booking) => {
              const meta = statusMeta[booking.status] ?? statusMeta.CONFIRMED;
              const roomName = booking.rooms[0]?.room?.name ?? 'Room';
              const expanded = expandedId === booking.id;
              const checklist = inventoryChecklistForRoom(booking);
              const next = NEXT_STATUS[booking.status];
              const busy = updatingId === booking.id;

              return (
                <View key={booking.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roomName} numberOfLines={1}>
                        {roomName}
                      </Text>
                      <Text style={styles.when}>{formatTimeRange(booking.startAt, booking.endAt)}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.statusPill, { backgroundColor: meta.tone }]}
                      onPress={() => openStatusPicker(booking)}
                      disabled={busy}
                    >
                      <Ionicons name={meta.icon} size={12} color={meta.tint} />
                      <Text style={[styles.statusText, { color: meta.tint }]}>{meta.short}</Text>
                    </TouchableOpacity>
                  </View>

                  {!!booking.purpose && (
                    <Text style={styles.purpose} numberOfLines={2}>
                      {booking.purpose}
                    </Text>
                  )}

                  {(booking.requestedAmenities || []).length > 0 ? (
                    <View style={styles.amenityRow}>
                      {(booking.requestedAmenities || []).slice(0, 4).map((a) => (
                        <View key={a.id} style={styles.amenityChip}>
                          <Text style={styles.amenityText}>{a.name}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={styles.checklistToggle}
                    onPress={() => setExpandedId(expanded ? null : booking.id)}
                  >
                    <Ionicons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.steel}
                    />
                    <Text style={styles.checklistToggleText}>
                      {expanded ? 'Hide checklist' : 'Prep checklist'}
                    </Text>
                  </TouchableOpacity>

                  {expanded ? (
                    <View style={styles.checklistBox}>
                      {checklist.map((item, idx) => (
                        <View key={`${booking.id}-c-${idx}`} style={styles.checklistItem}>
                          <Ionicons name="ellipse-outline" size={12} color={colors.muted} />
                          <Text style={styles.checklistText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.actionsRow}>
                    {next ? (
                      <TouchableOpacity
                        style={styles.primaryAction}
                        onPress={() => confirmStatusChange(booking, next)}
                        disabled={busy}
                      >
                        {busy ? (
                          <ActivityIndicator color={colors.onPrimary} size="small" />
                        ) : (
                          <>
                            <Ionicons name="arrow-forward" size={14} color={colors.onPrimary} />
                            <Text style={styles.primaryActionText}>
                              Mark {statusMeta[next].short}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={styles.secondaryAction}
                      onPress={() => openStatusPicker(booking)}
                      disabled={busy}
                    >
                      <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
                      <Text style={styles.secondaryActionText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  headerTitle: { ...typography.displayMd, color: colors.ink },
  headerSub: { ...typography.captionSm, color: colors.muted, marginTop: 2 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.ink,
    padding: 0,
  },

  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
    marginBottom: spacing.sm,
  },
  filterRow: {
    paddingHorizontal: spacing.base,
    paddingRight: spacing.xl,
    alignItems: 'center',
    gap: 8,
  },
  filterPill: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: { ...typography.captionSm, color: colors.body, fontWeight: '600' },
  filterTextActive: { color: colors.onPrimary },
  hidePastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  hidePastText: { ...typography.bodySm, color: colors.ink },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.section,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  roomName: { ...typography.titleSm, color: colors.ink },
  when: { ...typography.captionSm, color: colors.muted, marginTop: 2 },
  purpose: { ...typography.bodySm, color: colors.body, marginTop: spacing.sm },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  statusText: { ...typography.captionSm, fontWeight: '700' },
  amenityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  amenityChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
  },
  amenityText: { ...typography.captionSm, color: colors.muted },
  checklistToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  checklistToggleText: { ...typography.buttonSm, color: colors.steel },
  checklistBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    gap: 8,
  },
  checklistItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  checklistText: { ...typography.bodySm, color: colors.body, flex: 1 },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  primaryActionText: { ...typography.buttonSm, color: colors.onPrimary },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  secondaryActionText: { ...typography.buttonSm, color: colors.primary },
  stateWrap: {
    flex: 1,
    paddingHorizontal: spacing.base,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stateText: { ...typography.bodyMd, color: colors.muted, textAlign: 'center' },
  retryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  retryButtonText: { ...typography.buttonSm, color: colors.onPrimary },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: { ...typography.titleMd, color: colors.ink, marginTop: spacing.md },
  emptySub: {
    ...typography.bodySm,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
