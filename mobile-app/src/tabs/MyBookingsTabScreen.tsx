import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
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
  CONFIRMED: { label: 'Confirmed', tone: '#F8E7C7', tint: '#B76A00', icon: 'time-outline' },
  PREPARING: { label: 'Preparing', tone: '#D9EBFF', tint: '#0056A8', icon: 'sparkles-outline' },
  READY: { label: 'Ready', tone: '#DDF5E5', tint: '#0A7A3F', icon: 'checkmark-circle-outline' },
  COMPLETED: { label: 'Completed', tone: '#E8E9F7', tint: '#3E49A6', icon: 'checkbox-outline' },
  CANCELLED: { label: 'Cancelled', tone: '#F9E1E1', tint: '#A32323', icon: 'close-circle-outline' },
};

interface MyBookingsTabScreenProps {
  onOpenBookingDetail: (booking: Booking) => void;
}

export function MyBookingsTabScreen({ onOpenBookingDetail }: MyBookingsTabScreenProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tabFilter, setTabFilter] = useState<TabFilter>('UPCOMING');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadBookings() {
      setLoading(true);
      try {
        const response = await api.getBookings();
        if (mounted && Array.isArray(response)) {
          const fetchedBookings = response.map((item: any) => ({
            id: String(item.id),
            employeeId: String(item.employee?.id ?? item.employeeId ?? 'unknown-user'),
            startAt: item.startAt,
            endAt: item.endAt,
            purpose: item.purpose,
            status: item.status,
            createdAt: item.createdAt ?? new Date().toISOString(),
            rooms: item.rooms?.map((r: any) => ({
              id: String(r.id ?? `${item.id}-room`),
              roomId: String(r.roomId ?? r.room?.id ?? 'unknown-room'),
              room: r.room ?? {
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
            requestedAmenities: item.amenities?.map((a: any) => ({
              id: String(a.amenity?.id ?? a.id ?? `${item.id}-amenity`),
              name: a.amenity?.name ?? a.name ?? 'Amenity',
              icon: a.amenity?.icon ?? 'checkmark-circle-outline',
              description: a.amenity?.description ?? '',
            })) ?? [],
          }));
          setBookings(fetchedBookings);
        }
      } catch (err) {
        console.warn('Failed to load bookings', err);
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
    return () => { mounted = false; };
  }, []);

  const filteredBookings = bookings.filter((booking) => {
    const now = new Date();
    const bookingEnd = new Date(booking.endAt);
    const isUpcoming = bookingEnd >= now;
    return tabFilter === 'UPCOMING' ? isUpcoming : !isUpcoming;
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
          <Text style={[styles.tabText, tabFilter === 'UPCOMING' && styles.tabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tabFilter === 'PAST' && styles.tabActive]}
          onPress={() => setTabFilter('PAST')}
        >
          <Text style={[styles.tabText, tabFilter === 'PAST' && styles.tabTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.stateWrap}>
            <Text style={styles.stateText}>Loading your bookings…</Text>
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
            const meta = statusMeta[booking.status];
            
            return (
              <TouchableOpacity
                key={booking.id}
                style={styles.card}
                onPress={() => onOpenBookingDetail(booking)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.roomName}>{roomName}</Text>
                    <Text style={styles.dateTime}>{formatDate(booking.startAt, booking.endAt)}</Text>
                    <Text style={styles.purpose}>{booking.purpose}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: meta.tone }]}>
                    <Ionicons name={meta.icon} size={14} color={meta.tint} />
                    <Text style={[styles.statusText, { color: meta.tint }]}>
                      {meta.label}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
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
    backgroundColor: '#3E49A6',
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
});
