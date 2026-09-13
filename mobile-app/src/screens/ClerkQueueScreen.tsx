import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api';
import type { Booking, BookingStatus } from '../types';
import { colors, radii, spacing, typography } from '../theme/tokens';

type FilterKey = 'ALL' | 'CONFIRMED' | 'PREPARING' | 'READY';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'CONFIRMED', label: 'Awaiting' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY', label: 'Ready' },
];

const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: 'CONFIRMED', label: 'Awaiting prep' },
  { value: 'PREPARING', label: 'Preparing' },
  { value: 'READY', label: 'Ready' },
  { value: 'COMPLETED', label: 'Completed' },
];

function formatRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return `${start.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function statusLabel(status: string) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label || status;
}

function statusTone(status: string) {
  if (status === 'READY') return styles.pillReady;
  if (status === 'PREPARING') return styles.pillPreparing;
  return styles.pillAwaiting;
}

interface ClerkQueueScreenProps {
  onOpenProfile?: () => void;
  onOpenStock?: () => void;
}

export function ClerkQueueScreen({ onOpenProfile, onOpenStock }: ClerkQueueScreenProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.getQueueBookings();
      setBookings(list);
    } catch (err: any) {
      setError(err?.message || 'Could not load preparation queue');
      setBookings([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await load();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const sorted = [...bookings].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
    if (filter === 'ALL') return sorted;
    return sorted.filter((b) => b.status === filter);
  }, [bookings, filter]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function changeStatus(booking: Booking, status: BookingStatus) {
    if (actionId || status === booking.status) return;
    setActionId(booking.id);
    try {
      const updated = await api.updateBookingStatus(booking.id, status);
      setBookings((prev) => {
        if (status === 'COMPLETED') return prev.filter((b) => b.id !== booking.id);
        return prev.map((b) => (b.id === booking.id ? updated : b));
      });
      setToast(`Updated to ${statusLabel(status)}`);
    } catch (err: any) {
      setToast(err?.message || 'Status update failed');
    } finally {
      setActionId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Preparation queue</Text>
          <Text style={styles.sub}>Confirm rooms for upcoming meetings. You can move status forward or back.</Text>
        </View>
        <View style={styles.headerActions}>
          {onOpenStock && (
            <TouchableOpacity style={styles.chipBtn} onPress={onOpenStock}>
              <Ionicons name="cube-outline" size={16} color={colors.ink} />
              <Text style={styles.chipBtnText}>Stock</Text>
            </TouchableOpacity>
          )}
          {onOpenProfile && (
            <TouchableOpacity style={styles.chipBtn} onPress={onOpenProfile}>
              <Ionicons name="person-outline" size={16} color={colors.ink} />
              <Text style={styles.chipBtnText}>Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.hint}>Loading queue…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} style={styles.retry}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Queue is clear</Text>
            <Text style={styles.hint}>No confirmed meetings need prep in this filter.</Text>
          </View>
        )}

        {!loading &&
          !error &&
          filtered.map((booking) => {
            const rooms = booking.rooms.map((r) => r.room?.name || r.roomId).join(', ') || '—';
            return (
              <View key={booking.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.time}>{formatRange(booking.startAt, booking.endAt)}</Text>
                  <View style={[styles.pill, statusTone(booking.status)]}>
                    <Text style={styles.pillText}>{statusLabel(booking.status)}</Text>
                  </View>
                </View>
                <Text style={styles.purpose}>{booking.purpose}</Text>
                <Text style={styles.meta}>{rooms}</Text>
                {booking.requestedAmenities.length > 0 && (
                  <Text style={styles.meta}>
                    Amenities: {booking.requestedAmenities.map((a) => a.name).join(', ')}
                  </Text>
                )}

                <Text style={styles.statusLabel}>Change status</Text>
                <View style={styles.statusRow}>
                  {STATUS_OPTIONS.map((opt) => {
                    const active = booking.status === opt.value;
                    const busy = actionId === booking.id;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        disabled={busy}
                        style={[styles.statusBtn, active && styles.statusBtnActive]}
                        onPress={() => changeStatus(booking, opt.value)}
                      >
                        <Text style={[styles.statusBtnText, active && styles.statusBtnTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
      </ScrollView>

      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: { ...typography.displayLg, color: colors.ink },
  sub: { ...typography.bodySm, color: colors.muted, marginTop: 4 },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  chipBtnText: { ...typography.captionSm, color: colors.ink },
  filters: { paddingHorizontal: spacing.base, gap: 8, paddingBottom: spacing.sm },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { ...typography.captionSm, color: colors.muted },
  filterTextActive: { color: colors.onPrimary, fontWeight: '600' },
  list: { padding: spacing.base, paddingBottom: spacing.section },
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  hint: { ...typography.bodySm, color: colors.muted, marginTop: 8, textAlign: 'center' },
  errorBox: {
    backgroundColor: '#FFF0F0',
    borderRadius: radii.md,
    padding: spacing.base,
  },
  errorText: { ...typography.bodySm, color: colors.error },
  retry: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  retryText: { ...typography.buttonSm, color: colors.onPrimary },
  empty: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: { ...typography.titleMd, color: colors.ink },
  card: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  time: { ...typography.caption, color: colors.ink, flex: 1 },
  pill: { borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 4 },
  pillAwaiting: { backgroundColor: colors.hairlineSoft },
  pillPreparing: { backgroundColor: '#E0F0FA' },
  pillReady: { backgroundColor: '#E8F8E9' },
  pillText: { ...typography.badge, color: colors.ink },
  purpose: { ...typography.titleMd, color: colors.ink, marginTop: 8 },
  meta: { ...typography.bodySm, color: colors.muted, marginTop: 4 },
  statusLabel: { ...typography.captionSm, color: colors.muted, marginTop: spacing.md, marginBottom: 6 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  statusBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusBtnText: { ...typography.captionSm, color: colors.body },
  statusBtnTextActive: { color: colors.onPrimary },
  toast: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    bottom: spacing.lg,
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  toastText: { ...typography.caption, color: colors.onPrimary, textAlign: 'center' },
});

export default ClerkQueueScreen;
