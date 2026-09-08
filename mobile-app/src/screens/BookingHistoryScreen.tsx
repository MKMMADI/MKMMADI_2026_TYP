import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking } from '../types';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface BookingHistoryScreenProps {
  bookings: Booking[];
  onBack: () => void;
}

function formatBookingDate(dateIso: string) {
  const date = new Date(dateIso);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function BookingHistoryScreen({ bookings, onBack }: BookingHistoryScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking history</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>Your recent room requests will appear here.</Text>
          </View>
        ) : (
          bookings.map((booking) => (
            <View key={booking.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>{booking.purpose}</Text>
                <View style={[styles.statusPill, booking.status === 'CONFIRMED' ? styles.confirmed : styles.defaultStatus]}>
                  <Text style={[styles.statusText, booking.status !== 'CONFIRMED' && styles.statusTextMuted]}>{booking.status}</Text>
                </View>
              </View>

              <Text style={styles.meta}>{booking.rooms.map((room) => room.room?.name || room.roomId).join(', ')}</Text>
              <Text style={styles.meta}>{formatBookingDate(booking.startAt)} – {formatBookingDate(booking.endAt)}</Text>
              <Text style={styles.meta}>Amenities: {booking.requestedAmenities.length ? booking.requestedAmenities.map((a) => a.name).join(', ') : 'None'}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.titleMd,
    color: colors.ink,
    marginLeft: spacing.sm,
  },
  content: { padding: spacing.base, paddingBottom: spacing.section },
  card: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typography.titleMd,
    color: colors.ink,
    flex: 1,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  confirmed: { backgroundColor: '#E8F7ED' },
  defaultStatus: { backgroundColor: '#EFEFEF' },
  statusText: {
    ...typography.captionSm,
    color: colors.success,
  },
  statusTextMuted: {
    color: colors.body,
  },
  meta: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: 6,
  },
  emptyState: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  emptyTitle: {
    ...typography.titleMd,
    color: colors.ink,
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default BookingHistoryScreen;
