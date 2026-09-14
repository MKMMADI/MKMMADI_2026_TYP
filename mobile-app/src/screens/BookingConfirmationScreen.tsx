import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Button } from '../components/Button';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface BookingConfirmationScreenProps {
  booking: any;
  onBackHome: () => void;
}

export function BookingConfirmationScreen({ booking, onBackHome }: BookingConfirmationScreenProps) {
  const roomName = booking?.rooms?.[0]?.room?.name || 'Conference room';
  const when = booking?.startAt && booking?.endAt
    ? `${new Date(booking.startAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} – ${new Date(booking.endAt).toLocaleString([], { hour: 'numeric', minute: '2-digit' })}`
    : 'Booked successfully';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Confirmed</Text>
        </View>

        <Text style={styles.title}>Your booking is confirmed</Text>
        <Text style={styles.subtitle}>{roomName}</Text>
        <Text style={styles.meta}>{when}</Text>

        <Text style={styles.note}>
          The room request has been sent. A manager can approve or update the booking status from their dashboard.
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
