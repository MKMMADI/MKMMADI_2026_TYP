import React, { useCallback, useMemo, useState } from 'react';
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
import { Room, RoomStatus } from '../types';
import { colors, spacing, typography, radii } from '../theme/tokens';

type StatusFilter = 'ALL' | RoomStatus;

const HOUR_MS = 60 * 60 * 1000;

const statusMeta: Record<
  RoomStatus,
  { label: string; short: string; tone: string; tint: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  AVAILABLE: {
    label: 'Available',
    short: 'Open',
    tone: '#DDF5E5',
    tint: '#0A7A3F',
    icon: 'checkmark-circle-outline',
  },
  OUT_OF_SERVICE: {
    label: 'Out of service',
    short: 'OOS',
    tone: '#F9E1E1',
    tint: '#A32323',
    icon: 'close-circle-outline',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    short: 'Maint.',
    tone: '#F8E7C7',
    tint: '#B76A00',
    icon: 'construct-outline',
  },
};

const FILTERS: StatusFilter[] = ['ALL', 'AVAILABLE', 'MAINTENANCE', 'OUT_OF_SERVICE'];

interface OccupancySlot {
  bookingId: number | string;
  roomId: number | string;
  startAt: string;
  endAt: string;
  status: string;
}

function mapRoom(item: any): Room {
  const amenities = (item.amenities || []).map((a: any) =>
    a?.amenity
      ? {
          id: String(a.amenity.id ?? a.id),
          name: a.amenity.name ?? a.name,
          icon: a.amenity.icon ?? 'checkmark-circle-outline',
          description: a.amenity.description,
        }
      : {
          id: String(a.id),
          name: a.name,
          icon: a.icon ?? 'checkmark-circle-outline',
          description: a.description,
        },
  );
  return {
    id: String(item.id),
    name: item.name,
    description: item.description ?? '',
    capacity: item.capacity ?? 0,
    status: (item.status as RoomStatus) ?? 'AVAILABLE',
    isActive: item.isActive ?? true,
    imageUrl: item.imageUrl ?? '',
    amenities,
    floor: item.floor,
    location: item.location,
    rating: item.rating,
    reviewCount: item.reviewCount,
  };
}

function isBusyNow(roomId: string, slots: OccupancySlot[], now = Date.now()) {
  return slots.some((s) => {
    if (String(s.roomId) !== String(roomId)) return false;
    const start = new Date(s.startAt).getTime();
    const end = new Date(s.endAt).getTime();
    // Same rule as employee home: busy from 1h before start until end
    return start - HOUR_MS <= now && now < end;
  });
}

function nextBookingLabel(roomId: string, slots: OccupancySlot[], now = Date.now()) {
  const upcoming = slots
    .filter((s) => String(s.roomId) === String(roomId) && new Date(s.endAt).getTime() > now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  if (!upcoming.length) return null;
  const s = upcoming[0];
  const start = new Date(s.startAt);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  };
  return `Next: ${start.toLocaleString([], opts)}`;
}

