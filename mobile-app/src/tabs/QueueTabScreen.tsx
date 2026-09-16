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
import { Booking, BookingStatus } from '../types';
import { colors, spacing, typography, radii } from '../theme/tokens';

const statusMeta: Record<BookingStatus, { label: string; tone: string; tint: string }> = {
  CONFIRMED: { label: 'Awaiting prep', tone: '#F8E7C7', tint: '#B76A00' },
  PREPARING: { label: 'Preparing', tone: '#D9EBFF', tint: '#0056A8' },
  READY: { label: 'Ready', tone: '#DDF5E5', tint: '#0A7A3F' },
  COMPLETED: { label: 'Completed', tone: '#E8E9F7', tint: '#3E49A6' },
  CANCELLED: { label: 'Cancelled', tone: '#F9E1E1', tint: '#A32323' },
};

export function QueueTabScreen() {
  const [queue, setQueue] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | 'ALL'>('ALL');

  const loadQueue = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getBookings();
      const nextQueue = Array.isArray(response) ? response : [];
      setQueue(nextQueue);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load the queue.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const filteredQueue = queue.filter((booking) => {
    return selectedStatus === 'ALL' || booking.status === selectedStatus;
  });

  const handleStatusUpdate = async (booking: Booking, newStatus: BookingStatus) => {
    try {
      await api.updateBookingStatus(booking.id, newStatus);
      setQueue((current) =>
        current.map((b) => (b.id === booking.id ? { ...b, status: newStatus } : b))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status.';
      alert(message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Prep Queue</Text>
      </View>

      <View style={styles.filterRow}>
        {(['ALL', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'] as const).map((status) => {
          const isActive = selectedStatus === status;
          const label = status === 'ALL' ? 'All' : statusMeta[status].label;
          return (
            <TouchableOpacity
              key={status}
              onPress={() => setSelectedStatus(status)}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
        <ScrollView contentContainerStyle={styles.listContent}>
          {filteredQueue.map((booking) => {
            const meta = statusMeta[booking.status];
            return (
              <View key={booking.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.roomName}>{booking.rooms[0]?.room?.name || 'Unknown Room'}</Text>
                  <View style={[styles.statusPill, { backgroundColor: meta.tone }]}>
                    <Text style={[styles.statusText, { color: meta.tint }]}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={styles.purpose}>{booking.purpose}</Text>
                <View style={styles.actionsRow}>
                  {booking.status !== 'CONFIRMED' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleStatusUpdate(booking, 'CONFIRMED')}
                    >
                      <Ionicons name="arrow-back" size={16} color={colors.primary} />
                      <Text style={styles.actionText}>Reset</Text>
                    </TouchableOpacity>
                  )}
                  {booking.status !== 'PREPARING' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleStatusUpdate(booking, 'PREPARING')}
                    >
                      <Ionicons name="construct" size={16} color={colors.primary} />
                      <Text style={styles.actionText}>Prep</Text>
                    </TouchableOpacity>
                  )}
                  {booking.status !== 'READY' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleStatusUpdate(booking, 'READY')}
                    >
                      <Ionicons name="checkmark" size={16} color={colors.success} />
                      <Text style={styles.actionText}>Ready</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  filterPillActive: {
    backgroundColor: '#F5F8FF',
    borderColor: '#D1E2FF',
  },
  filterText: {
    ...typography.captionSm,
    color: colors.body,
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: '700',
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
  listContent: {
    paddingHorizontal: spacing.base,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  roomName: {
    ...typography.titleSm,
    color: colors.ink,
  },
  purpose: {
    ...typography.bodySm,
    color: colors.muted,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  statusText: {
    ...typography.captionSm,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  actionText: {
    ...typography.captionSm,
    color: colors.primary,
  },
});
