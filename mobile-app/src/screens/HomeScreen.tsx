import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SearchBar } from '../components/SearchBar';
import { RoomCard } from '../components/RoomCard';
import { Room, SearchFilters } from '../types';
import { colors, spacing, typography, radii } from '../theme/tokens';
import api from '../api';

const initialFilters: SearchFilters = {
  startAt: null,
  endAt: null,
  capacity: 1,
  amenityIds: [],
};

interface HomeScreenProps {
  onOpenRoom?: (room: Room) => void;
  onOpenProfile?: () => void;
  onOpenHistory?: () => void;
}

export function HomeScreen({ onOpenRoom, onOpenProfile, onOpenHistory }: HomeScreenProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    setError(null);
    try {
      const r = await api.getRooms();
      setRooms(r);
    } catch (err: any) {
      console.warn('Failed to load rooms', err);
      setError(err?.message || 'Could not load rooms. Check API URL and that you are signed in.');
      setRooms([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await loadRooms();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [loadRooms]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  };

  const handleRoomPress = (room: Room) => {
    if (onOpenRoom) onOpenRoom(room);
  };

  const handleToggleFavorite = (room: Room) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === room.id ? { ...r, isFavorite: !r.isFavorite } : r))
    );
  };

  const visible = rooms.filter((r) => r.capacity >= (filters.capacity || 1));

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.greeting}>Where to meet?</Text>
          <Text style={styles.subGreeting}>Book a conference room in your building</Text>
        </View>
        <View style={styles.quickActions}>
          <Text onPress={onOpenProfile} style={styles.quickAction}>
            Profile
          </Text>
          <Text onPress={onOpenHistory} style={styles.quickAction}>
            History
          </Text>
        </View>
      </View>

      <SearchBar filters={filters} onPress={() => { /* filter sheet in next pass */ }} />

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.sectionTitle}>Available rooms</Text>

        {loading && <Text style={styles.hint}>Loading rooms…</Text>}

        {!loading && error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadRooms} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && visible.length === 0 && (
          <Text style={styles.hint}>No active rooms returned from the API.</Text>
        )}

        {!loading &&
          !error &&
          visible.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onPress={handleRoomPress}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  headerTextWrap: {
    flex: 1,
  },
  greeting: {
    ...typography.displayLg,
    color: colors.ink,
  },
  subGreeting: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  quickAction: {
    ...typography.captionSm,
    color: colors.ink,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.section,
  },
  sectionTitle: {
    ...typography.titleMd,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  hint: {
    ...typography.bodySm,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  errorBox: {
    backgroundColor: '#FFF0F0',
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
  },
  retryBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
  },
  retryText: {
    ...typography.buttonSm,
    color: colors.onPrimary,
  },
});
