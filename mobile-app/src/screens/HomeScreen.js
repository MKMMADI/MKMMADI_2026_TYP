import React, { useState } from 'react';
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
import { ROOMS } from '../constants/mockData';
import { colors, spacing, typography } from '../theme/tokens';

const initialFilters = {
  startAt: null,
  endAt: null,
  capacity: 1,
  amenityIds: [],
};

export function HomeScreen() {
  const [filters] = useState(initialFilters);
  const [rooms, setRooms] = useState(ROOMS);

  const handleSearchPress = () => {
    // TODO: open filter sheet / navigate to search filters
    console.log('Open search filters');
  };

  const handleRoomPress = (room) => {
    // TODO: navigate to room detail / booking
    console.log('Open room', room.id);
  };

  const handleToggleFavorite = (room) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === room.id ? { ...r, isFavorite: !r.isFavorite } : r
      )
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      <View style={styles.header}>
        <Text style={styles.greeting}>Where to meet?</Text>
        <Text style={styles.subGreeting}>Book a conference room in your building</Text>
      </View>

      <SearchBar filters={filters} onPress={handleSearchPress} />

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Available rooms</Text>
        {rooms.map((room) => (
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
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
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
