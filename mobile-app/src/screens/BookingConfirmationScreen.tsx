import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface BookingConfirmationScreenProps {
  booking: any;
  onBackHome: () => void;
}

export function BookingConfirmationScreen({ booking, onBackHome }: BookingConfirmationScreenProps) {
  const rooms = booking?.rooms?.map((item: any) => item.room).filter(Boolean) ?? [];
  const statusLabel = booking?.status === 'PENDING' ? 'Pending approval' : booking?.status || 'Pending approval';
  const when = booking?.startAt && booking?.endAt
    ? `${new Date(booking.startAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} – ${new Date(booking.endAt).toLocaleString([], { hour: 'numeric', minute: '2-digit' })}`
    : 'Booking time unavailable';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{statusLabel}</Text>
        </View>

        <Text style={styles.title}>Your booking request was sent</Text>
        {rooms.length > 0 ? (
          <View style={styles.roomList}>
            {rooms.map((room: any) => (
              <Text key={room.id} style={styles.subtitle}>{room.name}</Text>
            ))}
          </View>
        ) : (
          <Text style={styles.subtitle}>Room details are not available</Text>
        )}
        <Text style={styles.meta}>{when}</Text>

        <Text style={styles.note}>
          {rooms.length > 0
            ? 'A manager can approve or update the booking status from their dashboard.'
            : 'Your request was submitted. You can view its details from My Bookings.'}
        </Text>

        <Button title="Back to rooms" onPress={onBackHome} style={styles.button} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#E8F7ED',
    borderRadius: radii.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: spacing.md,
  },
  badgeText: {
    ...typography.caption,
    color: colors.success,
  },
  title: {
    ...typography.displayMd,
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.titleMd,
    color: colors.body,
    marginTop: spacing.sm,
  },
  roomList: { alignItems: 'center', marginTop: spacing.sm, gap: 4 },
  meta: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  note: {
    ...typography.bodySm,
    color: colors.body,
    marginTop: spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: { marginTop: spacing.lg, width: '100%' },
});

export default BookingConfirmationScreen;
