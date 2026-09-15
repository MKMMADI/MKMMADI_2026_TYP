import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api';
import { Booking } from '../types';
import { colors, spacing, typography, radii } from '../theme/tokens';

interface SummaryCardProps {
  label: string;
  value: number;
  tone: string;
}

function SummaryCard({ label, value, tone }: SummaryCardProps) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: tone }]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

export function DashboardTabScreen() {
  const [queue, setQueue] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getBookings();
      const nextQueue = Array.isArray(response)
        ? response.filter((booking) =>
            ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'].includes(booking.status)
          )
        : [];
      setQueue(nextQueue);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load the preparation queue.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const summary = [
    { label: 'Awaiting prep', value: queue.filter((b) => b.status === 'CONFIRMED').length, tone: '#F8E7C7' },
    { label: 'Preparing', value: queue.filter((b) => b.status === 'PREPARING').length, tone: '#D9EBFF' },
    { label: 'Ready', value: queue.filter((b) => b.status === 'READY').length, tone: '#DDF5E5' },
    { label: 'Completed', value: queue.filter((b) => b.status === 'COMPLETED').length, tone: '#E8E9F7' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clerk Dashboard</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Today's prep queue</Text>
        <Text style={styles.heroSubtitle}>Quick overview of room preparation status</Text>
      </View>

      <View style={styles.summaryGrid}>
        {summary.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </View>

      {loading ? (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadQueue}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listArea}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <ScrollView contentContainerStyle={styles.listContent}>
            {queue.slice(0, 5).map((booking) => (
              <View key={booking.id} style={styles.card}>
                <Text style={styles.cardTitle}>{booking.rooms[0]?.room?.name || 'Unknown Room'}</Text>
                <Text style={styles.cardSubtitle}>{booking.purpose}</Text>
                <View style={[styles.statusPill, { backgroundColor: '#F8E7C7' }]}>
                  <Text style={styles.statusText}>{booking.status}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
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
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.displayMd,
    color: colors.ink,
  },
  heroCard: {
    marginHorizontal: spacing.base,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radii.xl,
    backgroundColor: '#F6F8FA',
    borderWidth: 1,
    borderColor: '#EEF1F4',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...typography.titleMd,
    color: colors.ink,
  },
  heroSubtitle: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: 6,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    width: '47%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    minHeight: 64,
    justifyContent: 'center',
  },
  summaryLabel: {
    ...typography.captionSm,
    color: colors.body,
  },
  summaryValue: {
    ...typography.displaySm,
    color: colors.ink,
    marginTop: 4,
  },
  stateWrap: {
    flex: 1,
    paddingHorizontal: spacing.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateText: {
    ...typography.bodyMd,
    color: colors.muted,
  },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  retryButtonText: {
    ...typography.buttonSm,
    color: colors.onPrimary,
  },
  listArea: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    ...typography.titleMd,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.section,
  },
  card: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#EEF1F4',
  },
  cardTitle: {
    ...typography.titleSm,
    color: colors.ink,
  },
  cardSubtitle: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: 4,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    marginTop: spacing.sm,
  },
  statusText: {
    ...typography.captionSm,
    color: colors.body,
    fontWeight: '700',
  },
});