export function RoomsTabScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 7 * 24 * HOUR_MS).toISOString();
      const [roomsRes, occRes] = await Promise.all([
        api.getRooms(),
        api.getOccupancy(from, to).catch(() => []),
      ]);
      setRooms(Array.isArray(roomsRes) ? roomsRes.map(mapRoom) : []);
      setOccupancy(Array.isArray(occRes) ? (occRes as OccupancySlot[]) : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load rooms.';
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

  const counts = useMemo(() => {
    const activeRooms = rooms.filter((r) => r.isActive !== false);
    return {
      ALL: activeRooms.length,
      AVAILABLE: activeRooms.filter((r) => r.status === 'AVAILABLE').length,
      MAINTENANCE: activeRooms.filter((r) => r.status === 'MAINTENANCE').length,
      OUT_OF_SERVICE: activeRooms.filter((r) => r.status === 'OUT_OF_SERVICE').length,
      busy: activeRooms.filter((r) => isBusyNow(r.id, occupancy)).length,
    };
  }, [rooms, occupancy]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms
      .filter((r) => r.isActive !== false)
      .filter((r) => (statusFilter === 'ALL' ? true : r.status === statusFilter))
      .filter((r) => {
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          (r.location || '').toLowerCase().includes(q) ||
          (r.floor || '').toString().toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms, statusFilter, search]);

  const applyStatus = async (room: Room, status: RoomStatus) => {
    if (room.status === status) return;
    setUpdatingId(room.id);
    try {
      await api.updateRoomStatus(room.id, status);
      setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, status } : r)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update room status.';
      Alert.alert('Update failed', message);
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmStatus = (room: Room, status: RoomStatus) => {
    const from = statusMeta[room.status].label;
    const to = statusMeta[status].label;
    Alert.alert(
      'Change room status',
      `Set ${room.name} from ${from} to ${to}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: () => void applyStatus(room, status) },
      ],
    );
  };

  const openStatusPicker = (room: Room) => {
    const statuses: RoomStatus[] = ['AVAILABLE', 'MAINTENANCE', 'OUT_OF_SERVICE'];
    Alert.alert(room.name, 'Set operational status', [
      ...statuses.map((s) => ({
        text: statusMeta[s].label + (s === room.status ? ' (current)' : ''),
        onPress: () => confirmStatus(room, s),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Rooms</Text>
          <Text style={styles.headerSub}>
            {counts.AVAILABLE} open · {counts.busy} in use · {counts.MAINTENANCE + counts.OUT_OF_SERVICE} flagged
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
          placeholder="Search name, floor, location"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch('')}>
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
        {FILTERS.map((f) => {
          const active = statusFilter === f;
          // Keep labels short so chips fit; row scrolls if needed
          const label =
            f === 'ALL' ? 'All' : f === 'AVAILABLE' ? 'Open' : f === 'MAINTENANCE' ? 'Maint' : 'OOS';
          const count = counts[f];
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setStatusFilter(f)}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]} numberOfLines={1}>
                {label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && !refreshing ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Loading rooms…</Text>
        </View>
      ) : error ? (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={36} color={colors.muted} />
              <Text style={styles.emptyTitle}>No rooms match</Text>
              <Text style={styles.emptySub}>Try another filter or clear search.</Text>
            </View>
          ) : (
            filtered.map((room) => {
              const meta = statusMeta[room.status] ?? statusMeta.AVAILABLE;
              const busy = room.status === 'AVAILABLE' && isBusyNow(room.id, occupancy);
              const next = nextBookingLabel(room.id, occupancy);
              const updating = updatingId === room.id;

              return (
                <View key={room.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roomName} numberOfLines={1}>
                        {room.name}
                      </Text>
                      <Text style={styles.roomDetails}>
                        {room.location || 'Main building'} · Floor {room.floor || 'G'} · Up to{' '}
                        {room.capacity}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.statusPill, { backgroundColor: meta.tone }]}
                      onPress={() => openStatusPicker(room)}
                      disabled={updating}
                    >
                      <Ionicons name={meta.icon} size={12} color={meta.tint} />
                      <Text style={[styles.statusText, { color: meta.tint }]}>{meta.short}</Text>
                    </TouchableOpacity>
                  </View>

                  {busy ? (
                    <View style={styles.busyBanner}>
                      <Ionicons name="time-outline" size={14} color="#B76A00" />
                      <Text style={styles.busyText}>In use or starting within the hour</Text>
                    </View>
                  ) : null}

                  {next ? <Text style={styles.nextLine}>{next}</Text> : (
                    <Text style={styles.nextLineMuted}>No upcoming bookings (7 days)</Text>
                  )}

                  {(room.amenities || []).length > 0 ? (
                    <View style={styles.amenityRow}>
                      {(room.amenities || []).slice(0, 4).map((a) => (
                        <View key={a.id} style={styles.amenityChip}>
                          <Text style={styles.amenityText}>{a.name}</Text>
                        </View>
                      ))}
                      {(room.amenities || []).length > 4 ? (
                        <Text style={styles.amenityMore}>+{room.amenities.length - 4}</Text>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.actionsRow}>
                    {room.status !== 'AVAILABLE' ? (
                      <TouchableOpacity
                        style={styles.primaryAction}
                        onPress={() => confirmStatus(room, 'AVAILABLE')}
                        disabled={updating}
                      >
                        {updating ? (
                          <ActivityIndicator color={colors.onPrimary} size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                            <Text style={styles.primaryActionText}>Mark available</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.warnAction}
                        onPress={() => confirmStatus(room, 'MAINTENANCE')}
                        disabled={updating}
                      >
                        <Ionicons name="construct-outline" size={14} color="#B76A00" />
                        <Text style={styles.warnActionText}>Maintenance</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.secondaryAction}
                      onPress={() => openStatusPicker(room)}
                      disabled={updating}
                    >
                      <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
                      <Text style={styles.secondaryActionText}>Status</Text>
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
  searchInput: { flex: 1, ...typography.bodyMd, color: colors.ink, padding: 0 },

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
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.captionSm, color: colors.body, fontWeight: '600' },
  filterTextActive: { color: colors.onPrimary },
  listContent: { paddingHorizontal: spacing.base, paddingBottom: spacing.section },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  roomName: { ...typography.titleSm, color: colors.ink },
  roomDetails: { ...typography.captionSm, color: colors.muted, marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  statusText: { ...typography.captionSm, fontWeight: '700' },
  busyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: '#FFF3D6',
  },
  busyText: { ...typography.captionSm, color: '#B76A00', fontWeight: '600' },
  nextLine: { ...typography.captionSm, color: colors.body, marginTop: spacing.sm },
  nextLineMuted: { ...typography.captionSm, color: colors.muted, marginTop: spacing.sm },
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
  amenityMore: { ...typography.captionSm, color: colors.muted, alignSelf: 'center' },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
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
  warnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF3D6',
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  warnActionText: { ...typography.buttonSm, color: '#B76A00' },
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
  emptySub: { ...typography.bodySm, color: colors.muted, marginTop: spacing.xs, textAlign: 'center' },
});
