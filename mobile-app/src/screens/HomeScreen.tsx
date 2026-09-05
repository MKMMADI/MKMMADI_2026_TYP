import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { SearchBar } from '../components/SearchBar';
import { RoomCard } from '../components/RoomCard';
import { Room, SearchFilters } from '../types';
import { colors, spacing, typography } from '../theme/tokens';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadRooms() {
      setLoading(true);
      try {
        const r = await api.getRooms();
        if (mounted && Array.isArray(r)) setRooms(r as Room[]);
      } catch (err) {
        console.warn('Failed to load rooms', err);
      } finally {
        setLoading(false);
      }
    }
    loadRooms();
    return () => { mounted = false; };
  }, []);

  const handleSearchPress = () => {
    console.log('Open search filters');
  };

  const handleRoomPress = (room: Room) => {
    if (onOpenRoom) onOpenRoom(room);
  };

  const handleToggleFavorite = (room: Room) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === room.id ? { ...r, isFavorite: !r.isFavorite } : r
      )
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.greeting}>Where to meet?</Text>
          <Text style={styles.subGreeting}>Book a conference room in your building</Text>
        </View>
        <View style={styles.quickActions}>
          <Text onPress={onOpenProfile} style={styles.quickAction}>Profile</Text>
          <Text onPress={onOpenHistory} style={styles.quickAction}>History</Text>
        </View>
      </View>

      <SearchBar filters={filters} onPress={handleSearchPress} />

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Available rooms</Text>
        {loading ? (
          <Text style={{ color: colors.muted }}>Loading...</Text>
        ) : (
          rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onPress={handleRoomPress}
              onToggleFavorite={handleToggleFavorite}
            />
          ))
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
});
