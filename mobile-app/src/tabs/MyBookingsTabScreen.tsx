import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeDateTimePicker } from '../components/NativeDateTimePicker';
import { Booking, BookingStatus } from '../types';
import { colors, spacing, typography, radii } from '../theme/tokens';
import { useAppTheme } from '../theme/AppTheme';
import type { ColorPalette } from '../theme/tokens';
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
  RESCHEDULE_REQUIRED: { label: 'Schedule changed', tone: '#FFF0D9', tint: '#9A5B00', icon: 'calendar-outline' },
  COMPLETED: { label: 'Completed', tone: '#E8E9F7', tint: '#3E49A6', icon: 'checkbox-outline' },
  CANCELLED: { label: 'Cancelled', tone: '#F9E1E1', tint: '#A32323', icon: 'close-circle-outline' },
};

const fallbackMeta = {
  label: 'Unknown',
  tone: colors.surfaceStrong,
  tint: colors.muted,
  icon: 'help-circle-outline' as keyof typeof Ionicons.glyphMap,
};


const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function canCancelBooking(booking: Booking): boolean {
  if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') return false;
  if (booking.status === 'PENDING') return true;
  // Approved pipeline: only ≥6 hours before start
  return new Date(booking.startAt).getTime() - Date.now() >= SIX_HOURS_MS;
}

interface MyBookingsTabScreenProps {
  onOpenBookingDetail: (booking: Booking) => void;
  showBackToProfile?: boolean;
  onBackToProfile?: () => void;
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
    suggestedStartAt: item.suggestedStartAt ?? null,
    suggestedEndAt: item.suggestedEndAt ?? null,
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
              amenities: (r.room.amenities || []).map((a: any) =>
                a?.amenity
                  ? { id: String(a.amenity.id), name: a.amenity.name, icon: a.amenity.icon ?? 'checkmark-circle-outline', description: a.amenity.description }
                  : { id: String(a.id), name: a.name, icon: a.icon ?? 'checkmark-circle-outline', description: a.description }
              ),
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

export function MyBookingsTabScreen({
  onOpenBookingDetail,
  showBackToProfile = false,
  onBackToProfile,
}: MyBookingsTabScreenProps) {
  const { colors, mode } = useAppTheme();
  const styles = createStyles(colors);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tabFilter, setTabFilter] = useState<TabFilter>('UPCOMING');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [savingRescheduleId, setSavingRescheduleId] = useState<string | null>(null);

