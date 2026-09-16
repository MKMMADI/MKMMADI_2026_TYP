import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api';
import { Room, RoomStatus } from '../types';
import { colors, spacing, typography, radii } from '../theme/tokens';

const statusMeta: Record<RoomStatus, { label: string; tone: string; tint: string }> = {
  AVAILABLE: { label: 'Available', tone: '#DDF5E5', tint: '#0A7A3F' },
  OUT_OF_SERVICE: { label: 'Out of Service', tone: '#F9E1E1', tint: '#A32323' },
  MAINTENANCE: { label: 'Maintenance', tone: '#F8E7C7', tint: '#B76A00' },
};

export function RoomsTabScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getRooms();
      setRooms(Array.isArray(response) ? response : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load rooms.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleToggleStatus = async (room: Room) => {
    const newStatus = room.status === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE';
    try {
      await api.updateRoomStatus(room.id, newStatus);
      setRooms((current) =>
        current.map((r) => (r.id === room.id ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update room status.';
      alert(message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Room Inventory</Text>
      </View>

      {loading ? (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRooms}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {rooms.map((room) => {
            const meta = statusMeta[room.status];
            return (
              <View key={room.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <Text style={styles.roomDetails}>
                      Capacity: {room.capacity} | {room.floor || 'N/A'}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: meta.tone }]}>
                    <Text style={[styles.statusText, { color: meta.tint }]}>{meta.label}</Text>
                  </View>
                </View>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Active</Text>
                  <Switch
                    value={room.isActive}
                    onValueChange={() => handleToggleStatus(room)}
                    trackColor={{ false: '#E8E8E8', true: '#3E49A6' }}
                  />
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
  roomDetails: {
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    ...typography.bodySm,
    color: colors.body,
  },
});
