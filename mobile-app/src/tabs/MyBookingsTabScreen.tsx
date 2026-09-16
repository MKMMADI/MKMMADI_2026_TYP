import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking, BookingStatus } from '../types';
import { colors, spacing, typography, radii } from '../theme/tokens';
import api from '../api';

type TabFilter = 'UPCOMING' | 'PAST';

const statusMeta: Record<
  BookingStatus,
  { label: string; tone: string; tint: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  PENDING: { label: 'Pending Approval', tone: '#FFF3D6', tint: '#9A6B00', icon: 'hourglass-outline' },
  CONFIRMED: { label: 'Confirmed', tone: '#F8E7C7', tint: '#B76A00', icon: 'time-outline' },
  PREPARING: { label: 'Preparing', tone: '#D9EBFF', tint: '#0056A8', icon: 'sparkles-outline' },
  READY: { label: 'Ready', tone: '#DDF5E5', tint: '#0A7A3F', icon: 'checkmark-circle-outline' },
  COMPLETED: { label: 'Completed', tone: '#E8E9F7', tint: '#3E49A6', icon: 'checkbox-outline' },
  CANCELLED: { label: 'Cancelled', tone: '#F9E1E1', tint: '#A32323', icon: 'close-circle-outline' },
};

const fallbackMeta = {
  label: 'Unknown',
  tone: colors.surfaceStrong,
  tint: colors.muted,
  icon: 'help-circle-outline' as keyof typeof Ionicons.glyphMap,
};

interface MyBookingsTabScreenProps {
  onOpenBookingDetail: (booking: Booking) => void;
}

function mapBooking(item: any): Booking {
  return {
    id: String(item.id),
    employeeId: String(item.employee?.id ?? item.employeeId ?? 'unknown-user'),
    startAt: item.startAt,
    endAt: item.endAt,
    purpose: item.purpose ?? '',
    status: (item.status as BookingStatus) ?? 'PENDING',
    createdAt: item.createdAt ?? new Date().toISOString(),
    rooms:
      item.rooms?.map((r: any) => ({
        id: String(r.id ?? `${item.id}-room`),
        roomId: String(r.roomId ?? r.room?.id ?? 'unknown-room'),
        room: r.room
          ? {
              id: String(r.room.id),
              name: r.room.name ?? 'Room',
              description: r.room.description ?? '',
              capacity: r.room.capacity ?? 0,
              status: r.room.status ?? 'AVAILABLE',
              isActive: r.room.isActive ?? true,
              imageUrl: r.room.imageUrl ?? '',
              amenities: r.room.amenities ?? [],
            }
          : {
              id: 'unknown-room',
              name: 'Room',
              description: '',
              capacity: 0,
              status: 'AVAILABLE' as const,
              isActive: true,
              imageUrl: '',
              amenities: [],
            },
      })) ?? [],
    requestedAmenities:
      item.amenities?.map((a: any) => ({
        id: String(a.amenity?.id ?? a.id ?? `${item.id}-amenity`),
        name: a.amenity?.name ?? a.name ?? 'Amenity',
        icon: a.amenity?.icon ?? 'checkmark-circle-outline',
        description: a.amenity?.description ?? '',
      })) ?? [],
  };
}

export function MyBookingsTabScreen({ onOpenBookingDetail }: MyBookingsTabScreenProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tabFilter, setTabFilter] = useState<TabFilter>('UPCOMING');
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      // Backend listBookings already scopes EMPLOYEE to their own employeeId
      const response = await api.getBookings();
      if (Array.isArray(response)) {
        setBookings(response.map(mapBooking));
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.warn('Failed to load bookings', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadBookings();
    })();
    return () => {
      mounted = false;
    };
  }, [loadBookings]);

  const filteredBookings = bookings.filter((booking) => {
    const now = new Date();
    const bookingEnd = new Date(booking.endAt);
    const isUpcoming = bookingEnd >= now && booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED';
    if (tabFilter === 'UPCOMING') return isUpcoming;
    return !isUpcoming;
  });

  const formatDate = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const dateOpts: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    };

    const timeOpts: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
    };

    return `${startDate.toLocaleDateString([], dateOpts)} · ${startDate.toLocaleTimeString([], timeOpts)} – ${endDate.toLocaleTimeString([], timeOpts)}`;
  };

  const handleCancel = (booking: Booking) => {
    Alert.alert(
      'Cancel booking',
      'Are you sure you want to cancel this pending booking?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(booking.id);
            try {
              await api.cancelBooking(booking.id);
              setBookings((prev) =>
                prev.map((b) => (b.id === booking.id ? { ...b, status: 'CANCELLED' as BookingStatus } : b)),
              );
            } catch (err: any) {
              Alert.alert('Could not cancel', err?.message || 'Please try again.');
            } finally {
              setCancellingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />

      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, tabFilter === 'UPCOMING' && styles.tabActive]}
          onPress={() => setTabFilter('UPCOMING')}
        >
          <Text style={[styles.tabText, tabFilter === 'UPCOMING' && styles.tabTextActive]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tabFilter === 'PAST' && styles.tabActive]}
          onPress={() => setTabFilter('PAST')}
        >
          <Text style={[styles.tabText, tabFilter === 'PAST' && styles.tabTextActive]}>Past</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.stateText, { marginTop: spacing.sm }]}>Loading your bookings…</Text>
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No {tabFilter.toLowerCase()} bookings</Text>
            <Text style={styles.emptySubtitle}>
              {tabFilter === 'UPCOMING'
                ? 'Start by booking a room from the Home tab'
                : 'Your past bookings will appear here'}
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking) => {
            const roomName = booking.rooms[0]?.room?.name ?? 'Room';
            const meta = statusMeta[booking.status] ?? fallbackMeta;
            const canCancel = booking.status === 'PENDING';
            const isCancelling = cancellingId === booking.id;

            return (
              <View key={booking.id} style={styles.card}>
                <TouchableOpacity
                  onPress={() => onOpenBookingDetail(booking)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.roomName}>{roomName}</Text>
                      <Text style={styles.dateTime}>{formatDate(booking.startAt, booking.endAt)}</Text>
                      {!!booking.purpose && <Text style={styles.purpose}>{booking.purpose}</Text>}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: meta.tone }]}>
                      <Ionicons name={meta.icon} size={14} color={meta.tint} />
                      <Text style={[styles.statusText, { color: meta.tint }]}>{meta.label}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {canCancel && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancel(booking)}
                    disabled={isCancelling}
                    activeOpacity={0.8}
                  >
                    {isCancelling ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <>
                        <Ionicons name="close-circle-outline" size={16} color={colors.error} />
                        <Text style={styles.cancelText}>Cancel request</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.displayMd,
    color: colors.ink,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.bodySm,
    color: colors.muted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.white,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.section,
  },
  stateWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  stateText: {
    ...typography.bodyMd,
    color: colors.muted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    ...typography.titleMd,
    color: colors.ink,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  roomName: {
    ...typography.titleSm,
    color: colors.ink,
    marginBottom: 4,
  },
  dateTime: {
    ...typography.bodySm,
    color: colors.muted,
    marginBottom: 4,
  },
  purpose: {
    ...typography.bodySm,
    color: colors.ink,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    ...typography.captionSm,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#F0C4C0',
    backgroundColor: '#FDF6F5',
  },
  cancelText: {
    ...typography.buttonSm,
    color: colors.error,
  },
});