  const loadBookings = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
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
      if (showLoading) setLoading(false);
    }
  }, []);

  const refreshBookings = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadBookings(false);
    } finally {
      setRefreshing(false);
    }
  }, [loadBookings]);

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
      'Are you sure you want to cancel this booking?',
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

  const localDate = (value: string) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const localTime = (value: string) => {
    const date = new Date(value);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const applyReschedule = async (
    booking: Booking,
    payload: { acceptSuggestion: true } | { startAt: string },
  ) => {
    setSavingRescheduleId(booking.id);
    try {
      const updated = await api.rescheduleBooking(booking.id, payload);
      const nextBooking = mapBooking(updated);
      setBookings((previous) => previous.map((item) => item.id === booking.id ? nextBooking : item));
      setRescheduleId(null);
    } catch (err: any) {
      Alert.alert('Could not reschedule', err?.message || 'Please choose another time and try again.');
    } finally {
      setSavingRescheduleId(null);
    }
  };

  const handleChooseTime = (booking: Booking) => {
    const startAt = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
    if (!rescheduleDate || !rescheduleTime || Number.isNaN(startAt.getTime()) || startAt <= new Date()) {
      Alert.alert('Choose a future time', 'Enter a valid date and start time in the future.');
      return;
    }
    void applyReschedule(booking, { startAt: startAt.toISOString() });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.canvas} />

      <View style={styles.header}>
        {showBackToProfile && onBackToProfile ? (
          <TouchableOpacity
            style={styles.backRow}
            onPress={onBackToProfile}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back to profile"
          >
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
            <Text style={styles.backLabel}>Profile</Text>
          </TouchableOpacity>
        ) : null}
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

      <ScrollView
        testID="bookings-scroll-view"
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refreshBookings()}
            tintColor={colors.primary}
          />
        }
      >
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
            const canCancel = canCancelBooking(booking);
            const isCancelling = cancellingId === booking.id;
            const isRescheduling = savingRescheduleId === booking.id;

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

                {booking.status === 'RESCHEDULE_REQUIRED' && (
                  <View style={styles.reschedulePanel}>
                    <Text style={styles.rescheduleTitle}>A higher-priority booking changed this time.</Text>
                    {booking.suggestedStartAt && booking.suggestedEndAt && (
                      <Text style={styles.rescheduleSuggestion}>
                        Suggested: {formatDate(booking.suggestedStartAt, booking.suggestedEndAt)}
                      </Text>
                    )}
                    <View style={styles.rescheduleActions}>
                      <TouchableOpacity
                        style={styles.acceptSuggestionButton}
                        accessibilityRole="button"
                        accessibilityLabel={`Accept suggested time for ${booking.purpose}`}
                        disabled={isRescheduling || !booking.suggestedStartAt}
                        onPress={() => void applyReschedule(booking, { acceptSuggestion: true })}
                      >
                        {isRescheduling ? <ActivityIndicator size="small" color={colors.white} /> : (
                          <Text style={styles.acceptSuggestionText}>Accept suggested time</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.chooseTimeButton}
                        accessibilityRole="button"
                        onPress={() => {
                          setRescheduleId(booking.id);
                          if (booking.suggestedStartAt) {
                            setRescheduleDate(localDate(booking.suggestedStartAt));
                            setRescheduleTime(localTime(booking.suggestedStartAt));
                          }
                        }}
                      >
                        <Text style={styles.chooseTimeText}>Choose another time</Text>
                      </TouchableOpacity>
                    </View>
                    {rescheduleId === booking.id && (
                      <View style={styles.rescheduleForm}>
                        <NativeDateTimePicker
                          label="Replacement date"
                          value={rescheduleDate
                            ? new Date(`${rescheduleDate}T00:00:00`)
                            : new Date()}
                          mode="date"
                          minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
                          onChange={(date) => setRescheduleDate(localDate(date.toISOString()))}
                        />
                        <NativeDateTimePicker
                          label="Replacement start time"
                          value={(() => {
                            const date = new Date();
                            const [hour = '9', minute = '00'] = rescheduleTime.split(':');
                            date.setHours(Number(hour), Number(minute), 0, 0);
                            return date;
                          })()}
                          mode="time"
                          onChange={(date) => setRescheduleTime(localTime(date.toISOString()))}
                        />
                        <TouchableOpacity
                          style={styles.saveTimeButton}
                          accessibilityRole="button"
                          onPress={() => handleChooseTime(booking)}
                          disabled={isRescheduling}
                        >
                          <Text style={styles.acceptSuggestionText}>Save new time</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

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

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  backLabel: {
    ...typography.bodyMd,
    color: colors.ink,
    fontWeight: '600',
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
    backgroundColor: colors.surfaceCard,
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
  reschedulePanel: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: '#FFF8EC',
  },
  rescheduleTitle: {
    ...typography.bodySm,
    color: '#7A4A00',
    fontWeight: '700',
  },
  rescheduleSuggestion: {
    ...typography.bodySm,
    color: colors.ink,
    marginTop: spacing.xs,
  },
  rescheduleActions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  acceptSuggestionButton: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
  },
  acceptSuggestionText: {
    ...typography.buttonSm,
    color: colors.white,
  },
  chooseTimeButton: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  chooseTimeText: {
    ...typography.buttonSm,
    color: colors.primary,
  },
  rescheduleForm: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  saveTimeButton: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.ink,
  },
});
};
