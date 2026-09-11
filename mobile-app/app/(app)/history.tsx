import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { BookingHistoryScreen } from '../../src/screens/BookingHistoryScreen';
import api from '../../src/api';
import type { Booking } from '../../src/types';
import { colors, typography, spacing } from '../../src/theme/tokens';

export default function HistoryRoute() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.getBookings();
      setBookings(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load bookings');
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.hint}>Loading your bookings…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.link} onPress={load}>
          Retry
        </Text>
        <Text style={styles.link} onPress={() => router.back()}>
          Back
        </Text>
      </View>
    );
  }

  return <BookingHistoryScreen bookings={bookings} onBack={() => router.back()} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.canvas,
    padding: spacing.lg,
  },
  hint: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  error: {
    ...typography.bodySm,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  link: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.sm,
  },
});
